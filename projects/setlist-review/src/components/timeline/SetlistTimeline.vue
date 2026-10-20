<script setup lang="ts">
// セトリと MC の縦タイムライン。ライブのページと、編集画面のプレビューで共通
import type { Item } from "@shared/types";
import SongRow from "./SongRow.vue";
import McCard from "./McCard.vue";

defineProps<{ items: Item[]; commentable?: boolean }>();
</script>

<template>
  <div class="relative pl-6 before:absolute before:left-[0.45rem] before:top-2 before:bottom-2 before:w-0.5 before:rounded before:bg-gradient-to-b before:from-primary before:via-rose before:to-sky before:opacity-50">
    <template v-for="(item, i) in items" :key="i">
      <div v-if="item.kind === 'block'" class="mt-12 mb-2 text-xs tracking-[0.3em] text-muted-foreground first:mt-0">
        {{ item.label }}
      </div>
      <div v-else-if="item.kind === 'encore'" class="mt-14 mb-4 text-center font-display text-2xl italic tracking-[0.2em] text-rose">
        — encore —
      </div>
      <SongRow v-else-if="item.kind === 'song'" :song="item" :commentable />
      <McCard v-else-if="item.kind === 'mc'" :mc="item" :commentable />
    </template>
  </div>
</template>
