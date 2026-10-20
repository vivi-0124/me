<script setup lang="ts">
// ページ上部の、ライブ会場っぽい見出し
defineProps<{ eyebrow?: string; kicker?: string }>();
</script>

<template>
  <header class="stage-lights grid min-h-[56svh] place-items-center px-5 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-10 text-center sm:min-h-[70svh] sm:pt-20">
    <div>
      <div v-if="eyebrow" class="font-display text-lg italic tracking-[0.2em] text-primary">{{ eyebrow }}</div>
      <h1 class="mt-2.5 font-serif text-[2.1rem] leading-snug font-extrabold tracking-wide text-balance sm:text-[3.4rem]">
        <small v-if="kicker" class="mb-4 block font-sans text-sm font-black tracking-[0.5em] text-muted-foreground sm:text-lg">{{ kicker }}</small>
        <slot name="title" />
      </h1>
      <slot />
    </div>
  </header>
</template>
