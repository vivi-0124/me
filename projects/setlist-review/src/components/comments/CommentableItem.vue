<script setup lang="ts">
// コメントを付けられる1項目。右に 💬 ボタン、押すと下にコメント欄が開く
import { computed, nextTick, useTemplateRef } from "vue";
import { MessageCircle } from "@lucide/vue";
import { useEventComments } from "@/composables/useEventComments";
import { cn } from "@/lib/utils";
import CommentThread from "./CommentThread.vue";

const props = defineProps<{ target?: string; label: string; class?: string; placeholder?: string }>();
const ctx = useEventComments();
const thread = useTemplateRef<HTMLElement>("thread");

const enabled = computed(() => !!(ctx && props.target));
const count = computed(() => (props.target && ctx?.byTarget.value.get(props.target)?.length) || 0);
const isOpen = computed(() => !!props.target && !!ctx?.open.value.has(props.target));

async function toggle() {
  if (!ctx || !props.target) return;
  ctx.toggle(props.target);
  if (isOpen.value) {
    await nextTick();
    thread.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}
</script>

<template>
  <div
    :class="cn('relative grid grid-cols-[1fr_auto] items-start gap-x-2 rounded-xl transition-colors', isOpen && 'bg-white/3', props.class)"
    :data-target="target"
  >
    <div class="min-w-0"><slot /></div>
    <button
      v-if="enabled"
      type="button"
      :aria-expanded="isOpen"
      :aria-label="`${label}にコメント`"
      :class="cn(
        'inline-flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-full border px-3 text-sm tabular-nums transition-colors',
        isOpen ? 'border-primary bg-primary text-primary-foreground'
          : count ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground',
      )"
      @click="toggle"
    >
      <MessageCircle class="size-4" aria-hidden="true" />
      <span v-if="count">{{ count }}</span>
    </button>
    <div v-if="isOpen && target" ref="thread" class="col-span-full mt-3">
      <CommentThread :target :placeholder />
    </div>
  </div>
</template>
