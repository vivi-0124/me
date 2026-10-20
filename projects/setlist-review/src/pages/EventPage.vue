<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTitle } from "@vueuse/core";
import { KeyRound, MessageCircle, Pencil, Send } from "@lucide/vue";
import type { EventInfo } from "@shared/types";
import { commentables } from "@shared/parse";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StageHero from "@/components/StageHero.vue";
import TopNav from "@/components/TopNav.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import SetlistTimeline from "@/components/timeline/SetlistTimeline.vue";
import CommentThread from "@/components/comments/CommentThread.vue";
import CommentItem from "@/components/comments/CommentItem.vue";
import { GENERAL, provideEventComments } from "@/composables/useEventComments";
import { api, ApiError } from "@/lib/api";
import { eventName, formatDate } from "@/lib/format";
import { copyText, shareOrCopy } from "@/lib/share";
import { rememberVisit } from "@/lib/store";

const props = defineProps<{ slug: string }>();
const route = useRoute();
const router = useRouter();

const event = ref<EventInfo | null>(null);
const error = ref("");
const notFound = ref(false);
const comments = provideEventComments(props.slug);

const title = computed(() => (event.value ? `${eventName(event.value)}｜みんなでセトリふりかえり` : "みんなでセトリふりかえり"));
useTitle(title);

const shareUrl = computed(() => `${location.origin}/e/${props.slug}`);
const editUrl = computed(() => `${location.origin}/e/${props.slug}/edit#key=${comments.editKey.value}`);
// 作った直後だけ「できました」を出す（?created=1 で来る）
const justCreated = ref(route.query.created !== undefined);

const knownTargets = computed(() => new Set([GENERAL, ...commentables(event.value?.items ?? []).map((c) => c.id)]));
/** 編集で消えた項目へのコメント。なくさずに一番下にまとめて出す */
const orphans = computed(() => comments.comments.value.filter((c) => !knownTargets.value.has(c.target_id)));
const total = computed(() => comments.comments.value.length);

const commentedTargets = computed(() =>
  [...comments.byTarget.value.keys()].filter((t) => t !== GENERAL && knownTargets.value.has(t)),
);
// 最初は、コメントのある欄を全部開いておく。「全部とじる」を押すまでは、
// あとから新しくコメントが付いた欄も開く（コメントが0件の欄は、開くと長くなるので閉じたまま）
const expandAll = ref(true);
// 1つずつ閉じた欄が、20秒ごとの読み直しでまた開かないよう、新しくコメントが付いた欄だけ開く
watch(commentedTargets, (targets, before = []) => {
  if (!expandAll.value) return;
  for (const t of targets) if (!before.includes(t)) comments.toggle(t, true);
});
function toggleAll() {
  expandAll.value = !expandAll.value;
  for (const t of commentedTargets.value) comments.toggle(t, expandAll.value);
}

onMounted(async () => {
  if (justCreated.value) router.replace({ query: {} });
  try {
    const data = await api<{ event: EventInfo }>(`/api/events/${props.slug}`);
    event.value = data.event;
    rememberVisit(data.event);
    await comments.load();
    if (route.hash) {
      await nextTick();
      document.querySelector(route.hash)?.scrollIntoView();
    }
  } catch (err) {
    notFound.value = err instanceof ApiError && err.status === 404;
    error.value = (err as Error).message;
  }
});
</script>

