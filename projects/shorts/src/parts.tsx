import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const C = {
  bg: "#0b1220",
  panel: "#16213a",
  line: "#2b3a5c",
  text: "#e8eefc",
  sub: "#9fb0d3",
  ip: "#4fa3ff",
  port: "#ffb547",
  domain: "#5ee0a0",
};

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';

// delay フレーム後にぽんと出てくる
export const usePop = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
};

export const Pop = ({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) => {
  const p = usePop(delay);
  return (
    <div style={{ opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, ...style }}>{children}</div>
  );
};

export const Box = ({ children, color = C.line, style }: { children: ReactNode; color?: string; style?: CSSProperties }) => (
  <div
    style={{
      background: C.panel,
      border: `4px solid ${color}`,
      borderRadius: 28,
      padding: "28px 36px",
      color: C.text,
      fontSize: 48,
      fontWeight: 700,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Tag = ({ children, color }: { children: ReactNode; color: string }) => (
  <span style={{ background: color, color: C.bg, borderRadius: 14, padding: "4px 18px", fontWeight: 800 }}>{children}</span>
);

// 上から下へ伸びる矢印。progress 0→1 で伸びる
export const ArrowDown = ({ progress, color = C.sub, height = 120 }: { progress: number; color?: string; height?: number }) => (
  <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ width: 8, height: (height - 30) * progress, background: color, borderRadius: 4 }} />
    <div
      style={{
        opacity: progress > 0.95 ? 1 : 0,
        width: 0,
        height: 0,
        borderLeft: "22px solid transparent",
        borderRight: "22px solid transparent",
        borderTop: `30px solid ${color}`,
      }}
    />
  </div>
);

export const useGrow = (delay: number, length = 15) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const Row = ({ children, gap = 40 }: { children: ReactNode; gap?: number }) => (
  <div style={{ display: "flex", gap, justifyContent: "center", alignItems: "center" }}>{children}</div>
);

export const Server = ({ ip, label = "サーバー", port = "443" }: { ip: string; label?: string; port?: string }) => (
  <Box color={C.ip} style={{ minWidth: 620, whiteSpace: "nowrap" }}>
    <div style={{ fontSize: 42, color: C.sub }}>{label}</div>
    <div style={{ fontSize: 52, marginTop: 8 }}>
      <span style={{ color: C.ip }}>{ip}</span>
      <span style={{ color: C.port }}> :{port}</span>
    </div>
  </Box>
);

export const Site = ({ name, delay = 0 }: { name: string; delay?: number }) => (
  <Pop delay={delay}>
    <Box color={C.domain} style={{ fontSize: 42, padding: "22px 26px" }}>
      <span style={{ color: C.domain }}>{name}</span>
    </Box>
  </Pop>
);
