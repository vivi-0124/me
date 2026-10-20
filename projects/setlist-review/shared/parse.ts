// 貼り付けられたセトリの文章を、ページに出す項目の配列に変える。
// 書くのは「曲名」と「MC・アンコールが入った場所」だけ。MC で何を話したかは、みんながコメントで書く。
// エンジニアでない人が X やメモ帳に書いた形をそのまま受け取れるよう、ゆるく読む。
//
//   恋愛凡人は踊らない     → 曲（番号は自動で振る）
//   1.もういいの？          → 曲（番号を書いてあっても OK）
//   MC                      → ここで MC
//   -encore-                → ここからアンコール
//   拝啓、最低な君へ        → アンコールの曲（en1, en2, ...）

import type { Commentable, Item, Mc } from "./types.ts";

// 曲名の前の番号（1. / 01) / en1. / W En. など）。番号のあとに区切りかスペースがあるときだけ外す。
// 「2:00 AM」「2.5次元」のように、区切りのすぐあとが数字なら曲名の一部とみなす
const NUMBER = /^((?:w\s*)?en\s*\d*|\d{1,3})(?:\s*(?:[)、]|[.:](?!\d))\s*|\s+)(?=\S)/iu;
const BULLET = /^(?:[🎶♪・\-*•]\s*)+/u;
const DECOR = "[\\-ー—―=~〜*_【】\\[\\]()（）\\s]*";
const ENCORE = new RegExp(`^${DECOR}(?:(?:w\\s*)?(?:encore|アンコール)|ダブルアンコール)${DECOR}$`, "iu");
const MC = new RegExp(`^${DECOR}(?:mc|トーク)\\s*[0-9①-⑳]*${DECOR}$`, "iu");
/** 「#情とは 終わりMC」のような書き方 */
const MC_TAIL = /^.{0,30}\s*mc$/iu;
/** 矢印だけの行など、意味のない行 */
const NOISE = /^[\s⬇️↓⇩⇓→・\-ー—―=~〜*_]*$/u;

export function parseSetlist(text: string): Item[] {
  const items: Item[] = [];

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    // 全角の数字・英字・記号を半角にして判定だけに使う（表示は元の文字のまま）
    const norm = line.normalize("NFKC");
    if (NOISE.test(norm)) continue;

    if (ENCORE.test(norm)) {
      // 続けて書かれたアンコールの印は1つにまとめる
      if (items.at(-1)?.kind !== "encore") items.push({ kind: "encore" });
      continue;
    }
    if (MC.test(norm) || MC_TAIL.test(norm)) {
      if (items.at(-1)?.kind !== "mc") items.push({ kind: "mc", title: "MC", lines: [] });
      continue;
    }

    const number = norm.match(NUMBER);
    const name = stripPrefix(line, number?.[0].length ?? 0);
    if (!name) continue;
    // 「en1.曲名」のようにアンコールの番号が書いてあれば、そこからアンコール
    if (/en/i.test(number?.[1] ?? "") && !items.some((i) => i.kind === "encore")) items.push({ kind: "encore" });
    items.push({ kind: "song", no: "", name });
  }
  return numberItems(items);
}

/**
 * 曲の番号（01, 02, ... / アンコールは en1, en2, ...）と MC の見出しを付け直す。
 * 使う人は曲名だけ書けばよいように、番号は全部ここで決める。
 */
export function numberItems(items: Item[]): Item[] {
  let encore = false;
  let main = 0;
  let en = 0;
  for (const i of items) {
    if (i.kind === "encore") encore = true;
    if (i.kind !== "song") continue;
    if (encore) Object.assign(i, { no: `en${++en}`, encore: true });
    else {
      i.no = String(++main).padStart(2, "0");
      delete i.encore;
    }
  }
  // MC が2回以上あるときは「MC 1」「MC 2」と番号を付ける（コメントの場所がわかるように）。
  // 前の形式の、中身つきの MC の見出しはそのまま
  const mcs = items.filter((i): i is Mc => i.kind === "mc" && i.lines.length === 0);
  mcs.forEach((m, n) => (m.title = mcs.length > 1 ? `MC ${n + 1}` : "MC"));
  return items;
}

/** id の無い項目（新しく足した曲・MC）に id を付ける */
export function ensureIds(items: Item[]): Item[] {
  const all = commentables(items);
  const used = new Set(all.map((c) => c.id).filter(Boolean));
  for (const c of all) {
    if (c.id) continue;
    do c.id = Math.random().toString(36).slice(2, 8); while (used.has(c.id));
    used.add(c.id);
  }
  return items;
}

/** 行の頭の番号と記号を外す。NFKC で長さが変わる文字があっても、元の文字のまま残す */
function stripPrefix(line: string, numberLength: number) {
  let rest = line;
  if (numberLength) {
    let n = 0;
    let i = 0;
    while (i < rest.length && n < numberLength) n += rest[i++]!.normalize("NFKC").length;
    rest = rest.slice(i);
  }
  return rest.replace(BULLET, "").trim();
}

/**
 * コメントを付けられる単位。曲と MC。
 * 前の形式（MC の中身を1行ずつ書いたページ）は、MC の各行に付ける。
 */
export function commentables(items: Item[]): Commentable[] {
  return items.flatMap((i) => {
    if (i.kind === "song") return [i];
    if (i.kind === "mc") return i.lines.length ? i.lines : [i];
    return [];
  });
}
