import { $, h, toast, timeAgo, colorFor, formatDate, shareOrCopy, copy, api } from "./dom.js";
import { renderTimeline } from "./render.js";
import { commentables } from "./parse.js";
import { store } from "./store.js";

const POLL_MS = 20_000;
const GENERAL = "general"; // ライブ全体への感想
const slug = location.pathname.split("/")[2];

let event;
/** target_id -> コメントの配列 */
let byTarget = new Map();
/** 画面にある項目の id（ここに無い id へのコメントは「その他」に出す） */
let knownTargets = new Set([GENERAL]);

/* ---------- 上の部分 ---------- */

function renderHero() {
  $("#hero-date").textContent = formatDate(event.date);
  $("#hero-artist").textContent = event.artist;
  $("#hero-title").textContent = event.title;
  $("#hero-venue").textContent = event.venue;
  document.title = `${[event.artist, event.title].filter(Boolean).join(" ")}｜みんなでセトリふりかえり`;
}

function renderOwnerTools() {
  const key = store.editKey(slug);
  const box = $("#owner");
  if (!key) return void (box.hidden = true);
  box.hidden = false;

  const created = new URLSearchParams(location.search).has("created");
  const editUrl = `${location.origin}/e/${slug}/edit#key=${key}`;
  box.replaceChildren(
    created && h("p", { class: "owner-done" }, "🎉 ページができました！"),
    h("p", { class: "owner-lead" }, created
      ? "LINE や X で、ファン仲間にリンクを送ってください。"
      : "あなたが作ったページです。"),
    created && h("button", {
      type: "button",
      class: "btn btn-primary btn-block owner-share",
      onclick: () => shareOrCopy(`${location.origin}/e/${slug}`, document.title),
    }, "📨 みんなに送る"),
    h("div", { class: "owner-actions" },
      h("a", { class: "btn", href: `/e/${slug}/edit` }, "✏️ セトリを編集"),
      h("button", { type: "button", class: "btn", onclick: () => copy(editUrl, "編集用リンクをコピーしました") }, "🔑 編集用リンクをコピー"),
    ),
    h("p", { class: "owner-note" },
      "このスマホからは、いつでも編集できます。別のスマホやパソコンで編集したいときは、「編集用リンク」を自分あてにメモしておいてください。編集用リンクは人に送らないでください。"),
  );
  if (created) history.replaceState(null, "", location.pathname);
}

/* ---------- コメント欄 ---------- */

/** 項目に 💬 ボタンとスレッド欄を付ける */
function attachThread(el, item, label) {
  const targetId = item.id;
  if (!targetId) return;
  knownTargets.add(targetId);
  el.dataset.target = targetId;
  const btn = h("button", {
    type: "button",
    class: "c-btn",
    "aria-expanded": "false",
    "aria-controls": `thread-${targetId}`,
    "aria-label": `${label}にコメント`,
    onclick: () => toggleThread(el),
  }, "💬", h("span", { class: "count" }));
  el.append(btn, h("div", { class: "thread", id: `thread-${targetId}`, hidden: true },
    h("div", { class: "list" }),
    renderForm(targetId),
  ));
}

function renderForm(targetId) {
  const error = h("div", { class: "form-error", role: "alert" });
  const nameInput = h("input", { type: "text", name: "author", maxlength: 30, placeholder: "例: みー", autocomplete: "nickname" });
  const nameField = h("label", { class: "name-field" }, "ニックネーム", nameInput);
  const asLine = h("div", { class: "as" });
  const body = h("textarea", {
    name: "body",
    maxlength: 1000,
    placeholder: targetId === GENERAL ? "ライブ全体の感想、思い出したことなど" : "思い出したこと、感想、ちがうかも？ と思ったことなど",
  });
  const submit = h("button", { type: "submit", class: "submit" }, "コメントする");

  const showName = (editing) => {
    nameField.hidden = !editing;
    asLine.hidden = editing;
    asLine.replaceChildren(
      `${store.name} として書きます　`,
      h("button", { type: "button", onclick: () => { nameInput.value = store.name; showName(true); nameInput.focus(); } }, "名前を変える"),
    );
  };

  const form = h("form", {
    class: "form",
    onsubmit: async (e) => {
      e.preventDefault();
      error.textContent = "";
      const author = (nameField.hidden ? store.name : nameInput.value).trim();
      if (!author) return void (error.textContent = "ニックネームを入れてください");
      if (!body.value.trim()) return void (error.textContent = "コメントを書いてください");

      submit.disabled = true;
      submit.textContent = "送信中…";
      try {
        const data = await api("/api/comments", {
          method: "POST",
          body: { event: slug, target: targetId, author, body: body.value, token: store.token },
        });
        store.name = author;
        body.value = "";
        addComment(data.comment);
        toast("コメントしました");
        document.querySelectorAll(".form").forEach((f) => f.dispatchEvent(new Event("namechange")));
      } catch (err) {
        error.textContent = err.message;
      } finally {
        submit.disabled = false;
        submit.textContent = "コメントする";
      }
    },
  }, nameField, asLine, body, error, h("div", { class: "form-actions" }, submit));

  form.addEventListener("namechange", () => showName(!store.name));
  showName(!store.name);
  return form;
}

