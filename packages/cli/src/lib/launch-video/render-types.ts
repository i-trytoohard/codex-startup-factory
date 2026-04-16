import type { LaunchVideoBlueprintV1 } from "./types.js";

export interface RenderSceneInput {
  id: string;
  role: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  detectedText: string[];
  copyIntent: string;
  editorialPurpose: string;
  assetsUsed: string[];
  assetsNeeded: string[];
  motionDirectives: string[];
  transition: string;
  palette: string[];
  typographyHints: string[];
  outputIntent: string;
  keyframeDataUrl: string | null;
  placeholderAssetsUsed: string[];
}

export interface LaunchVideoRenderInput extends Record<string, unknown> {
  blueprint: LaunchVideoBlueprintV1;
  scenes: RenderSceneInput[];
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  placeholderAssetsUsed: string[];
}
