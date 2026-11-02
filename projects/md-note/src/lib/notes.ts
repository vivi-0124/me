import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type Note = { path: string; name: string; mtime: Date };

const LAST_PATH_KEY = "lastPath";

export function notesDirectory(): string {
  const { notesDirectory } = getPreferenceValues<Preferences>();
  return notesDirectory.replace(/^~(?=$|\/)/, homedir());
}

/** 拡張子 .md を除いたファイル名 */
export function noteName(path: string): string {
  return basename(path).replace(/\.md$/i, "");
}

/** ファイル名に使えない文字を除く。空なら undefined */
export function sanitizeName(name: string): string | undefined {
  const cleaned = name
    .replace(/[/\\:\0]/g, "-")
    .replace(/^\.+/, "")
    .trim();
  return cleaned === "" ? undefined : cleaned;
}

export function pathForName(name: string): string {
  return join(notesDirectory(), `${name}.md`);
}

/** 新しいノートの名前。日時を使う（例: 2026-11-02 14.05.09） */
export function newNoteName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}.${p(date.getMinutes())}.${p(date.getSeconds())}`;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readNote(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

export async function writeNote(path: string, body: string): Promise<void> {
  await mkdir(notesDirectory(), { recursive: true });
  await writeFile(path, body, "utf8");
}

export async function renameNote(from: string, to: string): Promise<void> {
  if (await exists(to)) throw new Error(`「${noteName(to)}」は既にあります`);
  await rename(from, to);
}

export async function deleteNote(path: string): Promise<void> {
  await unlink(path);
}

/** 保存先フォルダ直下の .md を、更新日時の新しい順に返す */
export async function listNotes(): Promise<Note[]> {
  const dir = notesDirectory();
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const notes = await Promise.all(
    entries
      .filter((e) => e.toLowerCase().endsWith(".md") && !e.startsWith("."))
      .map(async (e) => {
        const path = join(dir, e);
        const s = await stat(path);
        return s.isFile() ? { path, name: noteName(path), mtime: s.mtime } : undefined;
      }),
  );
  return notes.filter((n): n is Note => n !== undefined).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

export async function getLastPath(): Promise<string | undefined> {
  const path = await LocalStorage.getItem<string>(LAST_PATH_KEY);
  // 保存先フォルダを変えた後や、ファイルを消した後は使わない
  if (!path || !path.startsWith(notesDirectory()) || !(await exists(path))) return undefined;
  return path;
}

export async function setLastPath(path: string): Promise<void> {
  await LocalStorage.setItem(LAST_PATH_KEY, path);
}
