import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LaunchVideoRenderInput, RenderSceneInput } from "./render-types.js";

function chip(label: string, background: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    background,
    color: "white",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.3,
  };
}

const SceneCard: React.FC<{
  scene: RenderSceneInput;
}> = ({ scene }) => {
  const { fps, width, height } = useVideoConfig();
  const sceneFrame = useCurrentFrame();
  const entrance = spring({
    frame: sceneFrame,
    fps,
    config: { damping: 200, stiffness: 170 },
  });
  const overlayOpacity = interpolate(sceneFrame, [0, 8, 30], [0, 0.92, 0.96], {
    extrapolateRight: "clamp",
  });
  const backgroundScale = interpolate(sceneFrame, [0, Math.max(1, scene.durationSeconds * fps)], [1, 1.08], {
    extrapolateRight: "clamp",
  });
  const gradientA = scene.palette[0] ?? "#101828";
  const gradientB = scene.palette[1] ?? "#4f46e5";
  const headline = scene.detectedText[0] ?? scene.copyIntent;
  const support = scene.detectedText.slice(1, 3).join(" | ") || scene.editorialPurpose;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${gradientA} 0%, ${gradientB} 100%)`,
        color: "white",
        fontFamily: "Helvetica Neue, Arial, sans-serif",
      }}
    >
      {scene.keyframeDataUrl ? (
        <AbsoluteFill
          style={{
            transform: `scale(${backgroundScale})`,
            opacity: 0.38,
          }}
        >
          <Img
            src={scene.keyframeDataUrl}
            style={{
              width,
              height,
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,8,20,0.24) 0%, rgba(5,8,20,0.78) 58%, rgba(5,8,20,0.96) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          opacity: overlayOpacity,
          padding: 28,
          justifyContent: "space-between",
          transform: `translateY(${(1 - entrance) * 24}px)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={chip(scene.role.toUpperCase(), "rgba(15, 23, 42, 0.8)")}>{scene.role}</span>
            <span style={chip(`${scene.startSeconds.toFixed(2)}s - ${scene.endSeconds.toFixed(2)}s`, "rgba(99, 102, 241, 0.55)")}>
              {scene.startSeconds.toFixed(2)}s - {scene.endSeconds.toFixed(2)}s
            </span>
          </div>
          <div style={{ ...chip("PLACEHOLDERS", "rgba(225, 29, 72, 0.75)") }}>
            {scene.placeholderAssetsUsed.length}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 22, alignItems: "end" }}>
          <div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                opacity: 0.78,
                marginBottom: 12,
              }}
            >
              Launch-family {scene.role}
            </div>
            <div
              style={{
                fontSize: scene.role === "hook" ? 42 : 34,
                fontWeight: 800,
                lineHeight: 1.03,
                marginBottom: 12,
                maxWidth: 560,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.35,
                opacity: 0.88,
                maxWidth: 560,
              }}
            >
              {support}
            </div>
          </div>

          <div
            style={{
              borderRadius: 22,
              background: "rgba(15, 23, 42, 0.72)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 18,
              backdropFilter: "blur(10px)",
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, opacity: 0.7 }}>
                Output Intent
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 600 }}>{scene.outputIntent}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, opacity: 0.7 }}>
                Motion
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.35 }}>{scene.motionDirectives[0]}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, opacity: 0.7 }}>
                Needed Assets
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {scene.assetsNeeded.slice(0, 4).map((asset) => (
                  <span key={asset} style={chip(asset, "rgba(255,255,255,0.12)")}>
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: width * 0.7 }}>
            {scene.typographyHints.slice(0, 2).map((hint) => (
              <span key={hint} style={chip(hint, "rgba(255,255,255,0.12)")}>
                {hint}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "right", maxWidth: width * 0.25 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, opacity: 0.7 }}>
              Transition
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.35 }}>{scene.transition}</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const LaunchVideoPreviewComposition: React.FC<LaunchVideoRenderInput> = ({ scenes }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#020617" }}>
      {scenes.map((scene) => {
        const from = Math.round(scene.startSeconds * fps);
        const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <SceneCard scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
