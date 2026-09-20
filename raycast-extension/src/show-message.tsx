import { Toast, getPreferenceValues, showToast } from "@raycast/api";

export default async function Command() {
  const { greeting } = getPreferenceValues<Preferences.ShowMessage>();

  await showToast({
    style: Toast.Style.Success,
    title: `${greeting}, Raycast!`,
    message: "no-view コマンドのサンプルです",
  });
}
