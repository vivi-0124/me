// ライブのページとコメントを読み書きする API と、ページの振り分け。
// 画面のファイル（public/）は Workers の静的アセットとして配信され、
// ファイルが無いパス（/new, /e/<slug>, /api/*）だけがここに来る。

const MAX_NAME = 30;
const MAX_BODY = 1000;
const MAX_FIELD = 100;
const MAX_SOURCE = 30_000;
const MAX_ITEMS_JSON = 200_000;
const ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})?$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    try {
      // ---- 画面 ----
      if (pathname === "/new") return page(env, request, "/edit");
      let m = pathname.match(/^\/e\/([a-z0-9-]+)\/edit$/);
      if (m) return page(env, request, "/edit");
      m = pathname.match(/^\/e\/([a-z0-9-]+)\/?$/);
      if (m) return eventPage(env, request, m[1]);

      // ---- API: ライブのページ ----
      if (pathname === "/api/events" && method === "POST") return await createEvent(request, env);
      m = pathname.match(/^\/api\/events\/([a-z0-9-]+)$/);
      if (m && method === "GET") return await getEvent(m[1], env);
      if (m && method === "PUT") return await updateEvent(m[1], request, env);

      // ---- API: コメント ----
      if (pathname === "/api/comments" && method === "GET") return await listComments(url, env);
      if (pathname === "/api/comments" && method === "POST") return await createComment(request, env);
      m = pathname.match(/^\/api\/comments\/(\d+)$/);
      if (m && method === "DELETE") return await deleteComment(Number(m[1]), request, env);

      if (pathname.startsWith("/api/")) return json({ error: "見つかりません" }, 404);
      return page(env, request, "/404", 404);
    } catch (err) {
      console.error(err);
      return json({ error: "サーバーでエラーが起きました。少し待ってからもう一度試してください" }, 500);
    }
  },
};

/* ---------- 画面 ---------- */

async function page(env, request, path, status = 200) {
  const res = await env.ASSETS.fetch(new Request(new URL(path, request.url), request));
  return status === 200 ? res : new Response(res.body, { status, headers: res.headers });
}

/** LINE や X に URL を貼ったとき、ライブ名が出るようにタイトルを差し込む */
async function eventPage(env, request, slug) {
  const event = await env.DB.prepare("SELECT artist, title, date, venue FROM events WHERE slug = ?").bind(slug).first();
  if (!event) return page(env, request, "/404", 404);

  const name = [event.artist, event.title].filter(Boolean).join(" ");
  const pageTitle = `${name}｜みんなでセトリふりかえり`;
  const desc = [event.date.replaceAll("-", "."), event.venue].filter(Boolean).join(" ") + " のセトリと MC に、ひとつずつコメントできます。";
  const res = await page(env, request, "/event");
  return new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(pageTitle) })
    .on('meta[name="description"], meta[property="og:description"]', { element: (el) => el.setAttribute("content", desc) })
    .on('meta[property="og:title"]', { element: (el) => el.setAttribute("content", pageTitle) })
    .transform(res);
}

/* ---------- ライブのページ ---------- */

function readEventInput(input) {
  const str = (v) => String(v ?? "").trim();
  const event = {
    artist: str(input.artist),
    title: str(input.title),
    date: str(input.date),
    venue: str(input.venue),
    source: String(input.source ?? ""),
    items: input.items,
  };
  if (!event.artist && !event.title) return { error: "アーティスト名か公演名を入れてください" };
  for (const k of ["artist", "title", "venue"]) {
    if (event[k].length > MAX_FIELD) return { error: `${MAX_FIELD}文字までにしてください` };
  }
  if (!DATE_PATTERN.test(event.date)) return { error: "日付の形がちがいます" };
  if (event.source.length > MAX_SOURCE) return { error: "セトリの文章が長すぎます" };
  if (!Array.isArray(event.items)) return { error: "セトリが読み取れませんでした" };
  event.items = JSON.stringify(event.items);
  if (event.items.length > MAX_ITEMS_JSON) return { error: "セトリが長すぎます" };
  return { event };
}

