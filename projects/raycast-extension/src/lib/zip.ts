import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expandTilde } from "./skills";

const execFileAsync = promisify(execFile);

/** ditto で zip 化する。--keepParent なので展開すると {dirName}/SKILL.md の形に戻る */
async function ditto(dirPath: string, zipPath: string): Promise<void> {
  await execFileAsync("/usr/bin/ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", dirPath, zipPath]);
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/** 既存ファイルを上書きしないよう連番を振る: foo.zip → foo-2.zip → foo-3.zip */
async function uniquePath(dir: string, dirName: string): Promise<string> {
  let candidate = join(dir, `${dirName}.zip`);
  for (let i = 2; await exists(candidate); i++) {
    candidate = join(dir, `${dirName}-${i}.zip`);
  }
  return candidate;
}

/** 保存先フォルダに zip を書き出し、そのパスを返す */
export async function exportSkillZip(dirPath: string, dirName: string): Promise<string> {
  const { exportDirectory } = getPreferenceValues<Preferences.SearchSkills>();
  const target = expandTilde(exportDirectory?.trim() || join(homedir(), "Downloads"));
  await fs.mkdir(target, { recursive: true });

  const zipPath = await uniquePath(target, dirName);
  await ditto(dirPath, zipPath);
  return zipPath;
}
