// このブラウザだけに覚えておくもの（ログインの代わり）

const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const store = {
  get name() { return localStorage.getItem("sr-name") ?? ""; },
  set name(v) { localStorage.setItem("sr-name", v); },

  // 自分のコメントを消すための合言葉。ブラウザごとに1つ
  get token() {
    let t = localStorage.getItem("sr-token");
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem("sr-token", t);
    }
    return t;
  },

  /** 自分が作ったページ: slug -> { editKey, artist, title, date } */
  get mine() { return read("sr-mine", {}); },
  saveMine(slug, info) { write("sr-mine", { ...this.mine, [slug]: { ...this.mine[slug], ...info } }); },
  editKey(slug) { return this.mine[slug]?.editKey ?? null; },

  /** 最近見たページ（新しい順、20件まで） */
  get recent() { return read("sr-recent", []); },
  visit(event) {
    const entry = { slug: event.slug, artist: event.artist, title: event.title, date: event.date };
    write("sr-recent", [entry, ...this.recent.filter((r) => r.slug !== event.slug)].slice(0, 20));
  },
};
