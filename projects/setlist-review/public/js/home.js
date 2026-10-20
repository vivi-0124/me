import { $, h, formatDate } from "./dom.js";
import { store } from "./store.js";

function card(e, mine) {
  return h("li", {},
    h("a", { href: `/e/${e.slug}`, class: "event-card" },
      h("span", { class: "event-date" }, formatDate(e.date) || "日付なし"),
      h("span", { class: "event-artist" }, e.artist),
      h("b", {}, e.title || e.artist),
      mine && h("span", { class: "event-badge" }, "作った"),
    ),
  );
}

const mine = Object.entries(store.mine).map(([slug, info]) => ({ slug, ...info }));
if (mine.length) {
  $("#mine-box").hidden = false;
  $("#mine").replaceChildren(...mine.reverse().map((e) => card(e, true)));
}

const mineSlugs = new Set(mine.map((e) => e.slug));
const recent = store.recent.filter((e) => !mineSlugs.has(e.slug));
if (recent.length) {
  $("#recent-box").hidden = false;
  $("#recent").replaceChildren(...recent.map((e) => card(e, false)));
}