async function createEvent(request, env) {
  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "送られた内容が読めません" }, 400);
  const { event, error } = readEventInput(input);
  if (error) return json({ error }, 400);

  const editKey = randomToken(18);
  const hash = await sha256(editKey);
  for (let i = 0; i < 5; i++) {
    const slug = randomSlug(13);
    const { meta } = await env.DB.prepare(
      `INSERT OR IGNORE INTO events (slug, edit_key_hash, artist, title, date, venue, source, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(slug, hash, event.artist, event.title, event.date, event.venue, event.source, event.items)
      .run();
    if (meta.changes === 1) return json({ slug, editKey }, 201);
  }
  throw new Error("slug の生成に失敗しました");
}

async function getEvent(slug, env) {
  const row = await env.DB.prepare(
    "SELECT slug, artist, title, date, venue, source, items, created_at, updated_at FROM events WHERE slug = ?",
  )
    .bind(slug)
    .first();
  if (!row) return json({ error: "このページは見つかりません" }, 404);
  return json({ event: { ...row, items: JSON.parse(row.items) } });
}

async function updateEvent(slug, request, env) {
  if (!(await canEdit(slug, request, env))) return json({ error: "編集用リンクから開いてください" }, 403);
  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "送られた内容が読めません" }, 400);
  const { event, error } = readEventInput(input);
  if (error) return json({ error }, 400);

  await env.DB.prepare(
    `UPDATE events SET artist = ?, title = ?, date = ?, venue = ?, source = ?, items = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE slug = ?`,
  )
    .bind(event.artist, event.title, event.date, event.venue, event.source, event.items, slug)
    .run();
  return json({ ok: true });
}

async function canEdit(slug, request, env) {
  const key = request.headers.get("x-edit-key");
  if (!key) return false;
  const row = await env.DB.prepare("SELECT edit_key_hash FROM events WHERE slug = ?").bind(slug).first();
  return !!row && row.edit_key_hash === (await sha256(key));
}

/* ---------- コメント ---------- */

async function listComments(url, env) {
  const eventId = url.searchParams.get("event") ?? "";
  if (!ID_PATTERN.test(eventId)) return json({ error: "event が不正です" }, 400);

  const { results } = await env.DB.prepare(
    `SELECT id, target_id, author, body, created_at, owner_token
       FROM comments WHERE event_id = ? ORDER BY created_at, id`,
  )
    .bind(eventId)
    .all();

  // owner_token は返さず、「自分のコメントか」だけを返す
  const token = url.searchParams.get("token") ?? "";
  const comments = results.map(({ owner_token, ...c }) => ({
    ...c,
    mine: token !== "" && owner_token === token,
  }));
  return json({ comments });
}

async function createComment(request, env) {
  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "送られた内容が読めません" }, 400);

  const eventId = String(input.event ?? "");
  const targetId = String(input.target ?? "");
  const author = String(input.author ?? "").trim();
  const body = String(input.body ?? "").trim();
  const token = String(input.token ?? "");

  if (!ID_PATTERN.test(eventId) || !ID_PATTERN.test(targetId)) {
    return json({ error: "コメント先が不正です" }, 400);
  }
  if (!author || author.length > MAX_NAME) {
    return json({ error: `名前は1〜${MAX_NAME}文字で入れてください` }, 400);
  }
  if (!body || body.length > MAX_BODY) {
    return json({ error: `コメントは1〜${MAX_BODY}文字で入れてください` }, 400);
  }
  if (token.length < 16 || token.length > 64) {
    return json({ error: "ページを読み込み直してください" }, 400);
  }
  const exists = await env.DB.prepare("SELECT 1 FROM events WHERE slug = ?").bind(eventId).first();
  if (!exists) return json({ error: "このページは見つかりません" }, 404);

  const row = await env.DB.prepare(
    `INSERT INTO comments (event_id, target_id, author, body, owner_token)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, target_id, author, body, created_at`,
  )
    .bind(eventId, targetId, author, body, token)
    .first();

  return json({ comment: { ...row, mine: true } }, 201);
}

/** 書いた本人か、そのページを作った人（荒らし対策）だけが消せる */
async function deleteComment(id, request, env) {
  const comment = await env.DB.prepare("SELECT event_id, owner_token FROM comments WHERE id = ?").bind(id).first();
  if (!comment) return json({ ok: true });

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const allowed = (token !== "" && token === comment.owner_token) || (await canEdit(comment.event_id, request, env));
  if (!allowed) return json({ error: "消せるのは自分のコメントだけです" }, 403);

  await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/* ---------- 小物 ---------- */

// URL は「知っている人だけが見られる」前提なので、推測できない長さにする。
// 32 文字（256 の約数）から選ぶので偏りがなく、13 文字で 65 ビット
function randomSlug(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz234567";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => chars[b % 32]).join("");
}

/** 編集用の合言葉。18 バイト = 144 ビット */
function randomToken(bytes) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replaceAll("+", "-").replaceAll("/", "_");
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
