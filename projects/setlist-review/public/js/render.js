// セトリと MC の描画。ライブのページと、編集画面のプレビューで共通

import { h } from "./dom.js";

/**
 * @param items parseSetlist の結果
 * @param attach (el, item, label) => void  コメント欄を付ける。プレビューでは渡さない
 */
export function renderTimeline(items, attach) {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    if (item.kind === "block") frag.append(h("div", { class: "block-label" }, item.label ?? ""));
    else if (item.kind === "encore") frag.append(h("div", { class: "encore-label" }, "— encore —"));
    else if (item.kind === "song") frag.append(renderSong(item, attach));
    else if (item.kind === "mc") frag.append(renderMc(item, attach));
  }
  return frag;
}

function renderSong(song, attach) {
  const el = h("div", { class: `item song${song.encore ? " encore" : ""}` },
    h("div", { class: "song-main" },
      h("div", { class: "no" }, song.no),
      h("div", {},
        h("div", { class: "name" }, song.name, song.tag && h("span", { class: "tag" }, song.tag)),
        song.notes?.length > 0 && h("ul", { class: "notes" }, song.notes.map((n) => h("li", {}, n))),
      ),
    ),
  );
  attach?.(el, song, `${song.no}「${song.name}」`);
  return el;
}

function renderMc(mc, attach) {
  return h("div", { class: "mc" },
    h("h3", {}, mc.title),
    (mc.lines ?? []).map((line) => {
      const el = h("div", { class: `item mc-line${line.toSong ? " to-song" : ""}` },
        h("div", {},
          line.news && h("span", { class: "news" }, line.news),
          line.quotes?.map((q) => h("span", { class: "quote" }, h("span", { class: "who" }, q.who), q.text)),
          line.text && h("span", { class: "mc-text" }, line.text),
          line.subs?.map((s) => h("span", { class: "sub" }, s)),
        ),
      );
      const label = line.text ?? (line.quotes ?? []).map((q) => q.text).join(" ");
      attach?.(el, line, `MC「${label.slice(0, 24)}${label.length > 24 ? "…" : ""}」`);
      return el;
    }),
  );
}
