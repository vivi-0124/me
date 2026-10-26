// 動画を書き出す。引数なしなら全部、ID を渡せばその動画だけ（例: node tools/render.ts tcpip）
import { execFileSync } from "node:child_process";

const ids = process.argv.length > 2 ? process.argv.slice(2) : ["tcpip", "port", "https443", "portforward", "orca", "livecal"];
for (const id of ids) {
  execFileSync("npx", ["remotion", "render", "src/index.ts", id, `out/${id}.mp4`], { stdio: "inherit" });
}
