// 1ページ分のコメント。ページ全体で1つ作って provide し、各コメント欄で inject する
import { computed, inject, provide, ref, type InjectionKey } from "vue";
import { useDocumentVisibility, useIntervalFn, watchDebounced } from "@vueuse/core";
import type { Comment } from "@shared/types";
import { api } from "@/lib/api";
import { editKeyFor, ownerToken } from "@/lib/store";

const POLL_MS = 20_000;
export const GENERAL = "general"; // ライブ全体への感想

function create(slug: string) {
  const comments = ref<Comment[]>([]);
  const editKey = computed(() => editKeyFor(slug));
  /** 開いているコメント欄 */
  const open = ref(new Set<string>());

  const byTarget = computed(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments.value) {
      if (!map.has(c.target_id)) map.set(c.target_id, []);
      map.get(c.target_id)!.push(c);
    }
    return map;
  });

  async function load() {
    try {
      const data = await api<{ comments: Comment[] }>(`/api/comments?event=${slug}&token=${encodeURIComponent(ownerToken.value)}`);
      comments.value = data.comments;
    } catch {
      // 電波が切れているときは、次の読み込みでまた試す
    }
  }

  async function post(target: string, author: string, body: string) {
    const { comment } = await api<{ comment: Comment }>("/api/comments", {
      method: "POST",
      body: { event: slug, target, author, body, token: ownerToken.value },
    });
    comments.value = [...comments.value, comment];
  }

  async function remove(c: Comment) {
    await api(`/api/comments/${c.id}?token=${encodeURIComponent(ownerToken.value)}`, {
      method: "DELETE",
      headers: editKey.value ? { "x-edit-key": editKey.value } : {},
    });
    comments.value = comments.value.filter((x) => x.id !== c.id);
  }

  function toggle(target: string, value?: boolean) {
    const next = new Set(open.value);
    if (value ?? !next.has(target)) next.add(target);
    else next.delete(target);
    open.value = next;
  }

  // 20秒ごと、と、スマホで画面に戻ってきたときに読み直す
  const visibility = useDocumentVisibility();
  useIntervalFn(() => visibility.value === "visible" && load(), POLL_MS);
  watchDebounced(visibility, (v) => v === "visible" && load(), { debounce: 300 });

  return { comments, byTarget, editKey, open, load, post, remove, toggle };
}

export type EventComments = ReturnType<typeof create>;
const KEY: InjectionKey<EventComments> = Symbol("event-comments");

export function provideEventComments(slug: string) {
  const ctx = create(slug);
  provide(KEY, ctx);
  return ctx;
}

/** プレビューなど、コメントの無い所では null */
export function useEventComments() {
  return inject(KEY, null);
}
