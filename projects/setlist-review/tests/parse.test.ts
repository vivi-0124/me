import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSetlist, commentables, ensureIds } from "../shared/parse.ts";
import { itemsFromRows, newRow, rowsFromItems } from "../src/lib/setlist-rows.ts";
import type { Mc, Song } from "../shared/types.ts";

const songs = (text: string) => parseSetlist(text).filter((i): i is Song => i.kind === "song");
const shape = (text: string) => parseSetlist(text).map((i) => (i.kind === "song" ? i.no : i.kind));

test("武道館のセトリを曲・MC・アンコールに分けられる", () => {
  const items = parseSetlist(readFileSync(new URL("../seed/budokan-2026-10-15.txt", import.meta.url), "utf8"));
  const s = items.filter((i): i is Song => i.kind === "song");
  assert.equal(s.length, 21);
  assert.deepEqual([s[0]!.no, s[0]!.name], ["01", "恋愛凡人は踊らない"]);
  assert.deepEqual(s.filter((x) => x.encore).map((x) => [x.no, x.name]), [["en1", "拝啓、最低な君へ"], ["en2", "殺文句"]]);
  assert.deepEqual(items.filter((i): i is Mc => i.kind === "mc").map((m) => m.title), ["MC 1", "MC 2", "MC 3"]);
  assert.equal(commentables(items).length, 24);
});

test("曲名だけでも、番号つきでも読める", () => {
  assert.deepEqual(songs("曲A\n2.曲B\n03) 曲C\n４．全角の曲\n・中黒の曲\n🎶音符の曲").map((s) => [s.no, s.name]), [
    ["01", "曲A"], ["02", "曲B"], ["03", "曲C"], ["04", "全角の曲"], ["05", "中黒の曲"], ["06", "音符の曲"],
  ]);
});

test("曲名に数字が入っていても、曲名のまま残す", () => {
  assert.deepEqual(songs("17才\n1/2\n22\n2:00 AM\n2.5次元").map((s) => s.name), ["17才", "1/2", "22", "2:00 AM", "2.5次元"]);
});

test("MC とアンコールの書き方いろいろ", () => {
  assert.deepEqual(shape("A\nMC\nB\n【MC】\nC\n-MC-\nD\nＭＣ①\nE\n#情とは 終わりMC\nF"), [
    "01", "mc", "02", "mc", "03", "mc", "04", "mc", "05", "mc", "06",
  ]);
  for (const mark of ["-encore-", "アンコール", "ENCORE", "【アンコール】", "Wアンコール"]) {
    assert.deepEqual(shape(`A\n${mark}\nB`), ["01", "encore", "en1"], mark);
  }
  // en1. と書いてあれば、そこにアンコールの区切りを入れる
  assert.deepEqual(shape("A\nen1.B\nW En. C"), ["01", "encore", "en1", "en2"]);
});

test("空行・矢印・続けて書いた MC は無視する", () => {
  assert.deepEqual(shape("A\n\n⬇️\nMC\nMC\n\nB\n-encore-\nアンコール\nC"), ["01", "mc", "02", "encore", "en1"]);
});

test("MC が1回だけなら「MC」、2回以上なら番号つき", () => {
  assert.equal((parseSetlist("A\nMC\nB")[1] as Mc).title, "MC");
});

test("編集画面で曲名を直したり並べかえたりしても、曲と MC の id は変わらない", () => {
  const before = ensureIds(parseSetlist("A\nB\nMC\nC"));
  const ids = Object.fromEntries(commentables(before).map((c) => ["name" in c ? c.name : "MC", c.id]));
  const rows = rowsFromItems(before);
  rows[1]!.name = "B（新アレンジ）"; // 曲名を直す
  rows.reverse(); // 並べかえる: C, MC, B, A
  rows.unshift(newRow("song", "新曲")); // 先頭に足す
  const after = itemsFromRows(rows);
  const byName = Object.fromEntries(commentables(after).map((c) => ["name" in c ? c.name : "MC", c.id]));
  assert.equal(byName["B（新アレンジ）"], ids.B);
  assert.equal(byName.A, ids.A);
  assert.equal(byName.MC, ids.MC);
  assert.ok(byName["新曲"] && !Object.values(ids).includes(byName["新曲"]));
  assert.deepEqual(after.map((i) => (i.kind === "song" ? i.no : i.kind)), ["01", "02", "mc", "03", "04"]);
});

test("曲名が空の行は保存しない。MC が続いたら1つにまとめる", () => {
  const rows = [newRow("song", "A"), newRow("song", "  "), newRow("mc"), newRow("mc"), newRow("song", "B")];
  assert.deepEqual(itemsFromRows(rows).map((i) => (i.kind === "song" ? i.name : i.kind)), ["A", "mc", "B"]);
});

test("前の形式（MC の中身・曲のメモつき）は、編集画面を通しても消えない", () => {
  const legacy = ensureIds([
    { kind: "song", no: "01", name: "A", notes: ["メモ"] },
    { kind: "mc", title: "MC ── A 終わり", lines: [{ text: "話1" }, { quotes: [{ who: "Vo", text: "「セリフ」" }] }] },
    { kind: "song", no: "02", name: "B" },
  ]);
  const after = itemsFromRows(rowsFromItems(legacy));
  assert.deepEqual(after, legacy);
});

test("番号は付け直す。アンコールより後の曲は en、前の曲は 01 から", async () => {
  const { numberItems } = await import("../shared/parse.ts");
  const items = numberItems([
    { kind: "song", no: "en9", name: "A", encore: true },
    { kind: "mc", title: "", lines: [] },
    { kind: "song", no: "", name: "B" },
    { kind: "encore" },
    { kind: "song", no: "03", name: "C" },
  ]);
  assert.deepEqual(items.map((i) => (i.kind === "song" ? [i.no, !!i.encore] : i.kind === "mc" ? i.title : i.kind)), [
    ["01", false], "MC", ["02", false], "encore", ["en1", true],
  ]);
});
