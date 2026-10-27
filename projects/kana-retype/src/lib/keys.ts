import type { DeleteMode } from "./terminal";

// JIS キーボードの「かな」キー
const KANA_KEY_CODE = 104;
const RETURN_KEY_CODE = 36;
const DELETE_KEY_CODE = 51;
const RIGHT_ARROW_KEY_CODE = 124;

// キーボードから直接打てる文字（ASCII の印字可能文字 + タブ・改行）
const TYPABLE = /^[\x20-\x7E\t\n]$/;

/** 改行コードを \n にそろえる */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** キーで打てない文字（かな・漢字・全角記号など）を重複なしで返す */
export function findUntypableChars(text: string): string[] {
  const chars = Array.from(normalizeNewlines(text)).filter((char) => !TYPABLE.test(char));
  return [...new Set(chars)];
}

function quoteAppleScript(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * かなキーを押してから、text と同じキーを順に送る AppleScript を作る。
 * 改行は Return キー（かなモードでは確定）、タブは Tab キーとして送る。
 *
 * deleteMode が overwrite 以外のときは、先に BackSpace を文字数ぶん送って元の文字を消す。
 * ターミナルでは選択が表示上のものでしかなく、打っても選択範囲が置き換わらないため。
 */
export function buildRetypeScript(text: string, deleteMode: DeleteMode = "overwrite"): string {
  const normalized = normalizeNewlines(text);
  const lines: string[] = [];

  if (deleteMode === "collapseThenBackspace") lines.push(`key code ${RIGHT_ARROW_KEY_CODE}`);
  if (deleteMode !== "overwrite") {
    lines.push(`repeat ${Array.from(normalized).length} times`, `  key code ${DELETE_KEY_CODE}`, "end repeat");
  }
  lines.push(`key code ${KANA_KEY_CODE}`, "delay 0.1");

  for (const part of normalized.split(/(\n|\t)/)) {
    if (part === "") continue;
    if (part === "\n") lines.push(`key code ${RETURN_KEY_CODE}`);
    else if (part === "\t") lines.push("keystroke tab");
    else lines.push(`keystroke ${quoteAppleScript(part)}`);
  }

  return ['tell application "System Events"', ...lines.map((line) => `  ${line}`), "end tell"].join("\n");
}
