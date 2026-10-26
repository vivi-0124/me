import { Composition } from "remotion";
import { FPS, Short, type Video, totalFrames } from "./Short";
import { https443 } from "./videos/https443/Visuals";
import { livecal } from "./videos/livecal/Visuals";
import { orca } from "./videos/orca/Visuals";
import { port } from "./videos/port/Visuals";
import { portforward } from "./videos/portforward/Visuals";
import { tcpip } from "./videos/tcpip/Visuals";

const videos = [tcpip, port, https443, portforward, orca, livecal];

// defaultProps は JSON にシリアライズされ関数や JSX が落ちるので、動画ごとにラッパーを作って渡す
const withVideo = (video: Video) => () => <Short video={video} />;

export const Root = () => (
  <>
    {videos.map((video) => (
      <Composition
        key={video.id}
        id={video.id}
        component={withVideo(video)}
        durationInFrames={totalFrames(video)}
        fps={FPS}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
