<script setup lang="ts">
import type { Mc, McLine } from "@shared/types";
import CommentableItem from "@/components/comments/CommentableItem.vue";

defineProps<{ mc: Mc; commentable?: boolean }>();

function labelOf(line: McLine) {
  const text = line.text ?? (line.quotes ?? []).map((q) => q.text).join(" ");
  return `MC「${text.slice(0, 24)}${text.length > 24 ? "…" : ""}」`;
}
</script>

<template>
  <section class="relative my-5 rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/14 to-rose/6 px-4 py-3">
    <span class="absolute -left-[1.6rem] top-1/2 size-4 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_var(--primary)]" aria-hidden="true" />

    <!-- 今の形式: MC は「ここで MC があった」という印だけ。中身はみんながコメントで書く -->
    <CommentableItem
      v-if="!mc.lines.length"
      :target="commentable ? mc.id : undefined"
      :label="mc.title"
      placeholder="どんな話をしていた？ 覚えていることを書いてください"
      class="items-center"
    >
      <h3 class="text-sm font-bold tracking-[0.25em] text-primary">{{ mc.title }}</h3>
      <p v-if="commentable" class="text-xs text-muted-foreground">どんな話だった？ 右のボタンから書いてね</p>
    </CommentableItem>

    <!-- 前の形式: MC の中身が1行ずつ書いてある -->
    <template v-else>
      <h3 class="mt-2 mb-2 text-xs font-bold tracking-[0.25em] text-primary">{{ mc.title }}</h3>
      <CommentableItem
        v-for="(line, i) in mc.lines"
        :key="line.id ?? i"
        :target="commentable ? line.id : undefined"
        :label="labelOf(line)"
        class="border-t border-dashed border-primary/20 py-2.5 pr-1 first-of-type:border-t-0"
      >
        <span v-if="line.news" class="block text-[0.72rem] font-bold tracking-[0.2em] text-primary">{{ line.news }}</span>
        <span
          v-for="(q, qi) in line.quotes"
          :key="qi"
          class="my-1 block rounded-r-lg border-l-[3px] border-primary bg-background/50 px-3.5 py-2.5 font-serif text-[1.02rem] leading-relaxed"
        >
          <span class="mb-0.5 block font-sans text-[0.72rem] tracking-widest text-primary">{{ q.who }}</span>{{ q.text }}
        </span>
        <span
          v-if="line.text"
          class="block"
          :class="[line.toSong && 'font-bold text-primary', line.news && 'font-serif text-lg font-extrabold']"
        ><template v-if="line.toSong">♪ </template>{{ line.text }}</span>
        <span v-for="(s, si) in line.subs" :key="si" class="mt-1 block text-sm text-muted-foreground">{{ s }}</span>
      </CommentableItem>
    </template>
  </section>
</template>
