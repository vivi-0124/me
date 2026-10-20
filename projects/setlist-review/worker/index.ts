// ライブのページとコメントを読み書きする API（Hono）。
// 画面は Vue の SPA で、静的アセットとして配信される。
// Worker を通るのは /api/* と、タイトルを差し込む /e/* だけ（wrangler.jsonc の run_worker_first）。

import { Hono } from "hono";
import type { Context } from "hono";

type Env = { Bindings: { DB: D1Database; ASSETS: Fetcher } };
type Ctx = Context<Env>;

const MAX_NAME = 30;
const MAX_BODY = 1000;
const MAX_FIELD = 100;
const MAX_SOURCE = 30_000;
const MAX_ITEMS_JSON = 200_000;
const ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})?$/;
const GENERIC_DESC = "ライブのセトリと MC に、ひとつずつコメントできます。";

const app = new Hono<Env>();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "サーバーでエラーが起きました。少し待ってからもう一度試してください" }, 500);
});

/* ---------- 画面: LINE や X に貼ったとき、ライブ名が出るようにする ---------- */

app.get("/e/:slug{[a-z0-9-]+}", async (c) => {
  const event = await c.env.DB.prepare("SELECT artist, title, date, venue FROM events WHERE slug = ?")
    .bind(c.req.param("slug"))
    .first<{ artist: string; title: string; date: string; venue: string }>();
  const html = await spaShell(c);
  if (!event) return new Response(html.body, { status: 404, headers: html.headers });

  const name = [event.artist, event.title].filter(Boolean).join(" ");
  const title = `${name}｜みんなでセトリふりかえり`;
  const desc = [event.date.replaceAll("-", "."), event.venue].filter(Boolean).join(" ") + " のセトリと MC に、ひとつずつコメントできます。";
  return new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(title) })
    .on('meta[property="og:title"]', { element: (el) => void el.setAttribute("content", title) })
    .on('meta[name="description"], meta[property="og:description"]', { element: (el) => void el.setAttribute("content", desc) })
    .transform(html);
});

// 編集画面などは SPA のまま返す
app.get("/e/*", (c) => spaShell(c));

function spaShell(c: Ctx) {
  return c.env.ASSETS.fetch(new Request(new URL("/", c.req.url), c.req.raw));
}

/* ---------- API: ライブのページ ---------- */

const api = new Hono<Env>();

