import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { Scene } from "./scene";
import { C, FONT, Pop } from "./parts";

export const FPS = 30;
const PAD = 0.25; // シーンの切れ目に入れる無音（秒）

export type Video = {
  id: string;
  label: string;
  title: () => ReactNode;
  scenes: Scene[];
  durations: Record<string, number>;
  visuals: Record<string, () => ReactNode>;
  // 縦に長い素材（スマホ画面の録画など）を置くシーン。絵の領域を下に広げ、字幕を下へずらす
  tallScenes?: string[];
};

export const sceneFrames = (video: Video) => video.scenes.map((s) => Math.ceil((video.durations[s.id] + PAD) * FPS));
export const totalFrames = (video: Video) => sceneFrames(video).reduce((a, b) => a + b, 0);

const Subtitle = ({ text, top }: { text: string; top: number }) => (
  <Pop style={{ position: "absolute", left: 60, right: 60, top }}>
    <div
      style={{
        background: "rgba(0,0,0,0.55)",
        borderRadius: 24,
        padding: "28px 32px",
        color: "#fff",
        fontSize: 46,
        fontWeight: 700,
        lineHeight: 1.45,
        textAlign: "center",
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  </Pop>
);

export const Short = ({ video }: { video: Video }) => {
  const frames = sceneFrames(video);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, color: C.sub, fontWeight: 700 }}>{video.label}</div>
        <div style={{ fontSize: 68, color: C.text, fontWeight: 900, marginTop: 8, lineHeight: 1.3 }}>{video.title()}</div>
      </div>
      {video.scenes.map((scene, i) => {
        const start = from;
        from += frames[i];
        const Visual = video.visuals[scene.id];
        const tall = video.tallScenes?.includes(scene.id);
        return (
          <Sequence key={scene.id} from={start} durationInFrames={frames[i]}>
            <Audio src={staticFile(`audio/${video.id}/${scene.id}.wav`)} />
            <AbsoluteFill
              style={{ top: 380, height: tall ? 1170 : 920, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}
            >
              <Visual />
            </AbsoluteFill>
            <Subtitle text={scene.text} top={tall ? 1580 : 1330} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
