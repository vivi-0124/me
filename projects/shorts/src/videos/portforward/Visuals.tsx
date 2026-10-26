import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Video } from "../../Short";
import { ArrowDown, Box, C, Pop, Row, useGrow } from "../../parts";
import durations from "./durations.json";
import { scenes } from "./script";

const MONO = "Menlo, monospace";
const POD = "#c792ea";

const Laptop = ({ port }: { port?: string }) => (
  <Box style={{ width: 620 }}>
    💻 手元のPC
    {port && (
      <div style={{ fontSize: 46, marginTop: 8, fontFamily: MONO }}>
        localhost<span style={{ color: C.port }}>:{port}</span>
      </div>
    )}
  </Box>
);

const Cluster = ({ children }: { children: ReactNode }) => (
  <div style={{ border: `4px dashed ${C.ip}`, borderRadius: 28, padding: "20px 28px 28px", width: 900, textAlign: "center" }}>
    <div style={{ fontSize: 40, color: C.ip, fontWeight: 800, marginBottom: 16 }}>Kubernetes クラスタ</div>
    {children}
  </div>
);

const Pod = ({ name = "Pod", dim = 0, hit = 0 }: { name?: string; dim?: number; hit?: number }) => (
  <div
    style={{
      border: `4px solid ${POD}`,
      background: `rgba(199,146,234,${0.3 * hit})`,
      borderRadius: 20,
      padding: "16px 24px",
      fontSize: 40,
      fontWeight: 800,
      color: POD,
      opacity: 1 - dim * 0.7,
    }}
  >
    {name}
  </div>
);

const Hook = () => {
  const frame = useCurrentFrame();
  const bridge = useGrow(185, 20);
  const q = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Pop>
        <Laptop />
      </Pop>
      <Row gap={30}>
        <ArrowDown progress={bridge} color={C.port} height={150} />
        <div style={{ fontSize: 50, fontWeight: 900, color: bridge > 0 ? C.port : "#ff6b6b", width: 460, whiteSpace: "nowrap" }}>
          {bridge > 0 ? "port-forward" : <span style={{ opacity: q }}>✕ 直接は届かない</span>}
        </div>
      </Row>
      <Pop delay={20}>
        <Cluster>
          <Row gap={20}>
            <Pod name="app" />
          </Row>
        </Cluster>
      </Pop>
    </>
  );
};

const tokens = [
  { t: "kubectl", color: C.text, delay: 30 },
  { t: "port-forward", color: C.domain, delay: 75 },
  { t: "svc/app", color: POD, delay: 130 },
  { t: "8080:80", color: C.port, delay: 185 },
];

const Command = () => (
  <Pop>
    <div
      style={{
        background: "#05080f",
        border: `4px solid ${C.line}`,
        borderRadius: 24,
        padding: "40px 36px",
        width: 940,
        fontFamily: MONO,
        fontSize: 58,
        fontWeight: 700,
        lineHeight: 1.6,
        color: C.sub,
      }}
    >
      <div style={{ fontSize: 34, marginBottom: 12 }}>$ ターミナル</div>
      {tokens.map((x) => (
        <Pop key={x.t} delay={x.delay} style={{ color: x.color, display: "inline-block", marginRight: 34 }}>
          {x.t}
        </Pop>
      ))}
    </div>
  </Pop>
);

const Ports = () => {
  const arrow = useGrow(160, 20);
  return (
    <>
      <Pop>
        <div style={{ fontSize: 120, fontWeight: 900, fontFamily: MONO }}>
          <span style={{ color: C.port }}>8080</span>
          <span style={{ color: C.sub }}>:</span>
          <span style={{ color: POD }}>80</span>
        </div>
      </Pop>
      <Pop delay={20}>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.sub }}>
          <span style={{ color: C.port }}>手元</span> → <span style={{ color: POD }}>転送先</span>
        </div>
      </Pop>
      <Pop delay={120}>
        <Laptop port="8080" />
      </Pop>
      <ArrowDown progress={arrow} color={C.port} height={110} />
      <Pop delay={175}>
        <Cluster>
          <Row gap={20}>
            <div style={{ fontSize: 46, fontWeight: 800, fontFamily: MONO, color: POD }}>app :80</div>
          </Row>
        </Cluster>
      </Pop>
    </>
  );
};

