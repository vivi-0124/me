// AivisSpeech Engine（http://127.0.0.1:10101）でシーンごとのナレーションを生成し、長さを durations.json に書き出す
// 先にエンジンを起動しておく: ~/Applications/AivisSpeech-Engine/run
// 使い方: node tools/voice.ts <動画ID>（例: https443）
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Scene } from "../src/scene.ts";

const video = process.argv[2];
if (!video) throw new Error("動画IDを指定してください（例: node tools/voice.ts https443）");
const { scenes }: { scenes: Scene[] } = await import(`../src/videos/${video}/script.ts`);
mkdirSync(`public/audio/${video}`, { recursive: true });

const ENGINE = process.env.ENGINE ?? "http://127.0.0.1:10101";
const SPEAKER = process.env.SPEAKER ?? "888753763"; // まお（おちつき）
const SPEED = Number(process.env.SPEED ?? "1.1");

const durations: Record<string, number> = {};
for (const scene of scenes) {
  const q = new URLSearchParams({ text: scene.reading, speaker: SPEAKER });
  const queryRes = await fetch(`${ENGINE}/audio_query?${q}`, { method: "POST" });
  if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status} ${await queryRes.text()}`);
  const query = await queryRes.json();
  query.speedScale = SPEED;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.1;

  const synthRes = await fetch(`${ENGINE}/synthesis?speaker=${SPEAKER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`synthesis failed: ${synthRes.status} ${await synthRes.text()}`);
  const out = `public/audio/${video}/${scene.id}.wav`;
  writeFileSync(out, Buffer.from(await synthRes.arrayBuffer()));

  const info = execFileSync("afinfo", [out], { encoding: "utf8" });
  const seconds = Number(info.match(/estimated duration: ([\d.]+)/)?.[1]);
  durations[scene.id] = seconds;
  console.log(`${scene.id}: ${seconds.toFixed(2)}s`);
}
writeFileSync(`src/videos/${video}/durations.json`, JSON.stringify(durations, null, 2) + "\n");
console.log(`total: ${Object.values(durations).reduce((a, b) => a + b, 0).toFixed(2)}s`);
