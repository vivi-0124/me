<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useTitle } from "@vueuse/core";
import { toast } from "vue-sonner";
import type { EventInfo } from "@shared/types";
import { commentables } from "@shared/parse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TopNav from "@/components/TopNav.vue";
import SetlistEditor from "@/components/SetlistEditor.vue";
import { api } from "@/lib/api";
import { itemsFromRows, newRow, rowsFromItems, sourceFromItems, type Row } from "@/lib/setlist-rows";
import { editKeyFor, saveMine } from "@/lib/store";

const props = defineProps<{ slug?: string }>();
const router = useRouter();
const isEdit = computed(() => !!props.slug);
useTitle(computed(() => `${isEdit.value ? "セトリを編集" : "ページを作る"}｜みんなでセトリふりかえり`));

const form = reactive({ artist: "", title: "", date: "", venue: "" });
const rows = ref<Row[]>([newRow("song")]);
const editKey = ref<string | null>(null);
const blocked = ref(false);
const loadError = ref("");
const saving = ref(false);
const error = ref("");

onMounted(async () => {
  if (!props.slug) return;
  // 編集用リンク（#key=...）で来たら、このブラウザに覚える
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("key");
  if (fromHash) history.replaceState(history.state, "", location.pathname);
  editKey.value = fromHash ?? editKeyFor(props.slug);
  if (!editKey.value) return void (blocked.value = true);

  try {
    const { event } = await api<{ event: EventInfo }>(`/api/events/${props.slug}`);
    Object.assign(form, { artist: event.artist, title: event.title, date: event.date, venue: event.venue });
    rows.value = rowsFromItems(event.items);
    if (!rows.value.length) rows.value = [newRow("song")];
    if (fromHash) saveMine(props.slug, { editKey: fromHash, artist: event.artist, title: event.title, date: event.date });
  } catch (err) {
    loadError.value = (err as Error).message;
  }
});

function blockEnterSubmit(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return;
  if ((e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
}

async function save() {
  error.value = "";
  if (!form.artist.trim() && !form.title.trim()) {
    error.value = "アーティスト名か公演名を入れてください";
    document.getElementById("artist")?.focus();
    return;
  }
  // 曲の id は行が持っているので、曲名を直してもコメントはそのまま
  const items = itemsFromRows(rows.value);
  if (!commentables(items).some((c) => "name" in c)) {
    error.value = "曲名を1曲以上入れてください";
    return;
  }

  saving.value = true;
  const body = { ...form, source: sourceFromItems(items), items };
  const info = { artist: form.artist.trim(), title: form.title.trim(), date: form.date };
  try {
    if (props.slug) {
      await api(`/api/events/${props.slug}`, { method: "PUT", body, headers: { "x-edit-key": editKey.value! } });
      saveMine(props.slug, info);
      toast.success("保存しました");
      router.push(`/e/${props.slug}`);
    } else {
      const res = await api<{ slug: string; editKey: string }>("/api/events", { method: "POST", body });
      saveMine(res.slug, { ...info, editKey: res.editKey });
      router.push({ path: `/e/${res.slug}`, query: { created: "1" } });
    }
  } catch (err) {
    error.value = (err as Error).message;
    saving.value = false;
  }
}
</script>

<template>
  <TopNav :to="slug ? `/e/${slug}` : '/'" label="もどる" />

  <main class="mx-auto max-w-2xl px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-16 sm:px-5">
    <h1 class="font-serif text-2xl leading-snug">{{ isEdit ? "セトリを編集" : "ふりかえりページを作る" }}</h1>

    <p v-if="blocked" class="mt-6 text-sm text-destructive">
      このページを編集するには、ページを作った人の「編集用リンク」から開いてください。
    </p>
    <p v-else-if="loadError" class="mt-6 text-sm text-destructive">{{ loadError }}</p>

    <template v-else>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ isEdit
          ? "直したら、いちばん下の「保存する」を押してください。曲名を直したり、曲や MC を足したり並べかえたりしても、ついているコメントはそのまま残ります。"
          : "曲名を書いて、MC とアンコールの場所をボタンで入れるだけで、みんなが曲や MC ごとにコメントできるページができます。" }}
      </p>

      <!-- 入力欄で改行キーを押しても、ページを作ってしまわないようにする（保存は下のボタンだけ） -->
      <form id="event-form" novalidate class="mt-6 grid gap-4" @submit.prevent="save" @keydown.enter="blockEnterSubmit">
        <div class="grid gap-1.5">
          <Label for="artist" class="text-muted-foreground">アーティスト名</Label>
          <Input id="artist" v-model="form.artist" maxlength="100" placeholder="例: This is LAST" autocomplete="off" class="h-12 bg-card" />
        </div>
        <div class="grid gap-1.5">
          <Label for="title" class="text-muted-foreground">公演名・ツアー名</Label>
          <Input id="title" v-model="form.title" maxlength="100" placeholder='例: 日本武道館 "通過点"' autocomplete="off" class="h-12 bg-card" />
        </div>
        <div class="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <div class="grid gap-1.5">
            <Label for="date" class="text-muted-foreground">日付</Label>
            <Input id="date" v-model="form.date" type="date" class="h-12 bg-card [color-scheme:dark]" />
          </div>
          <div class="grid gap-1.5">
            <Label for="venue" class="text-muted-foreground">会場</Label>
            <Input id="venue" v-model="form.venue" maxlength="100" placeholder="例: 日本武道館" autocomplete="off" class="h-12 bg-card" />
          </div>
        </div>

        <fieldset class="mt-2 grid gap-2">
          <legend class="mb-2 text-sm font-medium text-muted-foreground">セトリ</legend>
          <p class="mb-1 text-xs text-muted-foreground">
            曲名を書くだけで OK。番号は自動で付きます。改行キーで次の曲へ。MC とアンコールは下のボタンか「︙」から入れられます。
          </p>
          <SetlistEditor v-model="rows" />
        </fieldset>
      </form>

      <p v-if="error" role="alert" class="mt-6 text-sm text-destructive">{{ error }}</p>

      <!-- 上から順に書いて、最後に押す。下に固定するとセトリの入力欄やボタンが隠れるので固定しない -->
      <Button type="submit" form="event-form" size="lg" class="mt-8 flex min-h-12 w-full rounded-full font-bold" :disabled="saving">
        {{ saving ? "保存中…" : isEdit ? "保存する" : "ページを作る" }}
      </Button>
    </template>
  </main>
</template>
