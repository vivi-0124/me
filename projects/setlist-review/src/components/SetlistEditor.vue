<script setup lang="ts">
// セトリの入力欄。曲名を1行ずつ書くだけで、番号は自動。MC とアンコールはボタンで入れる
import { computed, nextTick, ref } from "vue";
import { ArrowDown, ArrowUp, ClipboardPaste, EllipsisVertical, Mic, Music, Sparkles, Trash2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { newRow, rowsFromText, type Row } from "@/lib/setlist-rows";

const rows = defineModel<Row[]>({ required: true });

/** 左に出す番号（01, 02, ... / en1, ...）と MC の見出し */
const labels = computed(() => {
  const out = new Map<number, string>();
  let encore = false;
  let main = 0;
  let en = 0;
  const mcs = rows.value.filter((r) => r.kind === "mc" && !(r.item?.kind === "mc" && r.item.lines.length));
  for (const r of rows.value) {
    if (r.kind === "encore") encore = true;
    else if (r.kind === "song") out.set(r.key, encore ? `en${++en}` : String(++main).padStart(2, "0"));
    else if (r.item?.kind === "mc" && r.item.lines.length) out.set(r.key, r.item.title);
    else out.set(r.key, mcs.length > 1 ? `MC ${mcs.indexOf(r) + 1}` : "MC");
  }
  return out;
});
const hasEncore = computed(() => rows.value.some((r) => r.kind === "encore"));

/* ---------- 入力欄へのフォーカス ---------- */

const inputs = new Map<number, HTMLInputElement>();
function setInput(key: number, el: unknown) {
  const input = (el as { $el?: HTMLInputElement } | null)?.$el;
  if (input) inputs.set(key, input);
  else inputs.delete(key);
}
async function focusRow(key: number, atEnd = false) {
  await nextTick();
  const el = inputs.get(key);
  if (!el) return;
  el.focus();
  if (atEnd) el.setSelectionRange(el.value.length, el.value.length);
}

/* ---------- 行の操作 ---------- */

function insertAt(index: number, ...added: Row[]) {
  const next = [...rows.value];
  next.splice(index, 0, ...added);
  rows.value = next;
}

function addBelow(index: number, kind: Row["kind"]) {
  const row = newRow(kind);
  insertAt(index + 1, row);
  if (kind === "song") focusRow(row.key);
}

/** いちばん下に足す。MC・アンコールのあとには空の曲を1行置いて、すぐ次の曲を書けるようにする */
function addAtEnd(kind: Row["kind"]) {
  if (kind === "song") {
    const row = newRow("song");
    insertAt(rows.value.length, row);
    return focusRow(row.key);
  }
  const last = rows.value.at(-1);
  if (last?.kind === "song" && !last.name.trim()) {
    // 最後が空の曲なら、その上に入れる（空の行が下に溜まらないように）
    insertAt(rows.value.length - 1, newRow(kind));
    return focusRow(last.key);
  }
  const song = newRow("song");
  insertAt(rows.value.length, newRow(kind), song);
  focusRow(song.key);
}

function remove(index: number) {
  const next = rows.value.filter((_, i) => i !== index);
  rows.value = next.length ? next : [newRow("song")];
}

function move(index: number, delta: -1 | 1) {
  const to = index + delta;
  if (to < 0 || to >= rows.value.length) return;
  const next = [...rows.value];
  [next[index], next[to]] = [next[to]!, next[index]!];
  rows.value = next;
}

/* ---------- キーボード ---------- */

function onEnter(e: KeyboardEvent, index: number) {
  // 日本語入力の変換を確定する Enter では動かない
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  addBelow(index, "song");
}

function onBackspace(e: KeyboardEvent, index: number, row: Row) {
  if (e.isComposing || row.name !== "" || rows.value.length === 1) return;
  e.preventDefault();
  const prevSong = rows.value.slice(0, index).findLast((r) => r.kind === "song");
  remove(index);
  if (prevSong) focusRow(prevSong.key, true);
}

/** 何行もまとめて貼られたら、1行ずつに分ける */
function onPaste(e: ClipboardEvent, index: number, row: Row) {
  const text = e.clipboardData?.getData("text") ?? "";
  if (!text.includes("\n")) return;
  e.preventDefault();
  const added = rowsFromText(text);
  if (!added.length) return;
  const next = [...rows.value];
  // 空の行に貼ったらその行と入れかえ、曲名が入っている行ならその下に足す
  if (row.name.trim()) next.splice(index + 1, 0, ...added);
  else next.splice(index, 1, ...added);
  rows.value = next;
}

/* ---------- まとめて貼る ---------- */

const bulkOpen = ref(false);
const bulkText = ref("");
function addBulk() {
  const added = rowsFromText(bulkText.value);
  if (!added.length) return;
  const kept = rows.value.filter((r) => r.kind !== "song" || r.name.trim());
  rows.value = [...kept, ...added];
  bulkText.value = "";
  bulkOpen.value = false;
}
</script>

<template>
  <div>
    <ol class="grid gap-2">
      <li v-for="(row, i) in rows" :key="row.key">
        <!-- 曲 -->
        <div v-if="row.kind === 'song'" class="grid grid-cols-[2.6rem_1fr_auto] items-center gap-1.5">
          <span
            class="text-center font-serif tabular-nums"
            :class="labels.get(row.key)!.startsWith('en') ? 'text-sm text-rose' : 'text-lg text-muted-foreground'"
            aria-hidden="true"
          >{{ labels.get(row.key) }}</span>
          <Input
            :ref="(el) => setInput(row.key, el)"
            v-model="row.name"
            :aria-label="`${labels.get(row.key)} 曲名`"
            placeholder="曲名"
            enterkeyhint="next"
            autocomplete="off"
            class="h-12 bg-card"
            @keydown.enter="onEnter($event, i)"
            @keydown.backspace="onBackspace($event, i, row)"
            @paste="onPaste($event, i, row)"
          />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="ghost" size="icon" class="size-11 rounded-full" :aria-label="`${labels.get(row.key)} のメニュー`">
                <EllipsisVertical class="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem class="min-h-11" @select="addBelow(i, 'song')"><Music /> 下に曲を入れる</DropdownMenuItem>
              <DropdownMenuItem class="min-h-11" @select="addBelow(i, 'mc')"><Mic /> 下に MC を入れる</DropdownMenuItem>
              <DropdownMenuItem v-if="!hasEncore" class="min-h-11" @select="addBelow(i, 'encore')"><Sparkles /> ここからアンコール</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="min-h-11" :disabled="i === 0" @select="move(i, -1)"><ArrowUp /> 上へ</DropdownMenuItem>
              <DropdownMenuItem class="min-h-11" :disabled="i === rows.length - 1" @select="move(i, 1)"><ArrowDown /> 下へ</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="min-h-11 text-destructive" @select="remove(i)"><Trash2 /> この曲を消す</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <!-- MC・アンコールの区切り -->
        <div
          v-else
          class="flex min-h-12 items-center justify-between gap-2 rounded-xl border pl-4"
          :class="row.kind === 'mc' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-rose/40 bg-rose/10 text-rose'"
        >
          <span class="flex items-center gap-2 text-sm font-bold tracking-[0.15em]">
            <template v-if="row.kind === 'mc'"><Mic class="size-4" /> {{ labels.get(row.key) }}</template>
            <template v-else><Sparkles class="size-4" /> ここからアンコール</template>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="ghost" size="icon" class="size-11 rounded-full" :aria-label="`${row.kind === 'mc' ? labels.get(row.key) : 'アンコール'} のメニュー`">
                <EllipsisVertical class="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem class="min-h-11" @select="addBelow(i, 'song')"><Music /> 下に曲を入れる</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="min-h-11" :disabled="i === 0" @select="move(i, -1)"><ArrowUp /> 上へ</DropdownMenuItem>
              <DropdownMenuItem class="min-h-11" :disabled="i === rows.length - 1" @select="move(i, 1)"><ArrowDown /> 下へ</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="min-h-11 text-destructive" @select="remove(i)">
                <Trash2 /> {{ row.kind === "mc" ? "この MC を消す" : "アンコールの区切りを消す" }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    </ol>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <Button type="button" variant="outline" class="min-h-12 rounded-full" @click="addAtEnd('song')"><Music /> 曲</Button>
      <Button type="button" variant="outline" class="min-h-12 rounded-full text-primary" @click="addAtEnd('mc')"><Mic /> MC</Button>
      <Button type="button" variant="outline" class="min-h-12 rounded-full text-rose" :disabled="hasEncore" @click="addAtEnd('encore')"><Sparkles /> アンコール</Button>
    </div>

    <div class="mt-4">
      <button type="button" class="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground underline" @click="bulkOpen = !bulkOpen">
        <ClipboardPaste class="size-4" /> X やメモのセトリをまとめて貼る
      </button>
      <div v-if="bulkOpen" class="mt-2 grid gap-2 rounded-xl border bg-card p-3">
        <Textarea v-model="bulkText" rows="8" aria-label="まとめて貼るセトリ" placeholder="1.曲名&#10;2.曲名&#10;MC&#10;3.曲名&#10;-encore-&#10;en1.曲名" class="bg-background" />
        <p class="text-xs text-muted-foreground">番号は付いていてもいなくても OK。「MC」「アンコール」と書いた行は、MC とアンコールの区切りになります。</p>
        <Button type="button" class="min-h-11 rounded-full font-bold" :disabled="!bulkText.trim()" @click="addBulk">セトリに入れる</Button>
      </div>
    </div>
  </div>
</template>
