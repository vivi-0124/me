import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

type Item = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

// TODO: ここを API 取得や child_process 実行に置き換える
const ITEMS: Item[] = [
  { id: "1", title: "Raycast API Reference", subtitle: "公式 API ドキュメント", url: "https://developers.raycast.com/api-reference/user-interface" },
  { id: "2", title: "Getting Started", subtitle: "拡張機能づくりの入口", url: "https://developers.raycast.com/basics/getting-started" },
  { id: "3", title: "Example Extensions", subtitle: "公式サンプル集", url: "https://github.com/raycast/extensions" },
];

export default function Command() {
  const { greeting } = getPreferenceValues<Preferences.SearchItems>();
  const [searchText, setSearchText] = useState("");

  const filtered = ITEMS.filter((item) => item.title.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="検索..." throttle>
      <List.Section title={`${greeting} — ${filtered.length} 件`}>
        {filtered.map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Link}
            title={item.title}
            subtitle={item.subtitle}
            accessories={[{ text: item.id }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView icon={Icon.MagnifyingGlass} title="見つかりません" description="別のキーワードで検索してください" />
    </List>
  );
}
