import { interpolate, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { ArrowDown, Box, C, Pop, Row, Server, Site, Tag, useGrow } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const Hook = () => {
  const frame = useCurrentFrame();
  const q = interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {["a.com", "b.com", "c.com"].map((name, i) => (
        <Pop key={name} delay={i * 8}>
          <Box color={C.domain} style={{ width: 640, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, fontSize: 54 }}>
            <span style={{ color: C.domain }}>https://{name}</span>
            <Pop delay={45 + i * 6}>
              <Tag color={C.port}>443</Tag>
            </Pop>
          </Box>
        </Pop>
      ))}
      <div style={{ fontSize: 260, fontWeight: 900, color: C.port, opacity: q, transform: `scale(${0.5 + q * 0.5})` }}>？</div>
    </>
  );
};

const Address = () => {
  const arrow = useGrow(150);
  return (
    <>
      <Pop>
        <div style={{ fontSize: 76, fontWeight: 800, color: C.text }}>
          <span style={{ color: C.ip }}>IPアドレス</span> : <span style={{ color: C.port }}>ポート番号</span>
        </div>
      </Pop>
      <Pop delay={30}>
        <div style={{ fontSize: 46, color: C.sub }}>建物の住所 ＋ 部屋番号</div>
      </Pop>
      <Row gap={40}>
        {[
          { name: "a.com", ip: "198.51.100.1" },
          { name: "b.com", ip: "203.0.113.7" },
        ].map((s) => (
          <div key={s.name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Site name={s.name} delay={130} />
            <ArrowDown progress={arrow} color={C.domain} />
            <Pop delay={140}>
              <Box color={C.ip} style={{ fontSize: 44, padding: "22px 26px" }}>
                <span style={{ color: C.ip }}>{s.ip}</span>
                <br />
                <span style={{ color: C.port }}>:443</span>
              </Box>
            </Pop>
          </div>
        ))}
      </Row>
    </>
  );
};

const Shared = () => {
  const arrow = useGrow(100);
  return (
    <>
      <Row gap={24}>
        <Site name="a.com" delay={40} />
        <Site name="b.com" delay={55} />
        <Site name="c.com" delay={70} />
      </Row>
      <Row gap={150}>
        {[0, 1, 2].map((i) => (
          <ArrowDown key={i} progress={arrow} color={C.domain} height={160} />
        ))}
      </Row>
      <Pop>
        <Server ip="203.0.113.10" label="1台のサーバー（同じIP）" />
      </Pop>
      <Pop delay={170}>
        <div style={{ fontSize: 48, color: C.sub }}>クラウド・CDN・レンタルサーバーでよくある</div>
      </Pop>
    </>
  );
};

const Sni = () => {
  const arrow = useGrow(60, 20);
  return (
    <>
      <Pop>
        <Box style={{ width: 620 }}>🌐 ブラウザ</Box>
      </Pop>
      <Row gap={30}>
        <ArrowDown progress={arrow} color={C.domain} height={260} />
        <Pop delay={110}>
          <Box color={C.domain} style={{ fontSize: 44, textAlign: "left" }}>
            <div style={{ color: C.sub, fontSize: 36 }}>SNI</div>
            「<span style={{ color: C.domain }}>example.com</span>
            <br />
            につなぎたい」
          </Box>
        </Pop>
      </Row>
      <Pop delay={20}>
        <Server ip="203.0.113.10" />
      </Pop>
    </>
  );
};

const Vhost = () => {
  const arrow = useGrow(60);
  return (
    <>
      <Pop>
        <Box color={C.ip} style={{ width: 760 }}>
          <div style={{ fontSize: 44, color: C.sub }}>サーバー（nginx など）</div>
          <div style={{ fontSize: 56, marginTop: 8 }}>
            <span style={{ color: C.ip }}>203.0.113.10</span>
            <span style={{ color: C.port }}> :443</span>
          </div>
          <div style={{ fontSize: 40, color: C.domain, marginTop: 12 }}>ドメイン名を見て振り分け</div>
        </Box>
      </Pop>
      <Row gap={300}>
        <ArrowDown progress={arrow} color={C.domain} height={160} />
        <ArrowDown progress={arrow} color={C.domain} height={160} />
      </Row>
      <Row gap={30}>
        <Site name="example.com" delay={75} />
        <Site name="blog.example.com" delay={90} />
      </Row>
      <Pop delay={150}>
        <div style={{ fontSize: 72, fontWeight: 900, color: C.text, marginTop: 20 }}>＝ バーチャルホスト</div>
      </Pop>
    </>
  );
};

const Summary = () => (
  <>
    {[
      { k: "① IPアドレス", v: "どのマシンか", color: C.ip },
      { k: "② ポート番号", v: "どのプログラムか", color: C.port },
      { k: "③ ドメイン名", v: "どのサイトか", color: C.domain },
    ].map((r, i) => (
      <Pop key={r.k} delay={i * 45}>
        <Box color={r.color} style={{ width: 940, display: "flex", justifyContent: "space-between", fontSize: 52, whiteSpace: "nowrap" }}>
          <span style={{ color: r.color }}>{r.k}</span>
          <span>{r.v}</span>
        </Box>
      </Pop>
    ))}
  </>
);

const visuals = {
  hook: Hook,
  address: Address,
  shared: Shared,
  sni: Sni,
  vhost: Vhost,
  summary: Summary,
};

export const https443: Video = {
  id: "https443",
  label: "ポート番号のしくみ ③",
  title: () => (
    <>
      HTTPSはなぜ
      <br />
      <span style={{ color: C.port }}>443番</span>で区別できる？
    </>
  ),
  scenes,
  durations,
  visuals,
};
