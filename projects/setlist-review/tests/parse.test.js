import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSetlist, commentables, assignIds } from "../public/js/parse.js";

const budokan = readFileSync(new URL("../seed/budokan-2026-10-15.txt", import.meta.url), "utf8");

test("武道館のメモを曲・MC・アンコールに分けられる", () => {
  const items = parseSetlist(budokan);
  const songs = items.filter((i) => i.kind === "song");
  assert.equal(songs.length, 21);
  assert.deepEqual(songs.map((s) => s.no).slice(0, 3), ["01", "02", "03"]);
  assert.equal(songs[8].name, "#情とは");
  assert.equal(songs[16].name, "病んでるくらいがちょうどいいね");
  assert.deepEqual(songs.filter((s) => s.encore).map((s) => s.no), ["en1", "en2"]);
  assert.deepEqual(songs[1].notes, ["照明がとてもきれいだった", "YouTube LIVE で話していた話を思い出して泣きそうになった"]);

  const mcs = items.filter((i) => i.kind === "mc");
  assert.deepEqual(mcs.map((m) => m.title), ["MC ── #情とは 終わり", "MC ── 愛憎 終わり", "MC ── シェイプシフター 終わり"]);
  assert.equal(items.filter((i) => i.kind === "encore").length, 1);
  assert.equal(items[0].label, "BLOCK 1");
});

test("MC の中のセリフ・補足・曲へのつなぎ", () => {
  const [mc1, , mc3] = parseSetlist(budokan).filter((i) => i.kind === "mc");
  assert.equal(mc1.lines[2].subs[0], "狙っていたおばけのキーホルダーが一発で出た");
  assert.deepEqual(mc1.lines[5].quotes[0], { who: "あきくん", text: "｢俺が作る曲が、恋愛じゃなくたって同じ思いをしてる人に届いたらいいな。｣" });
  assert.deepEqual(mc1.lines.at(-1), { text: "そのまま「左耳にピアスをしない理由」へ", toSong: true });
  assert.equal(mc3.lines[0].subs.length, 2);
  assert.ok(!mc1.lines.some((l) => l.text?.includes("⬇")));
});

test("いろいろな書き方の曲番号を読める", () => {
  const items = parseSetlist("１．全角の曲\n2) かっこの曲\n03 スペースの曲\nEN1. 大文字アンコール\nW En. ダブルアンコール");
  assert.deepEqual(items.map((i) => [i.no, i.name]), [
    ["01", "全角の曲"], ["02", "かっこの曲"], ["03", "スペースの曲"], ["en1", "大文字アンコール"], ["W En", "ダブルアンコール"],
  ]);
});

test("曲番号っぽいけど曲ではない行は MC のまま", () => {
  const [mc] = parseSetlist("MC\n15歳でギターを始めた話\n11/19 柏でワンマン\nMCで泣いた");
  assert.deepEqual(mc.lines.map((l) => l.text), ["15歳でギターを始めた話", "11/19 柏でワンマン", "MCで泣いた"]);
});

test("編集しても、同じ曲・書き直した行のコメント先は変わらない", () => {
  const before = assignIds(parseSetlist("1.A\n2.B\nMC\n話その1\n話その2"));
  const [a, b, t1, t2] = commentables(before).map((c) => c.id);
  // 曲を1つ足して、MC の1行目を書き直した
  const after = assignIds(parseSetlist("1.新曲\n2.A\n3.B\nMC\n話その1（書き直し）\n話その2"), before);
  const ids = commentables(after).map((c) => c.id);
  assert.equal(ids[1], a);
  assert.equal(ids[2], b);
  assert.equal(ids[4], t2);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(![a, b, t2].includes(ids[0]));
  assert.equal(ids[3], t1);
});
