// このブラウザだけに覚えておくもの（ログインの代わり）
import { useLocalStorage } from "@vueuse/core";

type EventSummary = { slug: string; artist: string; title: string; date: string };

/** コメントに使うニックネーム */
export const nickname = useLocalStorage("sr-name", "");

/** 自分のコメントを消すための合言葉。ブラウザごとに1つ */
export const ownerToken = useLocalStorage("sr-token", () => crypto.randomUUID());

/** 自分が作ったページ: slug -> 編集用の合言葉など */
export const myEvents = useLocalStorage<Record<string, Omit<EventSummary, "slug"> & { editKey?: string }>>("sr-mine", {});

/** 最近見たページ（新しい順、20件まで） */
export const recentEvents = useLocalStorage<EventSummary[]>("sr-recent", []);

export function editKeyFor(slug: string) {
  return myEvents.value[slug]?.editKey ?? null;
}

export function saveMine(slug: string, info: Partial<Omit<EventSummary, "slug">> & { editKey?: string }) {
  const base = { artist: "", title: "", date: "" };
  myEvents.value = { ...myEvents.value, [slug]: Object.assign(base, myEvents.value[slug], info) };
}

export function rememberVisit(e: EventSummary) {
  const entry = { slug: e.slug, artist: e.artist, title: e.title, date: e.date };
  recentEvents.value = [entry, ...recentEvents.value.filter((r) => r.slug !== e.slug)].slice(0, 20);
}
