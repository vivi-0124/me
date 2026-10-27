// 元の文字の消し方
// - overwrite: 何もしない。打ったキーで選択範囲が置き換わる（普通のテキスト欄）
// - backspace: カーソルの直前を文字数ぶん BackSpace で消す（ターミナル）
// - collapseThenBackspace: → で選択を解除して末尾へ移ってから、文字数ぶん消す（エディタとターミナルが同居するアプリ）
export type DeleteMode = "overwrite" | "backspace" | "collapseThenBackspace";

// 選択範囲を打って上書きできないアプリ（ターミナルと、ターミナルを内蔵したアプリ）
const TERMINAL_BUNDLE_IDS = [
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
];

// エディタと統合ターミナルを見分けられないアプリ。
// エディタでは → で選択が末尾に畳まれ、ターミナルではカーソルが末尾にあるので → は何もしない
const MIXED_BUNDLE_IDS = ["com.microsoft.VSCode"];

/** カンマ・空白・改行区切りの bundle ID を配列にする */
export function parseBundleIds(value: string | undefined): string[] {
  return (value ?? "").split(/[\s,]+/).filter((id) => id !== "");
}

export function deleteModeFor(bundleId: string | undefined, extraTerminalBundleIds: string[] = []): DeleteMode {
  if (!bundleId) return "overwrite";
  if (MIXED_BUNDLE_IDS.includes(bundleId)) return "collapseThenBackspace";
  if ([...TERMINAL_BUNDLE_IDS, ...extraTerminalBundleIds].includes(bundleId)) return "backspace";
  return "overwrite";
}
