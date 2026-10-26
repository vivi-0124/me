import { interpolate, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { ArrowDown, Box, C, Pop, Row, Tag, useGrow } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const MONO = "Menlo, monospace";
const RED = "#ff6b6b";
const agents = [
  { name: "Claude Code", color: "#ff9d6b" },
  { name: "Codex", color: C.domain },
  { name: "Gemini", color: C.ip },
];

const Agent = ({ name, color, delay = 0 }: { name: string; color: string; delay?: number }) => (
  <Pop delay={delay}>
    <div style={{ border: `4px solid ${color}`, color, borderRadius: 999, padding: "12px 26px", fontSize: 38, fontWeight: 800 }}>🤖 {name}</div>
  </Pop>
);

const Hook = () => {
  const arrow = useGrow(50);
  const frame = useCurrentFrame();
  const boom = interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = boom > 0 && boom < 1 ? Math.sin(frame * 2) * 10 : 0;
  return (
    <>
      <Row gap={16}>
        {agents.map((a, i) => (
          <Agent key={a.name} {...a} delay={i * 10} />
        ))}
      </Row>
      <Row gap={190}>
        {agents.map((a) => (
          <ArrowDown key={a.name} progress={arrow} color={a.color} height={140} />
        ))}
      </Row>
      <Pop delay={40}>
        <div style={{ transform: `translateX(${shake}px)` }}>
          <Box color={boom > 0 ? RED : C.line} style={{ width: 620 }}>
            🌿 同じブランチ <span style={{ fontFamily: MONO, color: C.sub }}>main</span>
          </Box>
        </div>
      </Pop>
      <div style={{ fontSize: 120, opacity: boom, transform: `scale(${0.5 + boom * 0.5})` }}>💥</div>
    </>
  );
};

const What = () => (
  <>
    <Pop>
      <div style={{ fontSize: 180, fontWeight: 900, color: C.text, letterSpacing: 4 }}>Orca</div>
    </Pop>
    <Pop delay={45}>
      <Box color={C.port} style={{ fontSize: 44 }}>
        ADE <span style={{ color: C.sub, fontSize: 36 }}>= Agent Development Environment</span>
      </Box>
    </Pop>
    <Row gap={14}>
      {["無料・OSS", "Mac / Windows / Linux", "スマホ版あり"].map((t, i) => (
        <Pop key={t} delay={110 + i * 12}>
          <div style={{ fontSize: 32, whiteSpace: "nowrap" }}>
            <Tag color={C.domain}>{t}</Tag>
          </div>
        </Pop>
      ))}
    </Row>
  </>
);

const trees = [
  { branch: "fix-login", agent: agents[0] },
  { branch: "add-test", agent: agents[1] },
  { branch: "update-docs", agent: agents[2] },
];

const Worktree = () => {
  const arrow = useGrow(50);
  return (
    <>
      <Pop>
        <Box style={{ width: 620 }}>
          📁 my-app <span style={{ fontFamily: MONO, color: C.sub, fontSize: 40 }}>(main)</span>
        </Box>
      </Pop>
      <Row gap={190}>
        {trees.map((t) => (
          <ArrowDown key={t.branch} progress={arrow} color={t.agent.color} height={120} />
        ))}
      </Row>
      <Row gap={18}>
        {trees.map((t, i) => (
          <Pop key={t.branch} delay={65 + i * 15}>
            <Box color={t.agent.color} style={{ width: 300, padding: "20px 10px" }}>
              <div style={{ fontFamily: MONO, fontSize: 32, color: t.agent.color }}>{t.branch}</div>
              <div style={{ fontSize: 30, color: C.sub, marginTop: 8 }}>🤖 {t.agent.name}</div>
            </Box>
          </Pop>
        ))}
      </Row>
      <Pop delay={220}>
        <div style={{ fontSize: 60, fontWeight: 900, color: C.domain }}>✓ ぶつからない</div>
      </Pop>
    </>
  );
};

const lines = [
  { t: "function login(user) {", c: C.sub },
  { t: "+  if (!user) return;", c: C.domain },
  { t: "+  save(user.token);", c: C.domain },
  { t: "}", c: C.sub },
];

const Review = () => (
  <>
    <Pop>
      <div style={{ background: "#05080f", border: `4px solid ${C.line}`, borderRadius: 24, padding: "24px 30px", width: 900 }}>
        <div style={{ fontSize: 30, color: C.sub, marginBottom: 10 }}>差分ビュー</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: MONO, fontSize: 38, color: l.c, lineHeight: 1.5 }}>
            {l.t}
          </div>
        ))}
        <Pop delay={60} style={{ marginTop: 14 }}>
          <div style={{ background: C.port, color: C.bg, borderRadius: 16, padding: "12px 20px", fontSize: 36, fontWeight: 800, display: "inline-block" }}>
            💬 token は暗号化して
          </div>
        </Pop>
        <Pop delay={120} style={{ marginTop: 14, textAlign: "right" }}>
          <span style={{ border: `3px solid ${C.domain}`, color: C.domain, borderRadius: 14, padding: "8px 20px", fontSize: 34, fontWeight: 800 }}>
            Send to agent ▶
          </span>
        </Pop>
      </div>
    </Pop>
    <Pop delay={190}>
      <Box color={C.ip} style={{ width: 900, padding: "22px 30px" }}>
        <div style={{ fontSize: 30, color: C.sub, marginBottom: 12 }}>🌐 内蔵ブラウザ（Design Mode）</div>
        <span style={{ border: `4px dashed ${C.port}`, borderRadius: 14, padding: "8px 24px", fontSize: 40 }}>ログイン</span>
        <span style={{ fontSize: 36, marginLeft: 20 }}>👆 クリックして「直して」</span>
      </Box>
    </Pop>
  </>
);

