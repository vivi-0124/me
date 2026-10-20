<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { toast } from "vue-sonner";
import { useTimeoutFn } from "@vueuse/core";
import type { Comment } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEventComments } from "@/composables/useEventComments";
import { colorFor, timeAgo } from "@/lib/format";

const props = defineProps<{ comment: Comment }>();
const ctx = useEventComments()!;

// 自分のコメントか、ページを作った人なら消せる。直せるのは自分のコメントだけ
const canDelete = computed(() => props.comment.mine || !!ctx.editKey.value);
const confirming = ref(false);
const { start: resetLater } = useTimeoutFn(() => (confirming.value = false), 4000, { immediate: false });

async function onDelete() {
  // 誤タップ対策で、2回押したら消す
  if (!confirming.value) {
    confirming.value = true;
    resetLater();
    return;
  }
  try {
    await ctx.remove(props.comment);
    toast.success("コメントを消しました");
  } catch (err) {
    toast.error((err as Error).message);
  }
}

/* ---------- 編集 ---------- */

const editing = ref(false);
const draft = ref("");
const saving = ref(false);
const error = ref("");
const editor = useTemplateRef<InstanceType<typeof Textarea>>("editor");

async function startEdit() {
  draft.value = props.comment.body;
  error.value = "";
  editing.value = true;
  await nextTick();
  const el = (editor.value as { $el?: HTMLTextAreaElement } | null)?.$el;
  el?.focus();
  el?.setSelectionRange(el.value.length, el.value.length);
}

async function saveEdit() {
  error.value = "";
  if (!draft.value.trim()) return void (error.value = "コメントを書いてください。消したいときは「消す」を押してください");
  if (draft.value.trim() === props.comment.body) return void (editing.value = false);
  saving.value = true;
  try {
    await ctx.edit(props.comment, draft.value);
    editing.value = false;
    toast.success("コメントを直しました");
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <article class="grid grid-cols-[2.2rem_1fr] gap-3 border-b px-4 py-3.5">
    <div
      class="grid size-9 place-items-center rounded-full text-sm font-bold text-background"
      :style="{ background: colorFor(comment.author) }"
      aria-hidden="true"
    >
      {{ [...comment.author][0] }}
    </div>
    <div class="min-w-0">
      <div class="flex flex-wrap items-baseline gap-x-2.5 text-[0.82rem]">
        <b class="text-sm">{{ comment.author }}</b>
        <time :datetime="comment.created_at" :title="new Date(comment.created_at).toLocaleString('ja-JP')" class="text-muted-foreground">
          {{ timeAgo(comment.created_at) }}
        </time>
        <span
          v-if="comment.edited_at"
          class="text-xs text-muted-foreground"
          :title="`${new Date(comment.edited_at).toLocaleString('ja-JP')} に編集`"
        >(編集済み)</span>
        <span v-if="!editing" class="ml-auto flex gap-3">
          <button v-if="comment.mine" type="button" class="min-h-8 pl-2 text-xs text-muted-foreground underline" @click="startEdit">
            編集
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="min-h-8 text-xs underline"
            :class="confirming ? 'font-bold text-destructive' : 'text-muted-foreground'"
            @click="onDelete"
          >
            {{ confirming ? "もう一度押すと消えます" : "消す" }}
          </button>
        </span>
      </div>

      <form v-if="editing" class="mt-2 grid gap-2" @submit.prevent="saveEdit">
        <Textarea ref="editor" v-model="draft" maxlength="1000" aria-label="コメントを編集" class="min-h-24 bg-background" />
        <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="ghost" class="min-h-11 rounded-full" :disabled="saving" @click="editing = false">やめる</Button>
          <Button type="submit" class="min-h-11 rounded-full px-5 font-bold" :disabled="saving">{{ saving ? "保存中…" : "保存する" }}</Button>
        </div>
      </form>
      <p v-else class="mt-0.5 whitespace-pre-wrap break-words text-[0.95rem]">{{ comment.body }}</p>
    </div>
  </article>
</template>