api.post("/events", async (c) => {
  const parsed = readEventInput(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);
  const e = parsed.event;

  const editKey = randomToken(18);
  const hash = await sha256(editKey);
  for (let i = 0; i < 5; i++) {
    const slug = randomSlug(13);
    const { meta } = await c.env.DB.prepare(
      `INSERT OR IGNORE INTO events (slug, edit_key_hash, artist, title, date, venue, source, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(slug, hash, e.artist, e.title, e.date, e.venue, e.source, e.items)
      .run();
    if (meta.changes === 1) return c.json({ slug, editKey }, 201);
  }
  throw new Error("slug の生成に失敗しました");
});

api.get("/events/:slug", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT slug, artist, title, date, venue, source, items, created_at, updated_at FROM events WHERE slug = ?",
  )
    .bind(c.req.param("slug"))
    .first<Record<string, string>>();
  if (!row) return c.json({ error: "このページは見つかりません" }, 404);
  return c.json({ event: { ...row, items: JSON.parse(row.items!) } });
});

api.put("/events/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!(await canEdit(c, slug))) return c.json({ error: "編集用リンクから開いてください" }, 403);
  const parsed = readEventInput(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);
  const e = parsed.event;

  await c.env.DB.prepare(
    `UPDATE events SET artist = ?, title = ?, date = ?, venue = ?, source = ?, items = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE slug = ?`,
  )
    .bind(e.artist, e.title, e.date, e.venue, e.source, e.items, slug)
    .run();
  return c.json({ ok: true });
});

function readEventInput(input: unknown) {
  if (!input || typeof input !== "object") return { error: "送られた内容が読めません" };
  const i = input as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? "").trim();
  const event = {
    artist: str(i.artist),
    title: str(i.title),
    date: str(i.date),
    venue: str(i.venue),
    source: String(i.source ?? ""),
    items: "",
  };
  if (!event.artist && !event.title) return { error: "アーティスト名か公演名を入れてください" };
  if ([event.artist, event.title, event.venue].some((v) => v.length > MAX_FIELD)) return { error: `${MAX_FIELD}文字までにしてください` };
  if (!DATE_PATTERN.test(event.date)) return { error: "日付の形がちがいます" };
  if (event.source.length > MAX_SOURCE) return { error: "セトリの文章が長すぎます" };
  if (!Array.isArray(i.items)) return { error: "セトリが読み取れませんでした" };
  event.items = JSON.stringify(i.items);
  if (event.items.length > MAX_ITEMS_JSON) return { error: "セトリが長すぎます" };
  return { event };
}

async function canEdit(c: Ctx, slug: string) {
  const key = c.req.header("x-edit-key");
  if (!key) return false;
  const row = await c.env.DB.prepare("SELECT edit_key_hash FROM events WHERE slug = ?").bind(slug).first<{ edit_key_hash: string }>();
  return !!row && row.edit_key_hash === (await sha256(key));
}

/* ---------- API: コメント ---------- */

api.get("/comments", async (c) => {
  const eventId = c.req.query("event") ?? "";
  if (!ID_PATTERN.test(eventId)) return c.json({ error: "event が不正です" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT id, target_id, author, body, created_at, owner_token
       FROM comments WHERE event_id = ? ORDER BY created_at, id`,
  )
    .bind(eventId)
    .all<{ id: number; target_id: string; author: string; body: string; created_at: string; owner_token: string }>();

  // owner_token は返さず、「自分のコメントか」だけを返す
  const token = c.req.query("token") ?? "";
  const comments = results.map(({ owner_token, ...rest }) => ({ ...rest, mine: token !== "" && owner_token === token }));
  return c.json({ comments });
});

api.post("/comments", async (c) => {
  const input = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return c.json({ error: "送られた内容が読めません" }, 400);

  const eventId = String(input.event ?? "");
  const targetId = String(input.target ?? "");
  const author = String(input.author ?? "").trim();
  const body = String(input.body ?? "").trim();
  const token = String(input.token ?? "");

  if (!ID_PATTERN.test(eventId) || !ID_PATTERN.test(targetId)) return c.json({ error: "コメント先が不正です" }, 400);
  if (!author || author.length > MAX_NAME) return c.json({ error: `名前は1〜${MAX_NAME}文字で入れてください` }, 400);
  if (!body || body.length > MAX_BODY) return c.json({ error: `コメントは1〜${MAX_BODY}文字で入れてください` }, 400);
  if (token.length < 16 || token.length > 64) return c.json({ error: "ページを読み込み直してください" }, 400);

  const exists = await c.env.DB.prepare("SELECT 1 FROM events WHERE slug = ?").bind(eventId).first();
  if (!exists) return c.json({ error: "このページは見つかりません" }, 404);

  const row = await c.env.DB.prepare(
    `INSERT INTO comments (event_id, target_id, author, body, owner_token)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, target_id, author, body, created_at`,
  )
    .bind(eventId, targetId, author, body, token)
    .first();
  return c.json({ comment: { ...row, mine: true } }, 201);
});

/** 書いた本人か、そのページを作った人（荒らし対策）だけが消せる */
api.delete("/comments/:id{[0-9]+}", async (c) => {
  const id = Number(c.req.param("id"));
  const comment = await c.env.DB.prepare("SELECT event_id, owner_token FROM comments WHERE id = ?")
    .bind(id)
    .first<{ event_id: string; owner_token: string }>();
  if (!comment) return c.json({ ok: true });

  const token = c.req.query("token") ?? "";
  const allowed = (token !== "" && token === comment.owner_token) || (await canEdit(c, comment.event_id));
  if (!allowed) return c.json({ error: "消せるのは自分のコメントだけです" }, 403);

  await c.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

api.all("*", (c) => c.json({ error: "見つかりません" }, 404));
app.route("/api", api);

export default app;

/* ---------- 小物 ---------- */

// URL は「知っている人だけが見られる」前提なので、推測できない長さにする。
// 32 文字（256 の約数）から選ぶので偏りがなく、13 文字で 65 ビット
function randomSlug(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz234567";
  return [...crypto.getRandomValues(new Uint8Array(length))].map((b) => chars[b % 32]).join("");
}

/** 編集用の合言葉 */
function randomToken(bytes: number) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replaceAll("+", "-").replaceAll("/", "_");
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