const statuses = [
  { icon: "✅", name: "fix-login", s: "完了", c: C.domain },
  { icon: "⏳", name: "add-test", s: "作業中", c: C.port },
  { icon: "💬", name: "update-docs", s: "入力待ち", c: C.ip },
];

const Mobile = () => (
  <Pop>
    <div style={{ border: `8px solid ${C.line}`, borderRadius: 60, padding: "60px 30px", width: 520, background: C.panel }}>
      <div style={{ fontSize: 36, color: C.sub, fontWeight: 800, textAlign: "center", marginBottom: 24 }}>📱 Orca Mobile</div>
      {statuses.map((x, i) => (
        <Pop key={x.name} delay={25 + i * 15}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700, color: C.text, padding: "16px 8px", borderBottom: `2px solid ${C.line}` }}>
            <span>
              {x.icon} <span style={{ fontFamily: MONO, fontSize: 30 }}>{x.name}</span>
            </span>
            <span style={{ color: x.c }}>{x.s}</span>
          </div>
        </Pop>
      ))}
    </div>
  </Pop>
);

const Caution = () => {
  const frame = useCurrentFrame();
  const on = interpolate(frame, [30, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <div style={{ fontSize: 140 }}>⚠️</div>
      </Pop>
      <Pop delay={15}>
        <Box color={RED} style={{ width: 800, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 56 }}>
          <span>Yolo モード</span>
          <div style={{ width: 150, height: 80, borderRadius: 40, background: on > 0.5 ? RED : C.line, position: "relative" }}>
            <div style={{ position: "absolute", top: 8, left: 8 + on * 70, width: 64, height: 64, borderRadius: 32, background: "#fff" }} />
          </div>
        </Box>
      </Pop>
      <Pop delay={90}>
        <div style={{ fontSize: 44, color: C.sub, fontWeight: 700 }}>確認なしでコマンド実行・ファイル編集</div>
      </Pop>
      <Pop delay={190}>
        <div style={{ fontSize: 50, color: C.text, fontWeight: 800 }}>業務で使うなら設定で見直す</div>
      </Pop>
    </>
  );
};

const Term = ({ children, color }: { children: string[]; color: string }) => (
  <div style={{ background: "#05080f", border: `4px solid ${color}`, borderRadius: 24, padding: "26px 32px", width: 900, fontFamily: MONO, fontSize: 46, fontWeight: 700, lineHeight: 1.5, color: C.text, fontVariantLigatures: "none" }}>
    {children.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </div>
);

const Install = () => (
  <>
    <Pop>
      <div style={{ fontSize: 46, fontWeight: 800, color: C.domain, alignSelf: "flex-start", marginLeft: 90 }}>✓ フルパスで指定</div>
    </Pop>
    <Pop delay={10}>
      <Term color={C.domain}>{["$ brew install --cask", "  stablyai/orca/orca"]}</Term>
    </Pop>
    <Pop delay={120}>
      <div style={{ fontSize: 46, fontWeight: 800, color: RED, alignSelf: "flex-start", marginLeft: 90, marginTop: 30 }}>✕ 別のツールが入る</div>
    </Pop>
    <Pop delay={130}>
      <Term color={RED}>{["$ brew install --cask orca"]}</Term>
    </Pop>
  </>
);

const visuals = {
  hook: Hook,
  what: What,
  worktree: Worktree,
  review: Review,
  mobile: Mobile,
  caution: Caution,
  install: Install,
};

export const orca: Video = {
  id: "orca",
  label: "AIエージェント並列開発",
  title: () => (
    <>
      <span style={{ color: C.port }}>Orca</span>ってなに？
      <br />
      エージェントを並列で回す
    </>
  ),
  scenes,
  durations,
  visuals,
};
