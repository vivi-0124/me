#!/usr/bin/env node
// Raycast の Private Store を 1 コマンドで操作する。依存なし（Node だけで動く）
//
//   raycast/store.mjs list            公開中の拡張とコマンド枠の使用数を表示
//   raycast/store.mjs publish <名前>  projects/ の拡張を公開（新規も更新も同じ）
//   raycast/store.mjs delete <名前>   Store から削除（確認なし・元に戻せない）
//
// <名前> は projects/ のフォルダ名か package.json の name。delete は Store 上の name。
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ORG = "vivi-1610";
const API = "https://www.raycast.com/api/v1";
// 無料プランの上限。ray publish のエラーと揃える
const COMMAND_LIMIT = 5;
const PROJECTS = join(dirname(fileURLToPath(import.meta.url)), "..", "projects");

function fail(message) {
  console.error(`エラー: ${message}`);
  process.exit(1);
}

function raycastProjects() {
  return readdirSync(PROJECTS)
    .map((dir) => ({ dir: join(PROJECTS, dir), folder: dir, manifest: join(PROJECTS, dir, "package.json") }))
    .filter(({ manifest }) => existsSync(manifest))
    .map((project) => ({ ...project, pkg: JSON.parse(readFileSync(project.manifest, "utf8")) }))
    .filter(({ pkg }) => pkg.$schema?.includes("raycast.com"));
}

// ray token の出力に色やラベルが混ざるので、トークン部分だけを取り出す。トークンは表示しない
function token() {
  const project = raycastProjects().find(({ dir }) => existsSync(join(dir, "node_modules/.bin/ray")));
  if (!project) fail("ray CLI が見つかりません。どれかの拡張で npm install してください");
  const output = execFileSync(join(project.dir, "node_modules/.bin/ray"), ["token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).replace(/\x1b\[[0-9;]*m/g, "");
  const found = output.match(/Token:\s*(\S+)/)?.[1];
  if (!found) fail("トークンを取得できません。npx ray login でログインしてください");
  return found;
}

async function api(method, path, authToken) {
  const response = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${authToken}` } });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function list() {
  const { status, body } = await api("GET", `/organizations/${ORG}/extensions`, token());
  if (status !== 200) fail(`一覧を取得できません（HTTP ${status}）`);
  let used = 0;
  for (const extension of body.data) {
    const count = extension.commands?.length ?? 0;
    used += count;
    console.log(`${extension.name}  コマンド ${count}  ${extension.store_url}`);
  }
  console.log(`コマンド枠: ${used}/${COMMAND_LIMIT}`);
}

async function publish(name) {
  const project = raycastProjects().find(({ folder, pkg }) => folder === name || pkg.name === name);
  if (!project) fail(`projects/ に拡張「${name}」が見つかりません`);
  const run = (command, args) => spawnSync(command, args, { cwd: project.dir, stdio: "inherit" }).status;

  if (!existsSync(join(project.dir, "node_modules")) && run("npm", ["install", "--no-audit", "--no-fund"]) !== 0) {
    fail("npm install に失敗しました");
  }
  if (run("npx", ["--no-install", "ray", "publish", "-I"]) !== 0) {
    fail(`公開に失敗しました。枠が足りないなら list で確認し、delete で空けてください`);
  }

  const { status, body } = await api("GET", `/extensions/${project.pkg.owner}/${project.pkg.name}`, token());
  if (status !== 200 || body.status !== "active") fail(`公開後の確認に失敗しました（HTTP ${status}）`);
  console.log(`公開しました: ${body.store_url}`);
}

async function remove(name) {
  const authToken = token();
  const path = `/extensions/${ORG}/${name}`;
  const current = await api("GET", path, authToken);
  if (current.status === 404) fail(`${ORG} の Store に「${name}」はありません`);
  if (current.status !== 200) fail(`拡張を確認できません（HTTP ${current.status}）`);
  // 組織の Private Store 以外には触らない
  if (current.body.owner?.handle !== ORG || current.body.access !== "private") {
    fail(`「${name}」は ${ORG} の非公開拡張ではないので削除しません`);
  }

  const deleted = await api("DELETE", path, authToken);
  if (deleted.status !== 200) fail(`削除に失敗しました（HTTP ${deleted.status}）`);
  const after = await api("GET", path, authToken);
  if (after.status !== 404) fail(`削除後も「${name}」が残っています（HTTP ${after.status}）`);
  console.log(`削除しました: ${name}（コマンド ${current.body.commands?.length ?? 0} 個分の枠が空きました）`);
}

const [command, name] = process.argv.slice(2);
if (command === "list") await list();
else if (command === "publish" && name) await publish(name);
else if (command === "delete" && name) await remove(name);
else fail("使い方: raycast/store.mjs list | publish <名前> | delete <名前>");
