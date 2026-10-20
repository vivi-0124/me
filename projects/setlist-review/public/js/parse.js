// 貼り付けられたセトリの文章を、ページに出す項目の配列に変える。
// エンジニアでない人が X やメモ帳に書いた形をそのまま受け取れるよう、ゆるく読む。
//
//   1.恋愛凡人は踊らない        → 曲
//   ・照明がきれいだった        → 直前の曲へのメモ
//   （空行）                    → ブロックの区切り
//   #情とは 終わりMC / MC       → ここから MC
//   あきくん「〜」              → MC の中のセリフ
//   (〜) / → 〜 / 字下げ        → 直前の MC の補足
//   🎶ヨーソロー                → MC から曲へのつなぎ
//   -encore-                    → ここからアンコール
//   en1.拝啓、最低な君へ        → アンコールの曲

const SONG = /^(?:[🎶♪]\s*)?((?:w\s*)?en\s*\d*|\d{1,3})(?:\s*[.)、:]\s*|\s+)(\S.*)$/iu;
const ENCORE = /^[-ー—―=~〜*\s]*(?:encore|アンコール)[-ー—―=~〜*\s]*$/i;
const MC_HEAD = /^(?:[\[【(]\s*mc\s*[\]】)]|mc(?=$|[\s:\-—]))\s*[:\-—]?\s*(.*)$/iu;
const MC_TAIL = /^(.*?)\s*mc\s*$/iu;
const ARROW = /^(?:⬇️?|↓|⇩|⇓)$/u;
const BULLET = /^[・\-*•]\s*(.+)$/;
const SUB = /^(?:[(（](.+?)[)）]?|→\s*(.+))$/;
const TO_SONG = /^[🎶♪]\s*(.+)$/u;
const QUOTE = /^(.{1,15}?)\s*([｢「『].+[｣」』])$/;

export function parseSetlist(text) {
  const items = [];
  let mc = null;
  let lastSong = null;
  let gap = false;
  let encore = false;

  const closeMc = () => { mc = null; };
  const pushMcLine = (line) => {
    if (!mc) {
      mc = { kind: "mc", title: "MC", lines: [] };
      items.push(mc);
    }
    mc.lines.push(line);
    lastSong = null;
  };

  for (const raw of String(text).split(/\r?\n/)) {
    const indented = /^(?:\s{2,}|\t|　)/.test(raw);
    const line = raw.trim();
    // 全角の数字・英字・記号を半角にして判定だけに使う（表示は元の文字のまま）
    const norm = line.normalize("NFKC");

    if (!line) {
      gap = true;
      closeMc();
      continue;
    }
    if (ARROW.test(norm)) continue;

    if (ENCORE.test(norm)) {
      closeMc();
      items.push({ kind: "encore" });
      encore = true;
      gap = false;
      lastSong = null;
      continue;
    }

    const song = norm.match(SONG);
    if (song && !(mc && indented)) {
      closeMc();
      const label = song[1].replace(/\s+/g, "").toLowerCase();
      const isEncore = encore || label.includes("en");
      if (gap && items.some((i) => i.kind === "song") && items.at(-1)?.kind !== "encore") {
        items.push({ kind: "block" });
      }
      gap = false;
      const name = line.slice(line.length - song[2].length).trim();
      lastSong = {
        kind: "song",
        no: /^\d+$/.test(label) ? label.padStart(2, "0") : label.replace(/^wen/, "W En"),
        name,
        ...(isEncore && { encore: true }),
      };
      items.push(lastSong);
      continue;
    }
    gap = false;

    const head = norm.match(MC_HEAD);
    const tail = !head && norm.match(MC_TAIL);
    if (head || (tail && line.length <= 30)) {
      const title = (head ? head[1] : tail[1]).trim();
      mc = { kind: "mc", title: title ? `MC ── ${title}` : "MC", lines: [] };
      items.push(mc);
      lastSong = null;
      continue;
    }

    // 曲の直後のメモ
    const bullet = line.match(BULLET);
    if (lastSong && (bullet || indented || SUB.test(line))) {
      const note = bullet ? bullet[1] : (line.match(SUB)?.slice(1).find(Boolean) ?? line);
      (lastSong.notes ??= []).push(note.trim());
      continue;
    }

    // MC の補足
    const prev = mc?.lines.at(-1);
    const sub = line.match(SUB);
    if (prev && (indented || sub)) {
      (prev.subs ??= []).push((sub ? sub.slice(1).find(Boolean) : line).trim());
      continue;
    }

    const body = bullet ? bullet[1].trim() : line;
    const toSong = body.match(TO_SONG);
    if (toSong) {
      pushMcLine({ text: `そのまま「${toSong[1].trim()}」へ`, toSong: true });
      continue;
    }
    const quote = body.match(QUOTE);
    if (quote) {
      pushMcLine({ quotes: [{ who: quote[1].replace(/[:：]$/, "").trim(), text: quote[2] }] });
      continue;
    }
    pushMcLine({ text: body });
  }

  // 空の MC 見出しは消す
  const cleaned = items.filter((i) => i.kind !== "mc" || i.lines.length > 0);
  // ブロックが2つ以上あるときだけ「BLOCK n」の見出しを付ける
  if (cleaned.some((i) => i.kind === "block")) {
    let n = 1;
    cleaned.unshift({ kind: "block" });
    for (const i of cleaned) if (i.kind === "block") i.label = `BLOCK ${n++}`;
  }
  return cleaned;
}

/** 曲・MC の1行ずつ。コメントを付けられる単位 */
export function commentables(items) {
  return items.flatMap((i) => (i.kind === "song" ? [i] : i.kind === "mc" ? i.lines : []));
}

function keyOf(c) {
  return (c.name ?? c.text ?? c.quotes?.map((q) => q.who + q.text).join("") ?? "").normalize("NFKC").replace(/\s+/g, "");
}

/**
 * 項目に id を付ける。編集前の項目と同じ文の項目には同じ id を使い、
 * 書き直しただけの項目（同じ場所・同じ種類）にも前の id を引き継ぐ。
 * こうしないと、編集のたびにコメントの紐付けが外れてしまう。
 */
export function assignIds(items, previous = []) {
  const prev = commentables(previous).filter((c) => c.id);
  const used = new Set();
  const next = commentables(items);

  const byKey = new Map();
  for (const p of prev) {
    const k = keyOf(p);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(p);
  }
  // 1回目: 同じ文
  for (const c of next) {
    const hit = byKey.get(keyOf(c))?.find((p) => !used.has(p.id));
    if (hit) { c.id = hit.id; used.add(hit.id); }
  }
  // 2回目: 同じ場所の、文が変わった項目。
  // 「場所」は、すぐ上にある変わっていない項目からの距離で見る（上に曲を足してもずれない）
  const nextKeys = new Set(next.map(keyOf));
  const prevIndex = new Map(prev.map((p, i) => [p.id, i]));
  next.forEach((c, idx) => {
    if (c.id) return;
    let k = idx - 1;
    while (k >= 0 && !prevIndex.has(next[k].id)) k--;
    const p = prev[k >= 0 ? prevIndex.get(next[k].id) + (idx - k) : idx];
    if (p && !used.has(p.id) && !nextKeys.has(keyOf(p)) && ("name" in p) === ("name" in c)) {
      c.id = p.id;
      used.add(p.id);
    }
  });
  // 残りは新しい id
  for (const c of next) {
    if (!c.id) {
      do c.id = Math.random().toString(36).slice(2, 8); while (used.has(c.id));
      used.add(c.id);
    }
  }
  return items;
}
