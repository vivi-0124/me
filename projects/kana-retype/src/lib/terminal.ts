import { LocalStorage } from "@raycast/api";

// 元の文字の消し方
// - overwrite: 何もしない。打ったキーで選択範囲が置き換わる（普通のテキスト欄）
// - backspace: カーソルの直前を文字数ぶん BackSpace で消す（ターミナル）
// - collapseThenBackspace: → で選択を解除して末尾へ移ってから、文字数ぶん消す（エディタとターミナルが同居するアプリ）
export type DeleteMode = "overwrite" | "backspace" | "collapseThenBackspace";

// エディタと統合ターミナルを見分けられないアプリ（VS Code と、その派生）。
// エディタでは → で選択が末尾に畳まれ、ターミナルではカーソルが末尾にあるので → は何もしない
const MIXED_BUNDLE_IDS = [
  "com.microsoft.VSCode",
  "com.microsoft.VSCodeInsiders",
  "com.vscodium",
  "com.todesktop.230313mxl3q", // Cursor
  "com.exafunction.windsurf",
];

// 一度も保存していないときに対象にするアプリ
export const DEFAULT_TERMINAL_BUNDLE_IDS = [
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "com.mitchellh.ghostty",
  "com.github.wez.wezterm",
  "org.alacritty",
  "net.kovidgoyal.kitty",
  "dev.warp.Warp-Stable",
  "co.zeit.hyper",
  "org.tabby",
  "com.stablyai.orca",
  "com.microsoft.VSCode",
];

const STORAGE_KEY = "terminalBundleIds";

/** 元の文字を消してから打ち直すアプリの bundle ID。未保存なら既定の一覧 */
export async function loadTerminalBundleIds(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (raw === undefined) return DEFAULT_TERMINAL_BUNDLE_IDS;
  try {
    const ids: unknown = JSON.parse(raw);
    if (Array.isArray(ids)) return ids.filter((id): id is string => typeof id === "string");
  } catch {
    // 壊れていたら既定に戻す
  }
  return DEFAULT_TERMINAL_BUNDLE_IDS;
}

export async function saveTerminalBundleIds(ids: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function deleteModeFor(bundleId: string | undefined, terminalBundleIds: string[]): DeleteMode {
  if (!bundleId || !terminalBundleIds.includes(bundleId)) return "overwrite";
  return MIXED_BUNDLE_IDS.includes(bundleId) ? "collapseThenBackspace" : "backspace";
}
