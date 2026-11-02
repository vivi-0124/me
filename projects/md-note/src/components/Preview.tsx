import { Action, ActionPanel, Detail, Icon, useNavigation, Keyboard } from "@raycast/api";

export default function Preview({ title, markdown }: { title: string; markdown: string }) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={title}
      markdown={markdown.trim() === "" ? "_（まだ何も書いていません）_" : markdown}
      actions={
        <ActionPanel>
          <Action title="Back to Editor" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit} onAction={pop} />
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}
