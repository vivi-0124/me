import { Action, ActionPanel, Form, getApplications, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { DEFAULT_TERMINAL_BUNDLE_IDS, loadTerminalBundleIds, saveTerminalBundleIds } from "./lib/terminal";

type AppItem = { bundleId: string; name: string; path: string };

// bundleId の無いアプリは判定に使えないので除き、同じ bundleId は 1 つにまとめる
async function loadApps(): Promise<AppItem[]> {
  const apps = await getApplications();
  const byId = new Map<string, AppItem>();
  for (const app of apps) {
    if (!app.bundleId || byId.has(app.bundleId)) continue;
    byId.set(app.bundleId, { bundleId: app.bundleId, name: app.localizedName ?? app.name, path: app.path });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export default function Command() {
  const [selected, setSelected] = useState<string[]>([]);
  const { data: apps = [], isLoading: loadingApps } = usePromise(loadApps);
  const { data: saved = [], isLoading: loadingSaved } = usePromise(loadTerminalBundleIds, [], { onData: setSelected });

  const installed = new Set(apps.map((app) => app.bundleId));

  async function save() {
    // 未インストールのアプリは一覧に出ないので、保存済みのものは消さずに残す
    const hidden = saved.filter((id) => !installed.has(id));
    await saveTerminalBundleIds([...new Set([...selected, ...hidden])]);
    await showToast({ style: Toast.Style.Success, title: "保存しました", message: `${selected.length} 個のアプリ` });
  }

  return (
    <Form
      isLoading={loadingApps || loadingSaved}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={save} />
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => setSelected(DEFAULT_TERMINAL_BUNDLE_IDS.filter((id) => installed.has(id)))}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="ここで選んだアプリでは、元の文字を BackSpace で消してから打ち直します。ターミナルなど、選択範囲を打っても上書きできないアプリを選んでください。" />
      <Form.TagPicker id="bundleIds" title="対象のアプリ" value={selected} onChange={setSelected}>
        {apps.map((app) => (
          <Form.TagPicker.Item key={app.bundleId} value={app.bundleId} title={app.name} icon={{ fileIcon: app.path }} />
        ))}
      </Form.TagPicker>
      <Form.Description text="VS Code・Cursor はエディタと統合ターミナルを見分けられないため、→ で選択を末尾に畳んでから消します。" />
    </Form>
  );
}
