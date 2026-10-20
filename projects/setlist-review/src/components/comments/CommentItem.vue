<script setup lang="ts">
import { computed, ref } from "vue";
import { toast } from "vue-sonner";
import { useTimeoutFn } from "@vueuse/core";
import type { Comment } from "@shared/types";
import { useEventComments } from "@/composables/useEventComments";
import { colorFor, timeAgo } from "@/lib/format";

const props = defineProps<{ comment: Comment }>();
const ctx = useEventComments()!;

// 自分のコメントか、ページを作った人なら消せる
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
        <button
          v-if="canDelete"
          type="button"
          class="ml-auto min-h-8 pl-2 text-xs underline"
          :class="confirming ? 'font-bold text-destructive' : 'text-muted-foreground'"
          @click="onDelete"
        >
          {{ confirming ? "もう一度押すと消えます" : "消す" }}
        </button>
      </div>
      <p class="mt-0.5 whitespace-pre-wrap break-words text-[0.95rem]">{{ comment.body }}</p>
    </div>
  </article>
</template>
