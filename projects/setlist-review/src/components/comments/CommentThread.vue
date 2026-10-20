<script setup lang="ts">
import { computed } from "vue";
import { GENERAL, useEventComments } from "@/composables/useEventComments";
import CommentItem from "./CommentItem.vue";
import CommentForm from "./CommentForm.vue";

const props = defineProps<{ target: string; placeholder?: string }>();
const ctx = useEventComments()!;
const list = computed(() => ctx.byTarget.value.get(props.target) ?? []);
const general = computed(() => props.target === GENERAL);
</script>

<template>
  <div class="overflow-hidden rounded-2xl border bg-card">
    <CommentItem v-for="c in list" :key="c.id" :comment="c" />
    <p v-if="!list.length" class="border-b px-4 py-3.5 text-sm text-muted-foreground">
      {{ general ? "まだ感想はありません。最初のひとことをどうぞ" : "まだコメントはありません。最初のひとことをどうぞ" }}
    </p>
    <CommentForm
      :target
      :placeholder="placeholder ?? (general ? 'ライブ全体の感想、思い出したことなど' : '思い出したこと、感想、ちがうかも？ と思ったことなど')"
    />
  </div>
</template>
