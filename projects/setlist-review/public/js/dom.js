// 画面づくりの小物

export const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let toastTimer;
export function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = h("div", { id: "toast", class: "toast", role: "status", "aria-live": "polite" });
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

export function timeAgo(iso) {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return "たった今";
  if (sec < 3600) return `${Math.floor(sec / 60)}分前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}時間前`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
}

export function colorFor(name) {
  const palette = ["#f4c06a", "#f08aa0", "#8ec5ff", "#a8e6a1", "#d3a4ff", "#ffb38a"];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return palette[hash % palette.length];
}

/** 2026-10-15 → 2026.10.15 THU */
export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
  return `${iso.replaceAll("-", ".")} ${dow}`;
}

/** スマホなら共有メニュー、PC ならコピー */
export async function shareOrCopy(url, title) {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  await copy(url);
}

export async function copy(text, message = "リンクをコピーしました") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    prompt("このリンクをコピーしてください", text);
  }
}

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { ...(body && { "content-type": "application/json" }), ...headers },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error("電波がないみたいです。つながってからもう一度試してください");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "うまくいきませんでした"), { status: res.status });
  return data;
}