<template>
  <TopNav to="/" label="みんなでセトリふりかえり" />

  <main v-if="error" class="mx-auto grid min-h-[80svh] max-w-2xl content-center px-4 text-center">
    <h1 class="font-serif text-2xl">{{ notFound ? "ページが見つかりません" : "読み込めませんでした" }}</h1>
    <p class="mt-3 text-sm text-muted-foreground">
      {{ notFound ? "リンクが途中で切れているかもしれません。送ってくれた人に、もう一度リンクをもらってください。" : error }}
    </p>
  </main>

  <template v-else>
    <StageHero :eyebrow="event ? formatDate(event.date) : ''" :kicker="event?.artist">
      <template #title>{{ event?.title ?? "読み込み中…" }}</template>
      <p v-if="event?.venue" class="mt-2.5 tracking-widest text-muted-foreground">{{ event.venue }}</p>
      <Button v-if="event" size="lg" class="mt-7 min-h-12 rounded-full px-6 font-bold" @click="shareOrCopy(shareUrl, title)">
        <Send class="size-4" /> みんなに送る
      </Button>
    </StageHero>

    <!-- コメント数と「全部ひらく」。スクロールしても上に残る -->
    <div class="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-2 text-sm">
        <span class="inline-flex items-center gap-1.5"><MessageCircle class="size-4 text-muted-foreground" aria-hidden="true" /><b class="text-lg text-primary">{{ total }}</b> 件のコメント</span>
        <Button variant="outline" class="min-h-11 rounded-full text-xs" @click="toggleAll">
          {{ expandAll ? "コメントを全部とじる" : "コメントを全部ひらく" }}
        </Button>
      </div>
    </div>

    <main v-if="event" class="mx-auto max-w-2xl px-4 pb-20 sm:px-5">
      <!-- 作った人だけに出る -->
      <Card v-if="comments.editKey.value" class="mt-8 gap-0 border-primary/50 bg-primary/12 py-0">
        <CardContent class="space-y-3 p-5">
          <template v-if="justCreated">
            <p class="font-serif text-xl font-extrabold">🎉 ページができました！</p>
            <p class="text-sm">LINE や X で、ファン仲間にリンクを送ってください。</p>
            <Button size="lg" class="min-h-12 w-full rounded-full font-bold" @click="shareOrCopy(shareUrl, title)">
              <Send class="size-4" /> みんなに送る
            </Button>
          </template>
          <p v-else class="text-sm">あなたが作ったページです。</p>
          <div class="flex flex-wrap gap-2.5">
            <Button as-child variant="secondary" size="lg" class="min-h-12 flex-[1_1_10rem] rounded-full">
              <RouterLink :to="`/e/${slug}/edit`"><Pencil class="size-4" /> セトリを編集</RouterLink>
            </Button>
            <Button variant="secondary" size="lg" class="min-h-12 flex-[1_1_10rem] rounded-full" @click="copyText(editUrl, '編集用リンクをコピーしました')">
              <KeyRound class="size-4" /> 編集用リンクをコピー
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            このスマホからは、いつでも編集できます。別のスマホやパソコンで編集したいときは、「編集用リンク」を自分あてにメモしておいてください。編集用リンクは人に送らないでください。
          </p>
        </CardContent>
      </Card>

      <Card class="mt-8 gap-0 py-0">
        <CardContent class="p-5 text-[0.92rem]">
          <h2 class="mb-2 font-bold text-primary">つかいかた</h2>
          <ol class="list-decimal space-y-1 pl-5">
            <li>曲や MC の右にある <span class="inline-flex translate-y-0.5 items-center rounded-full border bg-card px-2 py-0.5 text-muted-foreground"><MessageCircle class="size-3.5" aria-label="吹き出し" /></span> を押す</li>
            <li>ニックネームを入れて、思い出や感想を書く</li>
            <li><b>コメントする</b> を押したら完了。みんなのページにも出ます</li>
          </ol>
          <p class="mt-2.5 text-xs text-muted-foreground">登録はいりません。自分のコメントは、同じスマホ・同じブラウザからなら消せます。</p>
        </CardContent>
      </Card>

      <SectionTitle>ライブ全体の感想</SectionTitle>
      <CommentThread :target="GENERAL" />

      <SectionTitle>セトリ</SectionTitle>
      <SetlistTimeline :items="event.items" commentable />
      <p v-if="!commentables(event.items).length" class="py-4 text-sm text-muted-foreground">まだセトリが入っていません</p>

      <template v-if="orphans.length">
        <SectionTitle>その他のコメント</SectionTitle>
        <p class="mb-3 text-xs text-muted-foreground">セトリが編集されて、元の項目がなくなったコメントです。</p>
        <div class="overflow-hidden rounded-2xl border bg-card">
          <CommentItem v-for="c in orphans" :key="c.id" :comment="c" />
        </div>
      </template>

      <footer class="mt-24 border-t pt-8 text-center text-xs text-muted-foreground">
        <div class="mb-4 font-display text-3xl italic text-foreground">Thank you All</div>
        <p>ファンの記憶をもとにしたまとめです。MC の言葉はニュアンスで、正確な引用ではありません。</p>
        <p class="mt-3"><RouterLink to="/new" class="text-primary">自分が行ったライブのページを作る →</RouterLink></p>
      </footer>
    </main>
  </template>
</template>
