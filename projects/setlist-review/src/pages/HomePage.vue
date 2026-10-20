<script setup lang="ts">
import { computed } from "vue";
import { useTitle } from "@vueuse/core";
import { Plus } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StageHero from "@/components/StageHero.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import { formatDate } from "@/lib/format";
import { myEvents, recentEvents } from "@/lib/store";

useTitle("みんなでセトリふりかえり");

const STEPS = [
  ["セトリを書く", "曲名と、MC・アンコールの場所を書くだけ"],
  ["リンクを送る", "LINE や X で、ファン仲間にページのリンクを送る"],
  ["みんなでコメント", "曲や MC ごとに、思い出や感想を書き合える"],
] as const;

const mine = computed(() => Object.entries(myEvents.value).map(([slug, e]) => ({ slug, ...e })).reverse());
const recent = computed(() => recentEvents.value.filter((e) => !(e.slug in myEvents.value)));
</script>

<template>
  <StageHero eyebrow="AFTER THE SHOW" kicker="みんなで">
    <template #title><span class="text-[2.4rem] sm:text-[3.4rem]">セトリふりかえり</span></template>
    <p class="mx-auto mt-6 max-w-md text-[0.95rem] text-muted-foreground">
      ライブのセトリと MC に、ファン仲間とひとつずつコメントできるページを作れます。
    </p>
    <Button as-child size="lg" class="mt-8 min-h-12 rounded-full px-6 font-bold">
      <RouterLink to="/new"><Plus class="size-4" /> ふりかえりページを作る</RouterLink>
    </Button>
  </StageHero>

  <main class="mx-auto max-w-2xl px-4 pb-20 sm:px-5">
    <SectionTitle>つかいかた</SectionTitle>
    <ol class="grid gap-3">
      <li v-for="([head, body], i) in STEPS" :key="head" class="relative rounded-2xl border bg-card py-4 pr-4 pl-14">
        <span class="absolute top-4 left-4 grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{{ i + 1 }}</span>
        <b class="block">{{ head }}</b>
        <span class="text-sm text-muted-foreground">{{ body }}</span>
      </li>
    </ol>
    <p class="mt-3 text-xs text-muted-foreground">登録はいりません。ページはリンクを知っている人だけが見られます。</p>

    <template v-for="section in [{ title: 'あなたが作ったページ', list: mine, mine: true }, { title: '最近見たページ', list: recent, mine: false }]" :key="section.title">
      <template v-if="section.list.length">
        <SectionTitle>{{ section.title }}</SectionTitle>
        <ul class="grid gap-3">
          <li v-for="e in section.list" :key="e.slug">
            <RouterLink :to="`/e/${e.slug}`" class="relative grid gap-0.5 rounded-2xl border bg-card px-4 py-4 text-foreground no-underline">
              <span class="font-display text-sm italic tracking-widest text-primary">{{ formatDate(e.date) || "日付なし" }}</span>
              <span class="text-xs text-muted-foreground">{{ e.artist }}</span>
              <b class="font-serif text-lg leading-normal">{{ e.title || e.artist }}</b>
              <Badge v-if="section.mine" class="absolute top-4 right-4">作った</Badge>
            </RouterLink>
          </li>
        </ul>
      </template>
    </template>
  </main>
</template>
