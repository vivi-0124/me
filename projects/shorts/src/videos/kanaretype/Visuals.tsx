import type { ReactNode } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { ArrowDown, Box, C, Pop, Row, Tag, useGrow } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const CORAL = "#ff6f7d";
const RED = "#ff6b6b";
const MONO = '"SF Mono", Menlo, monospace';

const ROMAJI = "kakutyoukinou";
const KANA = "かくちょうきのう";
const KANJI = "拡張機能";
const ICON = staticFile("images/kanaretype-icon.png");

// delay フレームから perChar フレームごとに 1 文字ずつ増える文字数
const useTyped = (length: number, delay: number, perChar = 4) => {
  const frame = useCurrentFrame();
  return Math.max(0, Math.min(length, Math.floor((frame - delay) / perChar)));
};

const Caret = () => {
  const frame = useCurrentFrame();
  return <span style={{ width: 5, height: 80, background: "#1d1d1f", opacity: frame % 30 < 18 ? 1 : 0 }} />;
};

// 入力ソースの表示（メニューバーのアイコンを真似たもの）
const ModeBadge = ({ mode }: { mode: "A" | "あ" }) => (
  <div
    style={{
      width: 52,
      height: 44,
      borderRadius: 10,
      background: mode === "あ" ? CORAL : "#3a3a3c",
      color: "#fff",
      fontSize: 30,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {mode}
  </div>
);

// macOS のテキストエディタ風のウィンドウ
const Editor = ({ mode, children, below }: { mode: "A" | "あ"; children: ReactNode; below?: ReactNode }) => (
  <div style={{ width: 920, background: "#f7f7f5", borderRadius: 28, boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
    <div style={{ height: 68, background: "#e4e4e1", borderRadius: "28px 28px 0 0", display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 22, height: 22, borderRadius: 11, background: c }} />
      ))}
      <div style={{ flex: 1, textAlign: "center", fontSize: 28, color: "#6e6e73", fontWeight: 700 }}>メモ</div>
      <ModeBadge mode={mode} />
    </div>
    <div style={{ padding: "60px 52px", minHeight: 220, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", height: 100, fontSize: 76, color: "#1d1d1f", fontWeight: 600 }}>
        {children}
      </div>
      {below}
    </div>
  </div>
);

const Selected = ({ children }: { children: ReactNode }) => (
  <span style={{ background: "#b3d7ff", borderRadius: 6 }}>{children}</span>
);

// 未確定（入力中）の文字。thick は変換中の文節
const Marked = ({ children, thick = false }: { children: ReactNode; thick?: boolean }) => (
  <span style={{ borderBottom: `${thick ? 8 : 4}px solid #1d1d1f`, lineHeight: 1.15 }}>{children}</span>
);

const Key = ({ label, at, wide = false }: { label: string; at: number; wide?: boolean }) => {
  const frame = useCurrentFrame();
  const down = frame >= at && frame < at + 8;
  return (
    <div
      style={{
        minWidth: wide ? 260 : 120,
        textAlign: "center",
        background: down ? CORAL : "#f2f4fa",
        color: down ? "#fff" : "#1d1d1f",
        borderRadius: 20,
        padding: "18px 30px",
        fontSize: 52,
        fontWeight: 800,
        boxShadow: down ? "0 2px 0 #9aa6c4" : "0 10px 0 #9aa6c4",
        transform: `translateY(${down ? 8 : 0}px)`,
      }}
    >
      {label}
    </div>
  );
};

const Hook = () => {
  const typed = useTyped(ROMAJI.length, 15);
  return (
    <>
      <Pop>
        <Editor mode="A">
          {ROMAJI.slice(0, typed)}
          <Caret />
        </Editor>
      </Pop>
      <Pop delay={100}>
        <div style={{ fontSize: 60, fontWeight: 900, color: CORAL }}>😩 ローマ字のまま…</div>
      </Pop>
    </>
  );
};

const Pain = () => {
  const frame = useCurrentFrame();
  // 110 フレーム目から 3 フレームごとに 1 文字ずつ消える
  const left = ROMAJI.length - useTyped(ROMAJI.length, 110, 3);
  return (
    <>
      <Editor mode={frame >= 20 ? "あ" : "A"}>
        {ROMAJI.slice(0, left)}
        <Caret />
      </Editor>
      <Row gap={30}>
        <Pop delay={5}>
          <Key label="かな" at={20} />
        </Pop>
        <Pop delay={5}>
          <Key label="かな" at={35} />
        </Pop>
        <Pop delay={55}>
          <div style={{ fontSize: 56, fontWeight: 900, color: RED }}>✕ 変換されない</div>
        </Pop>
      </Row>
      <Pop delay={150}>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.sub }}>⌫ 全部消して打ち直し…</div>
      </Pop>
    </>
  );
};

const What = () => (
  <>
    <Pop>
      <Img src={ICON} style={{ width: 340, height: 340 }} />
    </Pop>
    <Pop delay={15}>
      <div style={{ fontSize: 120, fontWeight: 900, color: C.text, letterSpacing: 2 }}>
        Kana <span style={{ color: CORAL }}>Retype</span>
      </div>
    </Pop>
    <Row gap={16}>
      {["Raycast 拡張機能", "英数 → かな"].map((t, i) => (
        <Pop key={t} delay={50 + i * 12}>
          <div style={{ fontSize: 40, whiteSpace: "nowrap" }}>
            <Tag color={C.domain}>{t}</Tag>
          </div>
        </Pop>
      ))}
    </Row>
  </>
);

const How = () => {
  // ドラッグで選択範囲が伸びていく
  const selected = useTyped(ROMAJI.length, 10, 2);
  return (
    <>
      <Editor mode="A">
        <Selected>{ROMAJI.slice(0, selected)}</Selected>
        {ROMAJI.slice(selected)}
      </Editor>
      <Pop delay={50}>
        <Row gap={20}>
          <Key label="⌥" at={95} />
          <Key label="⌘" at={95} />
          <Key label="K" at={95} />
        </Row>
      </Pop>
      <Pop delay={60}>
        <div style={{ fontSize: 34, color: C.sub, fontWeight: 700 }}>※ ショートカットは好きなキーを割り当てる</div>
      </Pop>
    </>
  );
};

// かなで打ち直す → スペースで変換 → Return で確定
const Result = () => {
  const frame = useCurrentFrame();
  const typed = useTyped(KANA.length, 5, 5);
  const converting = frame >= 105;
  const committed = frame >= 185;
  const candidates = [KANJI, "拡張", KANA];
  const text = committed ? KANJI : converting ? <Marked thick>{KANJI}</Marked> : <Marked>{KANA.slice(0, typed)}</Marked>;
  return (
    <>
      <Editor
        mode="あ"
        below={
          converting &&
          !committed && (
            <div
              style={{
                position: "absolute",
                left: 52,
                top: 190,
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                padding: 10,
                fontSize: 40,
                color: "#1d1d1f",
                zIndex: 1,
              }}
            >
              {candidates.map((c, i) => (
                <div key={c} style={{ padding: "6px 18px", borderRadius: 8, background: i === 0 ? "#2f7bf6" : "transparent", color: i === 0 ? "#fff" : "#1d1d1f" }}>
                  {i + 1}　{c}
                </div>
              ))}
            </div>
          )
        }
      >
        {text}
        <Caret />
      </Editor>
      <div style={{ height: 190 }} />
      <Row gap={30}>
        <Pop delay={70}>
          <Key label="space" at={100} wide />
        </Pop>
        <Pop delay={150}>
          <Key label="return" at={180} wide />
        </Pop>
      </Row>
      <Pop delay={195}>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.domain }}>✓ 消さずに変換できた</div>
      </Pop>
    </>
  );
};

