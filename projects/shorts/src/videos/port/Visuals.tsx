import { interpolate, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { Box, C, Pop, Row, usePop } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const Hook = () => {
  const frame = useCurrentFrame();
  const hl = usePop(45);
  const q = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <Box style={{ fontSize: 60, padding: "30px 40px" }}>
          http://localhost
          <span
            style={{
              color: C.port,
              fontSize: 60 + hl * 16,
              borderBottom: `6px solid rgba(255,181,71,${hl})`,
            }}
          >
            :5173
          </span>
        </Box>
      </Pop>
      <div style={{ fontSize: 220, fontWeight: 900, color: C.port, opacity: q, transform: `scale(${0.5 + q * 0.5})` }}>？</div>
    </>
  );
};

const Room = ({ port, name, delay }: { port: string; name: string; delay: number }) => (
  <Pop delay={delay}>
    <div style={{ border: `4px solid ${C.port}`, borderRadius: 20, padding: "18px 14px", width: 250, textAlign: "center" }}>
      <div style={{ fontSize: 50, color: C.port, fontWeight: 800 }}>:{port}</div>
      <div style={{ fontSize: 32, color: C.text, marginTop: 6, fontWeight: 700 }}>{name}</div>
    </div>
  </Pop>
);

const rooms = [
  { port: "5173", name: "フロント" },
  { port: "3000", name: "API" },
  { port: "5432", name: "DB" },
];

const What = () => (
  <>
    <Pop>
      <Box color={C.ip} style={{ width: 900, padding: "24px" }}>
        <div style={{ fontSize: 42, marginBottom: 18 }}>
          🏢 1台のコンピュータ <span style={{ color: C.ip }}>192.168.1.10</span>
        </div>
        <Row gap={20}>
          {rooms.map((r, i) => (
            <Room key={r.port} {...r} delay={60 + i * 20} />
          ))}
        </Row>
      </Box>
    </Pop>
    <Pop delay={200}>
      <div style={{ fontSize: 50, fontWeight: 800, color: C.text, textAlign: "center", lineHeight: 1.5 }}>
        <span style={{ color: C.ip }}>IPアドレス</span> ＝ 建物の住所
        <br />
        <span style={{ color: C.port }}>ポート番号</span> ＝ 部屋番号
      </div>
    </Pop>
  </>
);

const ranges = [
  { r: "0〜1023", name: "ウェルノウンポート", use: "標準サービス用" },
  { r: "1024〜49151", name: "登録済みポート", use: "特定アプリ向け" },
  { r: "49152〜65535", name: "動的ポート", use: "一時的に使う" },
];

const Range = () => {
  const frame = useCurrentFrame();
  const focus = interpolate(frame, [130, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <div style={{ fontSize: 80, fontWeight: 900, color: C.port }}>0 〜 65535</div>
      </Pop>
      {ranges.map((x, i) => (
        <Pop key={x.r} delay={20 + i * 15}>
          <Box
            color={i === 0 ? C.port : C.line}
            style={{
              width: 900,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "22px 32px",
              opacity: i === 0 ? 1 : 1 - focus * 0.6,
              transform: i === 0 ? `scale(${1 + focus * 0.05})` : undefined,
            }}
          >
            <span style={{ color: C.port, fontSize: 46 }}>{x.r}</span>
            <span style={{ textAlign: "right" }}>
              <div style={{ fontSize: 40 }}>{x.name}</div>
              <div style={{ fontSize: 32, color: C.sub }}>{x.use}</div>
            </span>
          </Box>
        </Pop>
      ))}
    </>
  );
};

const commons = [
  { port: "22", name: "SSH", delay: 30 },
  { port: "443", name: "HTTPS", delay: 90 },
  { port: "5432", name: "PostgreSQL", delay: 160 },
];

const Common = () => (
  <>
    {commons.map((c) => (
      <Pop key={c.port} delay={c.delay}>
        <Box color={C.port} style={{ width: 800, display: "flex", justifyContent: "space-between", fontSize: 60 }}>
          <span style={{ color: C.port }}>{c.port}</span>
          <span>{c.name}</span>
        </Box>
      </Pop>
    ))}
  </>
);

const Omit = () => (
  <>
    {[
      { url: "https://example.com", port: "443", delay: 0 },
      { url: "http://example.com", port: "80", delay: 160 },
    ].map((x) => (
      <div key={x.url} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 40 }}>
        <Pop delay={x.delay}>
          <Box style={{ fontSize: 52 }}>{x.url}</Box>
        </Pop>
        <Pop delay={x.delay + 30}>
          <div style={{ fontSize: 48, color: C.sub, fontWeight: 700 }}>
            ＝ {x.url}
            <span style={{ color: C.port }}>:{x.port}</span>
          </div>
        </Pop>
      </div>
    ))}
  </>
);

const Dev = () => (
  <>
    <Pop>
      <Box color={C.ip} style={{ width: 900, padding: "24px" }}>
        <div style={{ fontSize: 42, marginBottom: 18 }}>💻 localhost（同じPC）</div>
        <Row gap={20}>
          {rooms.map((r, i) => (
            <Room key={r.port} {...r} delay={20 + i * 25} />
          ))}
        </Row>
      </Box>
    </Pop>
    <Pop delay={190}>
      <Box color="#ff6b6b" style={{ width: 900, fontSize: 40, textAlign: "left" }}>
        <div>
          もう1つ <span style={{ color: C.port }}>:3000</span> で起動すると…
        </div>
        <div style={{ color: "#ff6b6b", marginTop: 10, fontFamily: "Menlo, monospace", fontSize: 36 }}>
          Error: address already in use
        </div>
      </Box>
    </Pop>
  </>
);

const visuals = {
  hook: Hook,
  what: What,
  range: Range,
  common: Common,
  omit: Omit,
  dev: Dev,
};

export const port: Video = {
  id: "port",
  label: "ポート番号のしくみ ②",
  title: () => (
    <>
      URLの<span style={{ color: C.port }}>「:5173」</span>って何？
      <br />
      ポート番号とは
    </>
  ),
  scenes,
  durations,
  visuals,
};
