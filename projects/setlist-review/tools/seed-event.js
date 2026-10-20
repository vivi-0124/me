// テキストファイルからライブのページを作る SQL を出す（決まった slug で作りたいとき用）。
//   node tools/seed-event.js <slug> <セトリ.txt> <artist> <title> <date> <venue> > seed.sql
// 編集用の合言葉は標準エラーに出す。SQL には合言葉のハッシュだけが入る。
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { parseSetlist, assignIds } from "../public/js/parse.js";

const [slug, file, artist, title, date, venue] = process.argv.slice(2);
if (!slug || !file) {
  console.error("使い方: node tools/seed-event.js <slug> <file> <artist> <title> <date> <venue>");
  process.exit(1);
}
const source = readFileSync(file, "utf8");
const items = assignIds(parseSetlist(source));
const editKey = randomBytes(18).toString("base64url");
const hash = createHash("sha256").update(editKey).digest("hex");
const q = (v) => `'${String(v ?? "").replaceAll("'", "''")}'`;

console.log(
  `INSERT INTO events (slug, edit_key_hash, artist, title, date, venue, source, items) VALUES (${[
    slug, hash, artist, title, date, venue, source, JSON.stringify(items),
  ].map(q).join(", ")});`,
);
console.error(`編集用の合言葉: ${editKey}`);
