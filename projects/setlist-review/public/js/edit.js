import { $, h, api, toast } from "./dom.js";
import { parseSetlist, assignIds, commentables } from "./parse.js";
import { renderTimeline } from "./render.js";
import { store } from "./store.js";

const SAMPLE = `1.オープニングの曲
2.2曲目
・イントロで歓声がすごかった

MC
メンバー紹介
ボーカル「今日は来てくれてありがとう」
(ここで泣いた)
🎶3曲目

3.3曲目
4.4曲目

-encore-
en1.アンコールの曲`;

const form = $("#form");
const source = $("#source");
const match = location.pathname.match(/^\/e\/([a-z0-9-]+)\/edit$/);
const slug = match?.[1];
let previousItems = [];
let editKey = null;

/* ---------- プレビュー ---------- */

let timer;
function updatePreview() {
  const items = parseSetlist(source.value);
  const songs = items.filter((i) => i.kind === "song").length;
  const mcs = items.filter((i) => i.kind === "mc").length;
  $("#summary").textContent = songs || mcs ? `曲 ${songs}・MC ${mcs}` : "";
  $("#preview").replaceChildren(
    items.length ? renderTimeline(items) : h("p", { class: "preview-empty" }, "セトリを書くと、ここに出ます"),
  );
  $("#sample").hidden = source.value.trim() !== "";
}
source.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(updatePreview, 250);
});
$("#sample").addEventListener("click", () => {
  source.value = SAMPLE;
  updatePreview();
  source.focus();
});

/* ---------- 編集のとき ---------- */

async function loadForEdit() {
  // 編集用リンク（#key=...）で来たら、このブラウザに覚える
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("key");
  if (fromHash) history.replaceState(null, "", location.pathname);
  editKey = fromHash ?? store.editKey(slug);

  $("#page-title").textContent = "セトリを編集";
  $("#page-lead").textContent = "直したら、いちばん下の「保存する」を押してください。曲や MC の文を書き直しても、ついているコメントはそのまま残ります。";
  $("#save").textContent = "保存する";
  $("#back").href = `/e/${slug}`;
  document.title = "セトリを編集｜みんなでセトリふりかえり";

  if (!editKey) {
    $("#page-lead").hidden = true;
    form.replaceChildren(h("p", { class: "load-error" }, "このページを編集するには、ページを作った人の「編集用リンク」から開いてください。"));
    return;
  }

  try {
    const { event } = await api(`/api/events/${slug}`);
    for (const k of ["artist", "title", "date", "venue", "source"]) form.elements[k].value = event[k];
    previousItems = event.items;
    if (fromHash) store.saveMine(slug, { editKey, artist: event.artist, title: event.title, date: event.date });
    updatePreview();
  } catch (err) {
    form.replaceChildren(h("p", { class: "load-error" }, err.message));
  }
}

/* ---------- 保存 ---------- */

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("#error");
  error.textContent = "";
  const data = Object.fromEntries(new FormData(form));
  const items = assignIds(parseSetlist(data.source), previousItems);

  if (!data.artist.trim() && !data.title.trim()) {
    error.textContent = "アーティスト名か公演名を入れてください";
    form.elements.artist.focus();
    return;
  }
  if (commentables(items).length === 0) {
    error.textContent = "セトリを1曲以上入れてください";
    source.focus();
    return;
  }

  const save = $("#save");
  const label = save.textContent;
  save.disabled = true;
  save.textContent = "保存中…";
  try {
    const info = { artist: data.artist.trim(), title: data.title.trim(), date: data.date };
    if (slug) {
      await api(`/api/events/${slug}`, { method: "PUT", body: { ...data, items }, headers: { "x-edit-key": editKey } });
      store.saveMine(slug, info);
      toast("保存しました");
      location.href = `/e/${slug}`;
    } else {
      const res = await api("/api/events", { method: "POST", body: { ...data, items } });
      store.saveMine(res.slug, { ...info, editKey: res.editKey });
      location.href = `/e/${res.slug}?created=1`;
    }
  } catch (err) {
    error.textContent = err.message;
    save.disabled = false;
    save.textContent = label;
  }
});

if (slug) loadForEdit();
else updatePreview();
