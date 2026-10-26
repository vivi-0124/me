import { interpolate, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { ArrowDown, Box, C, Pop, Row, Tag, useGrow } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const Hook = () => {
  const frame = useCurrentFrame();
  const q = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <Box style={{ width: 620 }}>🌐 ブラウザ</Box>
      </Pop>
      <div style={{ fontSize: 200, fontWeight: 900, color: C.port, opacity: q, transform: `scale(${0.5 + q * 0.5})` }}>？</div>
      <Pop delay={20}>
        <Box color={C.ip} style={{ width: 620 }}>
          🖥️ サーバーのアプリ
        </Box>
      </Pop>
    </>
  );
};

const layers = [
  { name: "アプリケーション層", ex: "HTTP / HTTPS", role: "何をやり取りするか", color: C.domain },
  { name: "トランスポート層", ex: "TCP / UDP", role: "どのプログラムへ", color: C.port },
  { name: "インターネット層", ex: "IP", role: "どのコンピュータへ", color: C.ip },
  { name: "リンク層", ex: "Wi-Fi / Ethernet", role: "隣の機器まで", color: C.sub },
];

const Layers = () => (
  <>
    {layers.map((l, i) => (
      <Pop key={l.name} delay={30 + i * 20}>
        <Box color={l.color} style={{ width: 900, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 32px" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 44, color: l.color }}>{l.name}</div>
            <div style={{ fontSize: 34, color: C.sub, marginTop: 4 }}>{l.role}</div>
          </div>
          <div style={{ fontSize: 40 }}>{l.ex}</div>
        </Box>
      </Pop>
    ))}
    <Pop delay={200}>
      <div style={{ fontSize: 72, fontWeight: 900, color: C.text }}>＝ TCP/IP</div>
    </Pop>
  </>
);

const Ip = () => {
  const arrow = useGrow(40);
  return (
    <>
      <Pop>
        <Box color={C.port} style={{ fontSize: 52 }}>
          📦 宛先 <span style={{ color: C.ip }}>203.0.113.10</span>
        </Box>
      </Pop>
      <ArrowDown progress={arrow} color={C.ip} height={180} />
      <Pop delay={55}>
        <Box color={C.ip} style={{ width: 620, fontSize: 52 }}>
          🏢 <span style={{ color: C.ip }}>203.0.113.10</span>
          <div style={{ fontSize: 38, color: C.sub, marginTop: 8 }}>宛先のコンピュータ</div>
        </Box>
      </Pop>
      <Pop delay={110}>
        <div style={{ fontSize: 48, color: C.sub }}>
          見るのは <span style={{ color: C.ip }}>IPアドレス</span> だけ
        </div>
      </Pop>
    </>
  );
};

const rooms = [
  { port: "443", name: "Webサーバー" },
  { port: "5432", name: "データベース" },
  { port: "22", name: "SSH" },
];

const Tcp = () => {
  const frame = useCurrentFrame();
  const arrow = useGrow(150);
  const hit = interpolate(frame, [165, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <Box color={C.port} style={{ fontSize: 52 }}>
          📦 宛先 <span style={{ color: C.port }}>:443</span>
        </Box>
      </Pop>
      <ArrowDown progress={arrow} color={C.port} height={130} />
      <Pop delay={20}>
        <Box color={C.ip} style={{ width: 900, padding: "24px" }}>
          <div style={{ fontSize: 40, color: C.sub, marginBottom: 18 }}>🏢 203.0.113.10 の中</div>
          <Row gap={20}>
            {rooms.map((r, i) => (
              <Pop key={r.port} delay={40 + i * 15}>
                <div
                  style={{
                    border: `4px solid ${r.port === "443" && hit > 0 ? C.port : C.line}`,
                    background: r.port === "443" ? `rgba(255,181,71,${0.25 * hit})` : "transparent",
                    borderRadius: 20,
                    padding: "18px 14px",
                    width: 250,
                  }}
                >
                  <div style={{ fontSize: 50, color: C.port }}>:{r.port}</div>
                  <div style={{ fontSize: 32, color: C.text, marginTop: 6 }}>{r.name}</div>
                </div>
              </Pop>
            ))}
          </Row>
        </Box>
      </Pop>
    </>
  );
};

const Proto = ({ name, desc, ex, color, delay }: { name: string; desc: string; ex: string; color: string; delay: number }) => (
  <Pop delay={delay}>
    <Box color={color} style={{ width: 430, padding: "32px 20px" }}>
      <div style={{ fontSize: 72, color }}>{name}</div>
      <div style={{ fontSize: 40, marginTop: 12 }}>{desc}</div>
      <div style={{ fontSize: 34, color: C.sub, marginTop: 16 }}>{ex}</div>
    </Box>
  </Pop>
);

const TcpUdp = () => (
  <Row gap={30}>
    <Proto name="TCP" desc="確実・順番どおり" ex="Web / SSH / DB" color={C.ip} delay={0} />
    <Proto name="UDP" desc="速い・送りっぱなし" ex="DNS / 通話 / ゲーム" color={C.port} delay={150} />
  </Row>
);

const Dns = () => {
  const a1 = useGrow(90);
  const a2 = useGrow(150);
  return (
    <>
      <Pop>
        <Box color={C.domain} style={{ width: 620, fontSize: 56 }}>
          <span style={{ color: C.domain }}>example.com</span>
        </Box>
      </Pop>
      <ArrowDown progress={a1} color={C.sub} height={110} />
      <Pop delay={100}>
        <Box style={{ width: 620 }}>
          DNS<span style={{ fontSize: 38, color: C.sub }}>（名前 → 番号の変換）</span>
        </Box>
      </Pop>
      <ArrowDown progress={a2} color={C.sub} height={110} />
      <Pop delay={160}>
        <Box color={C.ip} style={{ width: 620, fontSize: 56 }}>
          <span style={{ color: C.ip }}>203.0.113.10</span>
        </Box>
      </Pop>
    </>
  );
};

const Summary = () => (
  <>
    {[
      { k: "IPアドレス", v: "🏢 建物まで", color: C.ip },
      { k: "ポート番号", v: "🚪 部屋まで", color: C.port },
    ].map((r, i) => (
      <Pop key={r.k} delay={i * 45}>
        <Box color={r.color} style={{ width: 900, display: "flex", justifyContent: "space-between", fontSize: 58, whiteSpace: "nowrap" }}>
          <span style={{ color: r.color }}>{r.k}</span>
          <span>{r.v}</span>
        </Box>
      </Pop>
    ))}
    <Pop delay={110}>
      <div style={{ fontSize: 46, marginTop: 10 }}>
        <Tag color={C.domain}>データが目的のアプリに届く</Tag>
      </div>
    </Pop>
  </>
);

const visuals = {
  hook: Hook,
  layers: Layers,
  ip: Ip,
  tcp: Tcp,
  tcpudp: TcpUdp,
  dns: Dns,
  summary: Summary,
};

export const tcpip: Video = {
  id: "tcpip",
  label: "ポート番号のしくみ ①",
  title: () => (
    <>
      通信はどうやって届く？
      <br />
      <span style={{ color: C.port }}>TCP/IP</span>をざっくり
    </>
  ),
  scenes,
  durations,
  visuals,
};
