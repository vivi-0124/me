<script setup lang="ts">
import type { Song } from "@shared/types";
import CommentableItem from "@/components/comments/CommentableItem.vue";

defineProps<{ song: Song; commentable?: boolean }>();
</script>

<template>
  <CommentableItem
    :target="commentable ? song.id : undefined"
    :label="`${song.no}「${song.name}」`"
    class="py-3 pr-1"
  >
    <!-- タイムライン上の丸 -->
    <span
      class="absolute -left-[1.4rem] top-5 size-2.5 rounded-full border-2 bg-background"
      :class="song.encore ? 'border-rose' : 'border-primary'"
      aria-hidden="true"
    />
    <div class="grid grid-cols-[2.6rem_1fr]">
      <div class="pt-0.5 font-serif tabular-nums" :class="song.encore ? 'text-sm text-rose' : 'text-lg text-muted-foreground'">
        {{ song.no }}
      </div>
      <div>
        <div class="font-serif text-xl font-extrabold leading-normal">
          {{ song.name }}
          <span v-if="song.tag" class="ml-2 rounded-full bg-primary px-2 py-px align-[0.25rem] font-sans text-[0.68rem] font-bold text-primary-foreground">{{ song.tag }}</span>
        </div>
        <ul v-if="song.notes?.length" class="mt-1.5 space-y-1 text-[0.92rem] text-foreground/80">
          <li v-for="(note, i) in song.notes" :key="i" class="relative pl-4">
            <span class="absolute left-0 top-1 text-[0.7rem] text-primary" aria-hidden="true">✦</span>{{ note }}
          </li>
        </ul>
      </div>
    </div>
  </CommentableItem>
</template>
