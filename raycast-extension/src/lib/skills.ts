import { getPreferenceValues } from "@raycast/api";
import matter from "gray-matter";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SkillScope = "user";

export type Skill = {
  /** 一意キー。ディレクトリのフルパスをそのまま使う */
  id: string;
  scope: SkillScope;
  /** Claude Code で `/{これ}` として呼ぶ名前 */
  dirName: string;
  /** ~/.claude/skills/foo （SKILL.md は含めない） */
  dirPath: string;
  /** ~/.claude/skills/foo/SKILL.md */
  filePath: string;
  /** frontmatter を表示用に文字列化したもの。name も含めて全部持つ */
  frontmatter: Record<string, string>;
  description?: string;
  /** frontmatter を除いた本文 */
  body: string;
  /** ファイル全文（frontmatter 込み） */
  raw: string;
  /** frontmatter のパースに失敗したか */
  parseError?: string;
};

export function expandTilde(path: string): string {
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

/** skill を探すディレクトリ。preference > CLAUDE_CONFIG_DIR > ~/.claude */
export function skillsRoot(): string {
  const { claudeHome } = getPreferenceValues<Preferences.SearchSkills>();
  const home = claudeHome?.trim() || process.env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), ".claude");
  return join(resolve(expandTilde(home)), "skills");
}

/** frontmatter の値を Detail.Metadata に出せる文字列にする */
function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(stringifyValue).join(", ");
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function readSkill(root: string, dirName: string): Promise<Skill | undefined> {
  const dirPath = join(root, dirName);

  // symlink で置かれた skill も拾いたいので lstat ではなく stat で判定する
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) return undefined;
  } catch {
    return undefined;
  }

  const filePath = join(dirPath, "SKILL.md");
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return undefined; // SKILL.md が無いディレクトリは skill ではない
  }

  const base: Skill = { id: dirPath, scope: "user", dirName, dirPath, filePath, frontmatter: {}, body: raw, raw };

  try {
    const parsed = matter(raw);
    const frontmatter: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.data ?? {})) {
      frontmatter[key] = stringifyValue(value);
    }
    return { ...base, frontmatter, description: frontmatter.description, body: parsed.content.trim() };
  } catch (error) {
    // frontmatter が壊れていても一覧からは落とさない
    return { ...base, parseError: error instanceof Error ? error.message : String(error) };
  }
}

export async function loadSkills(): Promise<Skill[]> {
  const root = skillsRoot();

  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return []; // skills ディレクトリがまだ無い
  }

  const skills = await Promise.all(
    entries.filter((name) => !name.startsWith(".")).map((name) => readSkill(root, name)),
  );

  return skills
    .filter((skill): skill is Skill => skill !== undefined)
    .sort((a, b) => a.dirName.localeCompare(b.dirName));
}
