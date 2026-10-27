import { closeMainWindow, getFrontmostApplication, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { buildRetypeScript, findUntypableChars } from "./lib/keys";
import { deleteModeFor, parseBundleIds } from "./lib/terminal";

async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    // 選択が無いと getSelectedText は例外を投げる
    return "";
  }
}

async function readFrontmostBundleId(): Promise<string | undefined> {
  try {
    return (await getFrontmostApplication()).bundleId;
  } catch {
    return undefined;
  }
}

export default async function Command() {
  await closeMainWindow();

  const text = await readSelection();
  if (text === "") {
    await showHUD("文字列を選択してください");
    return;
  }

  const untypable = findUntypableChars(text);
  if (untypable.length > 0) {
    await showHUD(`英数字と記号以外の文字が含まれています: ${untypable.slice(0, 5).join(" ")}`);
    return;
  }

  const { terminalApps } = getPreferenceValues<Preferences>();
  const deleteMode = deleteModeFor(await readFrontmostBundleId(), parseBundleIds(terminalApps));

  try {
    await runAppleScript(buildRetypeScript(text, deleteMode));
  } catch (error) {
    console.error(error);
    await showHUD(
      "キーを送れませんでした。Raycast のアクセシビリティ権限と System Events の操作許可を確認してください",
    );
  }
}