const Svc = () => (
  <>
    <Pop>
      <div style={{ fontSize: 130, fontWeight: 900, fontFamily: MONO }}>
        <span style={{ color: C.ip }}>svc</span>
        <span style={{ color: C.sub }}>/</span>
        <span style={{ color: POD }}>app</span>
      </div>
    </Pop>
    <Row gap={30}>
      <Pop delay={110}>
        <Box color={C.ip} style={{ width: 420 }}>
          <div style={{ fontSize: 36, color: C.sub }}>種類</div>
          <div style={{ color: C.ip }}>Service</div>
        </Box>
      </Pop>
      <Pop delay={210}>
        <Box color={POD} style={{ width: 420 }}>
          <div style={{ fontSize: 36, color: C.sub }}>名前</div>
          <div style={{ color: POD }}>app</div>
        </Box>
      </Pop>
    </Row>
    <Pop delay={230}>
      <div style={{ fontSize: 40, color: C.sub, fontFamily: MONO }}>kubectl get svc で一覧</div>
    </Pop>
  </>
);

// Service と裏の Pod 3つ。focus 0→1 で Pod 1 だけが残る
const ServicePods = ({ focus = 0, podsDelay = 30 }: { focus?: number; podsDelay?: number }) => {
  const arrow = useGrow(podsDelay - 10);
  return (
    <Cluster>
      <Row>
        <Box color={C.ip} style={{ width: 520 }}>
          Service <span style={{ color: POD }}>app</span>
        </Box>
      </Row>
      <Row gap={170}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ opacity: i === 0 ? 1 : 1 - focus * 0.8 }}>
            <ArrowDown progress={arrow} color={POD} height={90} />
          </div>
        ))}
      </Row>
      <Row gap={30}>
        {[1, 2, 3].map((n, i) => (
          <Pop key={n} delay={podsDelay + i * 12}>
            <Pod name={`Pod ${n}`} dim={i === 0 ? 0 : focus} hit={i === 0 ? focus : 0} />
          </Pop>
        ))}
      </Row>
    </Cluster>
  );
};

const Service = () => (
  <>
    <Pop>
      <ServicePods />
    </Pop>
    <Pop delay={90}>
      <div style={{ fontSize: 46, color: C.sub, fontWeight: 700 }}>同じアプリの Pod を1つの宛先に</div>
    </Pop>
  </>
);

const OnePod = () => {
  const frame = useCurrentFrame();
  const focus = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrow = useGrow(0);
  return (
    <>
      <Laptop port="8080" />
      <ArrowDown progress={arrow} color={C.port} height={70} />
      <ServicePods focus={focus} podsDelay={0} />
      <Pop delay={170}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#ff6b6b" }}>✕ 複数の Pod に振り分けはしない</div>
      </Pop>
    </>
  );
};

const others = [
  { kind: "svc/app", note: "Service", delay: 0 },
  { kind: "pod/app-7d9f8", note: "特定の Pod", delay: 40 },
  { kind: "deployment/app", note: "Deployment 配下の Pod", delay: 70 },
];

const Other = () => (
  <>
    {others.map((x) => (
      <Pop key={x.kind} delay={x.delay}>
        <Box style={{ width: 940, textAlign: "left", padding: "24px 32px" }}>
          <div style={{ fontFamily: MONO, fontSize: 48, color: POD }}>{x.kind}</div>
          <div style={{ fontSize: 36, color: C.sub, marginTop: 6 }}>{x.note}</div>
        </Box>
      </Pop>
    ))}
  </>
);

const visuals = {
  hook: Hook,
  command: Command,
  ports: Ports,
  svc: Svc,
  service: Service,
  onepod: OnePod,
  other: Other,
};

export const portforward: Video = {
  id: "portforward",
  label: "ポート番号のしくみ ④",
  title: () => (
    <>
      <span style={{ color: C.port }}>kubectl</span>の
      <br />
      ポートフォワードとは
    </>
  ),
  scenes,
  durations,
  visuals,
};
