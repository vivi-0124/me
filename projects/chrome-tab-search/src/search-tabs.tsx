import { Action, ActionPanel, closeMainWindow, Icon, List, popToRoot } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { activateTab, ChromeTab, listTabs } from "./lib/chrome";

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function Command() {
  const {
    data: tabs = [],
    isLoading,
    revalidate,
  } = useCachedPromise(listTabs, [], {
    failureToastOptions: { title: "タブを取得できませんでした" },
  });
  const [query, setQuery] = useState("");

  // 日本語は単語に区切れないので、タイトルと URL の部分一致で絞り込む
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = tabs.filter((tab) => {
    const haystack = `${tab.title}\n${tab.url}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  async function onSwitch(tab: ChromeTab) {
    try {
      await activateTab(tab.id);
      await closeMainWindow();
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, { title: "タブを開けませんでした" });
      revalidate();
    }
  }

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setQuery} searchBarPlaceholder="タブを検索">
      {!isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={tabs.length === 0 ? "開いているタブがありません" : "一致するタブがありません"}
        />
      )}
      {visible.map((tab) => (
        <List.Item
          key={tab.id}
          title={tab.title || tab.url}
          subtitle={hostname(tab.url)}
          icon={getFavicon(tab.url, { fallback: Icon.Globe })}
          accessories={[{ text: `ウィンドウ ${tab.windowNumber}` }]}
          actions={
            <ActionPanel>
              <Action title="Switch to Tab" icon={Icon.Switch} onAction={() => onSwitch(tab)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
