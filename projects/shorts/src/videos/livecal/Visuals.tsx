import { interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FPS, type Video } from "../../Short";
import { Box, C, Pop, Row, Tag } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const PINK = "#ff7eb6";
const RED = "#ff6b6b";

// 冒頭で公式サイトを巡回するアーティスト
const artists = [
  { name: "This is LAST", color: PINK },
  { name: "Saucy Dog", color: C.ip },
  { name: "Blue Mash", color: C.domain },
];

const Hook = () => {
  const frame = useCurrentFrame();
  const miss = interpolate(frame, [130, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {artists.map((a, i) => (
        <Pop key={a.name} delay={i * 15}>
          <Box color={C.line} style={{ width: 760, fontSize: 40, display: "flex", justifyContent: "space-between" }}>
            <span>🌐 {a.name} 公式</span>
            <span style={{ color: C.sub }}>{i === 2 ? "未確認…" : "確認済"}</span>
          </Box>
        </Pop>
      ))}
      <div style={{ fontSize: 64, fontWeight: 900, color: RED, opacity: miss, transform: `scale(${0.6 + miss * 0.4})` }}>
        😱 チケット発売、終わってた
      </div>
    </>
  );
};

const What = () => (
  <>
    <Pop>
      <div style={{ fontSize: 170, fontWeight: 900, color: C.text, letterSpacing: 4 }}>
        Live<span style={{ color: PINK }}>Cal</span>
      </div>
    </Pop>
    <Pop delay={40}>
      <div style={{ fontSize: 150 }}>🎸 → 📅</div>
    </Pop>
    <Row gap={14}>
      {["自動収集", "AIで整理", "🚧 開発中"].map((t, i) => (
        <Pop key={t} delay={100 + i * 12}>
          <div style={{ fontSize: 36, whiteSpace: "nowrap" }}>
            <Tag color={C.domain}>{t}</Tag>
          </div>
        </Pop>
      ))}
    </Row>
  </>
);

// 本番アプリ（未ログイン）を Chrome でスマホ幅にして録画した素材
const APP_CLIP = staticFile("clips/livecal-app.mp4");

// 録画の from 秒目から seconds 秒ぶんをスマホ枠で再生する
const AppClip = ({ from, seconds, height = 1060 }: { from: number; seconds: number; height?: number }) => (
  <div style={{ border: `10px solid ${C.line}`, borderRadius: 48, overflow: "hidden", height, aspectRatio: "860 / 1864", background: "#000" }}>
    <OffthreadVideo
      src={APP_CLIP}
      muted
      trimBefore={Math.round(from * FPS)}
      trimAfter={Math.round((from + seconds) * FPS)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);

const Chip = ({ children, color }: { children: string; color: string }) => (
  <div style={{ border: `4px solid ${color}`, color, borderRadius: 999, padding: "10px 30px", fontSize: 38, fontWeight: 800 }}>{children}</div>
);

// 検索して結果を出す → 追加ボタンでログインを求められる
const Favorite = () => (
  <>
    <Pop>
      <Chip color={PINK}>🔍 検索 → ＋ 追加</Chip>
    </Pop>
    <Sequence layout="none" durationInFrames={4.9 * FPS}>
      <AppClip from={15.5} seconds={4.9} />
    </Sequence>
    <Sequence layout="none" from={4.9 * FPS}>
      <AppClip from={36} seconds={3.7} />
    </Sequence>
  </>
);

const Auto = () => (
  <>
    <Pop>
      <Chip color={C.domain}>🤖 AIが整理したライブ一覧</Chip>
    </Pop>
    <AppClip from={23.4} seconds={12} />
  </>
);

// 2026年11月の月表示。1日は日曜
const LIVE_DAYS: Record<number, string> = { 8: PINK, 15: C.ip, 23: PINK, 29: C.domain };
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

const Calendar = ({ highlight }: { highlight?: number }) => {
  const frame = useCurrentFrame();
  const cells = [...Array.from({ length: 30 }, (_, i) => i + 1)];
  return (
    <div style={{ background: C.panel, border: `4px solid ${C.line}`, borderRadius: 28, padding: 26, width: 900 }}>
      <div style={{ fontSize: 44, fontWeight: 900, color: C.text, marginBottom: 14 }}>2026年 11月</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {WEEK.map((w) => (
          <div key={w} style={{ fontSize: 28, color: C.sub, textAlign: "center", fontWeight: 700 }}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          const color = d ? LIVE_DAYS[d] : undefined;
          const shown = color ? interpolate(frame, [40 + d! * 3, 55 + d! * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
          const active = d === highlight;
          return (
            <div
              key={i}
              style={{
                height: 92,
                borderRadius: 16,
                background: active ? color : "#0f1930",
                border: active ? `4px solid #fff` : "4px solid transparent",
                color: active ? C.bg : C.text,
                fontSize: 32,
                fontWeight: 700,
                padding: 8,
                position: "relative",
              }}
            >
              {d ?? ""}
              {color && !active && (
                <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, height: 14, borderRadius: 7, background: color, opacity: shown }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarScene = () => (
  <Pop>
    <Calendar />
  </Pop>
);

const links = [
  { label: "🎫 チケット", color: C.domain },
  { label: "🌐 特設サイト", color: C.sub },
  { label: "📣 公式告知", color: C.ip },
];

const Detail = () => (
  <>
    <Pop>
      <div style={{ transform: "scale(0.5)", margin: "-200px 0 -170px" }}>
        <Calendar highlight={23} />
      </div>
    </Pop>
    <Pop delay={30}>
      <Box color={PINK} style={{ width: 880, textAlign: "left", fontSize: 38, padding: "24px 32px" }}>
        <div style={{ fontSize: 44, fontWeight: 900 }}>11/23 ワンマンライブ</div>
        <div style={{ color: C.sub, marginTop: 8 }}>📍 Zepp ○○　🕕 18:00</div>
        <div style={{ marginTop: 18, display: "flex", gap: 14 }}>
          {links.map((l, i) => (
            <Pop key={l.label} delay={90 + i * 12}>
              <div style={{ border: `3px solid ${l.color}`, color: l.color, borderRadius: 14, padding: "8px 18px", fontSize: 32, fontWeight: 800, whiteSpace: "nowrap" }}>
                {l.label} ↗
              </div>
            </Pop>
          ))}
        </div>
      </Box>
    </Pop>
  </>
);

const Request = () => (
  <>
    <Pop>
      <Box color={C.port} style={{ width: 860, textAlign: "left", fontSize: 38 }}>
        <div style={{ color: C.sub, fontSize: 32 }}>アーティスト名</div>
        <div style={{ marginTop: 6 }}>まだ無いバンド</div>
        <div style={{ color: C.sub, fontSize: 32, marginTop: 18 }}>公式ライブ情報のURL</div>
        <div style={{ marginTop: 6, fontSize: 34, color: C.sub }}>（公式サイトのURLを貼る）</div>
      </Box>
    </Pop>
    <Pop delay={70}>
      <span style={{ background: C.port, color: C.bg, borderRadius: 999, padding: "16px 50px", fontSize: 44, fontWeight: 900 }}>
        リクエスト送信
      </span>
    </Pop>
  </>
);

const Outro = () => {
  const frame = useCurrentFrame();
  // ボタンを順に「押された」状態にする
  const liked = frame > 50;
  const reposted = frame > 95;
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
  return (
    <>
      <Pop>
        <div style={{ fontSize: 120, fontWeight: 900, color: C.text, letterSpacing: 4 }}>
          Live<span style={{ color: PINK }}>Cal</span>
        </div>
      </Pop>
      <Pop delay={10}>
        <div style={{ fontSize: 40, color: C.sub, fontWeight: 800 }}>🚧 いま開発中</div>
      </Pop>
      <Row gap={30}>
        <Pop delay={25}>
          <Button on={liked} color={PINK} icon="♥" label="いいね" />
        </Pop>
        <Pop delay={35}>
          <Button on={reposted} color={C.domain} icon="🔁" label="リポスト" />
        </Pop>
      </Row>
      <Pop delay={120}>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.text }}>で応援してね！</div>
      </Pop>
    </>
  );
};

const visuals = {
  hook: Hook,
  what: What,
  favorite: Favorite,
  auto: Auto,
  calendar: CalendarScene,
  detail: Detail,
  request: Request,
  outro: Outro,
};

export const livecal: Video = {
  id: "livecal",
  label: "個人開発中のアプリ",
  title: () => (
    <>
      <span style={{ color: PINK }}>LiveCal</span> 開発中！
      <br />
      ライブ予定を自動で集める
    </>
  ),
  scenes,
  durations,
  visuals,
  tallScenes: ["favorite", "auto"],
};
