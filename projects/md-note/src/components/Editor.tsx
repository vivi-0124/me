import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  deleteNote,
  exists,
  getLastPath,
  newNoteName,
  noteName,
  pathForName,
  readNote,
  renameNote,
  sanitizeName,
  setLastPath,
  writeNote,
} from "../lib/notes";
import NoteList from "./NoteList";
import Preview from "./Preview";

const AUTOSAVE_DELAY_MS = 400;

type Props = {
  /** 開くノート。省略すると最後に開いていたノート（無ければ新しいノート） */
  initialPath?: string;
  /** true なら必ず新しいノートで開く */
  startNew?: boolean;
};

export default function Editor({ initialPath, startNew }: Props) {
  const { push, pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [path, setPath] = useState<string>();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);

  // 保存は非同期で走るので、最新の値は ref から読む
  const pathRef = useRef<string>(undefined);
  const nameRef = useRef("");
  const bodyRef = useRef("");
  const dirtyRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>(undefined);
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  async function save() {
    let current = pathRef.current;
    if (!current) return;

    // ファイル名が変わっていれば、先に名前を変える
    const wanted = sanitizeName(nameRef.current);
    const target = wanted ? pathForName(wanted) : current;
    if (target !== current) {
      try {
        // 未保存の新しいノートでも、既にあるファイルは上書きしない
        if (await exists(current)) await renameNote(current, target);
        else if (await exists(target)) throw new Error(`「${noteName(target)}」は既にあります`);
        current = target;
        pathRef.current = target;
        setPath(target);
      } catch (error) {
        await showFailureToast(error, { title: "名前を変えられませんでした" });
        nameRef.current = noteName(current);
        setName(noteName(current));
      }
    }

    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const text = bodyRef.current;
    // 何も書いていない新しいノートはファイルを作らない
    if (text === "" && !(await exists(current))) return;
    try {
      await writeNote(current, text);
      await setLastPath(current);
      setSaved(true);
    } catch (error) {
      dirtyRef.current = true;
      await showFailureToast(error, { title: "保存できませんでした" });
    }
  }

  /** 保存を順番に走らせる（並行して書くと古い内容で上書きされうる） */
  function flush(): Promise<void> {
    clearTimeout(timerRef.current);
    chainRef.current = chainRef.current.then(save);
    return chainRef.current;
  }

  function scheduleSave() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }

  async function load(next: string | undefined) {
    await flush();
    const target = next ?? pathForName(newNoteName());
    const text = next ? await readNote(next) : "";
    const isSaved = next ? await exists(next) : false;
    pathRef.current = target;
    nameRef.current = noteName(target);
    bodyRef.current = text;
    dirtyRef.current = false;
    setPath(target);
    setName(noteName(target));
    setBody(text);
    setSaved(isSaved);
    if (isSaved) await setLastPath(target);
    setIsLoading(false);
  }

  useEffect(() => {
    (async () => {
      const first = startNew ? undefined : (initialPath ?? (await getLastPath()));
      await load(first);
    })();
    // 閉じるときに書きかけを保存する
    return () => {
      flush();
    };
  }, []);

  function onBodyChange(value: string) {
    bodyRef.current = value;
    dirtyRef.current = true;
    setBody(value);
    scheduleSave();
  }

  function onNameChange(value: string) {
    nameRef.current = value;
    setName(value);
  }

  async function onDelete() {
    clearTimeout(timerRef.current);
    await chainRef.current;
    const path = pathRef.current;
    if (!path) return;
    const ok = await confirmAlert({
      title: `「${noteName(path)}」を削除しますか？`,
      icon: Icon.Trash,
      primaryAction: { title: "削除", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    dirtyRef.current = false;
    try {
      if (await exists(path)) await deleteNote(path);
      await showToast({ style: Toast.Style.Success, title: "削除しました" });
      await load(undefined);
    } catch (error) {
      await showFailureToast(error, { title: "削除できませんでした" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={name || "MD Note"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Preview" icon={Icon.Eye} onAction={() => push(<Preview title={name} markdown={body} />)} />
            <Action
              title="Save"
              icon={Icon.SaveDocument}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={async () => {
                dirtyRef.current = true;
                await flush();
                await showToast({ style: Toast.Style.Success, title: "保存しました" });
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Create New Note"
              icon={Icon.NewDocument}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => load(undefined)}
            />
            <Action
              title="Open Note…"
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={async () => {
                await flush();
                push(
                  <NoteList
                    currentPath={pathRef.current}
                    onOpen={(next) => {
                      pop();
                      load(next);
                    }}
                  />,
                );
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Markdown" content={body} shortcut={Keyboard.Shortcut.Common.Copy} />
            {path && saved && (
              <>
                <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                <Action.Open
                  title="Open with Default App"
                  target={path}
                  icon={Icon.AppWindow}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                />
                <Action.CopyToClipboard
                  title="Copy File Path"
                  content={path}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </>
            )}
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="ファイル名"
        placeholder={newNoteName()}
        info="フォーカスを外すと名前が変わります（.md は付けない）"
        value={name}
        onChange={onNameChange}
        onBlur={() => flush()}
      />
      <Form.TextArea
        id="body"
        title="本文"
        placeholder="Markdown で書く（⌘↵ でプレビュー）"
        enableMarkdown
        autoFocus
        value={body}
        onChange={onBodyChange}
      />
    </Form>
  );
}
