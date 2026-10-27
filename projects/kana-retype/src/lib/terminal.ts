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

/** カンマ・空白・改行区切りの bundle ID を配列にする */
export function parseBundleIds(value: string | undefined): string[] {
  return (value ?? "").split(/[\s,]+/).filter((id) => id !== "");
}

export function isTerminalApp(bundleId: string | undefined, extraBundleIds: string[] = []): boolean {
  if (!bundleId) return false;
  return [...TERMINAL_BUNDLE_IDS, ...extraBundleIds].includes(bundleId);
}