function toggleThread(el, open) {
  const thread = $(".thread", el);
  const willOpen = open ?? thread.hidden;
  thread.hidden = !willOpen;
  el.classList.toggle("is-open", willOpen);
  $(".c-btn", el)?.setAttribute("aria-expanded", String(willOpen));
  if (willOpen && open === undefined) {
    // スマホでは開いただけでキーボードが出ると読みにくいので、見える位置まで送るだけにする
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const input = $(".name-field", el).hidden ? $("textarea", el) : $("input", el);
      input.focus({ preventScroll: true });
    }
    thread.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderThread(targetId) {
  const el = document.querySelector(`[data-target="${targetId}"]`);
  if (!el) return;
  const comments = byTarget.get(targetId) ?? [];

  const btn = $(".c-btn", el);
  if (btn) {
    $(".count", btn).textContent = comments.length || "";
    btn.classList.toggle("has", comments.length > 0);
  }
  $(".list", el).replaceChildren(
    ...(comments.length
      ? comments.map(renderComment)
      : [h("div", { class: "empty" }, targetId === GENERAL ? "まだ感想はありません。最初のひとことをどうぞ" : "まだコメントはありません。最初のひとことをどうぞ")]),
  );
}

function renderComment(c) {
  const editKey = store.editKey(slug);
  const canDelete = c.mine || editKey;
  const del = canDelete && h("button", {
    type: "button",
    class: "del",
    onclick: async (e) => {
      const b = e.currentTarget;
      // 誤タップ対策で、2回押したら消す
      if (!b.classList.contains("confirm")) {
        b.classList.add("confirm");
        b.textContent = "もう一度押すと消えます";
        setTimeout(() => { b.classList.remove("confirm"); b.textContent = "消す"; }, 4000);
        return;
      }
      try {
        await api(`/api/comments/${c.id}?token=${encodeURIComponent(store.token)}`, {
          method: "DELETE",
          headers: editKey ? { "x-edit-key": editKey } : {},
        });
        removeComment(c);
        toast("コメントを消しました");
      } catch (err) {
        toast(err.message);
      }
    },
  }, "消す");

  return h("div", { class: "comment" },
    h("div", { class: "avatar", style: `background:${colorFor(c.author)}`, "aria-hidden": "true" }, [...c.author][0]),
    h("div", {},
      h("div", { class: "comment-head" },
        h("b", {}, c.author),
        h("time", { datetime: c.created_at, title: new Date(c.created_at).toLocaleString("ja-JP") }, timeAgo(c.created_at)),
        del,
      ),
      h("div", { class: "comment-body" }, c.body),
    ),
  );
}

/** 編集で消えた項目へのコメントは、なくさずに一番下にまとめて出す */
function renderOrphans() {
  const orphans = [...byTarget].filter(([t, list]) => !knownTargets.has(t) && list.length);
  const box = $("#orphans");
  box.hidden = orphans.length === 0;
  $("#orphan-list").replaceChildren(...orphans.flatMap(([, list]) => list.map(renderComment)));
}

function addComment(c) {
  const list = byTarget.get(c.target_id) ?? [];
  if (!list.some((x) => x.id === c.id)) list.push(c);
  byTarget.set(c.target_id, list);
  renderThread(c.target_id);
  renderTotal();
}

function removeComment(c) {
  byTarget.set(c.target_id, (byTarget.get(c.target_id) ?? []).filter((x) => x.id !== c.id));
  renderThread(c.target_id);
  renderOrphans();
  renderTotal();
}

function renderTotal() {
  let n = 0;
  for (const list of byTarget.values()) n += list.length;
  $("#total").textContent = n;
}

async function loadComments() {
  try {
    const { comments } = await api(`/api/comments?event=${slug}&token=${encodeURIComponent(store.token)}`);
    const next = new Map();
    for (const c of comments) {
      if (!next.has(c.target_id)) next.set(c.target_id, []);
      next.get(c.target_id).push(c);
    }
    byTarget = next;
    // 全部まとめて描き直すと書きかけの入力欄が消えるので、リストだけ更新する
    for (const t of knownTargets) renderThread(t);
    renderOrphans();
    renderTotal();
  } catch {
    // 電波が切れているときは、次の読み込みでまた試す
  }
}

/* ---------- はじめる ---------- */

async function main() {
  try {
    ({ event } = await api(`/api/events/${slug}`));
  } catch (err) {
    $("#timeline").replaceChildren(h("p", { class: "load-error" }, err.message));
    return;
  }
  store.visit(event);
  renderHero();
  renderOwnerTools();

  // ライブ全体の感想
  const general = h("div", { class: "item general", "data-target": GENERAL },
    h("div", { class: "thread", id: `thread-${GENERAL}` }, h("div", { class: "list" }), renderForm(GENERAL)),
  );
  $("#general").append(general);

  $("#timeline").replaceChildren(renderTimeline(event.items, attachThread));
  if (commentables(event.items).length === 0) {
    $("#timeline").append(h("p", { class: "load-error" }, "まだセトリが入っていません"));
  }
  await loadComments();

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

$("#share").addEventListener("click", () => {
  shareOrCopy(`${location.origin}/e/${slug}`, document.title);
});

$("#open-all").addEventListener("click", (e) => {
  const items = [...document.querySelectorAll("#timeline [data-target]")];
  const withComments = items.filter((el) => (byTarget.get(el.dataset.target) ?? []).length > 0);
  const anyClosed = withComments.some((el) => $(".thread", el).hidden);
  withComments.forEach((el) => toggleThread(el, anyClosed));
  e.currentTarget.textContent = anyClosed ? "全部とじる" : "コメントを全部ひらく";
  if (!withComments.length) toast("曲や MC へのコメントはまだありません");
});

setInterval(() => { if (event && document.visibilityState === "visible") loadComments(); }, POLL_MS);
document.addEventListener("visibilitychange", () => { if (event && document.visibilityState === "visible") loadComments(); });

main();