const steps = [
  { icon: "📋", label: "選択中の文字を取る", code: "getSelectedText()", color: C.ip },
  { icon: "⌨️", label: "かなキーを押す", code: "key code 104", color: CORAL },
  { icon: "🔁", label: "同じキーを送り直す", code: `keystroke "${ROMAJI}"`, color: C.domain },
];

const Inside = () => {
  const arrows = [useGrow(35), useGrow(85)];
  return (
    <>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Pop delay={i * 50}>
            <Box color={s.color} style={{ width: 860, padding: "22px 32px" }}>
              <div style={{ fontSize: 46 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: 34, color: s.color, fontFamily: MONO, marginTop: 8 }}>{s.code}</div>
            </Box>
          </Pop>
          {i < arrows.length && <ArrowDown progress={arrows[i]} height={70} />}
        </div>
      ))}
    </>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const liked = frame > 50;
  const reposted = frame > 90;
  const Button = ({ on, color, icon, label }: { on: boolean; color: string; icon: string; label: string }) => (
    <div
      style={{
        border: `5px solid ${color}`,
        background: on ? color : "transparent",
        color: on ? C.bg : color,
        borderRadius: 999,
        padding: "18px 38px",
        fontSize: 48,
        fontWeight: 900,
        transform: `scale(${on ? 1.08 : 1})`,
      }}
    >
      {icon} {label}
    </div>
  );
  const iconSpin = interpolate(frame, [0, 20], [-20, 0], { extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <Row gap={30}>
          <Img src={ICON} style={{ width: 170, height: 170, transform: `rotate(${iconSpin}deg)` }} />
          <div style={{ fontSize: 100, fontWeight: 900, color: C.text }}>
            Kana <span style={{ color: CORAL }}>Retype</span>
          </div>
        </Row>
      </Pop>
      <Row gap={30}>
        <Pop delay={25}>
          <Button on={liked} color={CORAL} icon="♥" label="いいね" />
        </Pop>
        <Pop delay={35}>
          <Button on={reposted} color={C.domain} icon="🔁" label="リポスト" />
        </Pop>
      </Row>
      <Pop delay={110}>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.text }}>で応援してね！</div>
      </Pop>
    </>
  );
};

const visuals = {
  hook: Hook,
  pain: Pain,
  what: What,
  how: How,
  result: Result,
  inside: Inside,
  outro: Outro,
};

export const kanaretype: Video = {
  id: "kanaretype",
  label: "自作 Raycast 拡張機能",
  title: () => (
    <>
      英数で打った文字を
      <br />
      <span style={{ color: CORAL }}>かな</span>で打ち直す
    </>
  ),
  scenes,
  durations,
  visuals,
  credit: "VOICEVOX:ずんだもん",
};
