import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { deleteNote, listNotes, notesDirectory, readNote } from "../lib/notes";

// 一覧のプレビューと全文検索に使う。長いノートは先頭だけ
const MAX_PREVIEW_CHARS = 20_000;

async function loadNotes() {
  const notes = await listNotes();
  return Promise.all(
    notes.map(async (note) => ({ ...note, body: (await readNote(note.path)).slice(0, MAX_PREVIEW_CHARS) })),
  );
}

type Props = {
  /** refresh を呼ぶと一覧を読み直す（エディタから戻ったとき用） */
  onOpen: (path: string, refresh: () => void) => void;
  onCreate?: () => void;
  currentPath?: string;
};

export default function NoteList({ onOpen, onCreate, currentPath }: Props) {
  const { data: notes = [], isLoading, revalidate } = usePromise(loadNotes);
  const [query, setQuery] = useState("");

  // 日本語は単語に区切れないので、ファイル名と本文の部分一致で絞り込む
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = notes.filter((note) => {
    const haystack = `${note.name}\n${note.body}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  async function onDelete(path: string, name: string) {
    const ok = await confirmAlert({
      title: `「${name}」を削除しますか？`,
      icon: Icon.Trash,
      primaryAction: { title: "削除", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await deleteNote(path);
      await showToast({ style: Toast.Style.Success, title: "削除しました" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "削除できませんでした" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="ノートを探す（本文も対象）"
    >
      <List.EmptyView
        icon={Icon.Document}
        title="ノートがありません"
        description={`保存先: ${notesDirectory()}`}
        actions={
          onCreate && (
            <ActionPanel>
              <Action title="Create New Note" icon={Icon.NewDocument} onAction={onCreate} />
            </ActionPanel>
          )
        }
      />
      {visible.map((note) => (
        <List.Item
          key={note.path}
          id={note.path}
          title={note.name}
          icon={note.path === currentPath ? Icon.Pencil : Icon.Document}
          accessories={[{ date: note.mtime }]}
          detail={<List.Item.Detail markdown={note.body || "_（空のノート）_"} />}
          actions={
            <ActionPanel>
              <Action title="Open in Editor" icon={Icon.Pencil} onAction={() => onOpen(note.path, revalidate)} />
              {onCreate && (
                <Action
                  title="Create New Note"
                  icon={Icon.NewDocument}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={onCreate}
                />
              )}
              <Action.ShowInFinder path={note.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              <Action.Open
                title="Open with Default App"
                target={note.path}
                icon={Icon.AppWindow}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
              />
              <Action.CopyToClipboard
                title="Copy Markdown"
                content={note.body}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Delete Note"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => onDelete(note.path, note.name)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
