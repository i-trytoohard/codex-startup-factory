export const BLUEPRINT_SCHEMA_VERSION = "blueprint-schema-v1" as const;
export const LAUNCH_FAMILY_SPEC_VERSION = "launch-family-spec-v1" as const;
export const JUDGE_SCHEMA_VERSION = "judge-v1" as const;

export type LaunchFamilyRole = "hook" | "before" | "after" | "value-beats" | "outro";

export interface ArtifactPaths {
  rootDir: string;
  referenceDir: string;
  assetsDir: string;
  analysisDir: string;
  blueprintsDir: string;
  judgeDir: string;
  rendersDir: string;
  keyframesDir: string;
}

export interface ReferenceMetadata {
  originalPath: string;
  fileName: string;
  artifactKey: string;
  fingerprint: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  hasAudio: boolean;
  keyframeCount: number;
  analyzedAt: string;
  cacheStatus: "generated" | "reused";
  extraction: {
    ffmpegAvailable: boolean;
    ffprobeAvailable: boolean;
    swiftAvailable: boolean;
    whisperAvailable: boolean;
    sceneDetection: "heuristic-duration-slices";
    transcription: "stub-missing-dependency" | "whisper";
    keyframeExtractor: "ffmpeg" | "swift-avfoundation" | "none";
  };
}

export interface AnalysisScene {
  id: string;
  role: LaunchFamilyRole;
  beatIndex: number | null;
  label: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  keyframePath: string | null;
  intent: string;
  notes: string[];
  detectionMethod: "heuristic-duration-slices";
}

export interface TranscriptOutput {
  status: "available" | "stub";
  provider: "whisper" | "none";
  language: string | null;
  segments: Array<{
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
  todo: string[];
}

export interface AudioEvent {
  id: string;
  type: "music-bed" | "riser" | "whoosh" | "cta-hit" | "voiceover-placeholder";
  startSeconds: number;
  endSeconds: number;
  inferred: boolean;
  notes: string;
}

export interface StyleAnalysis {
  summary: string;
  launchFamilyFit: string;
  format: {
    aspectRatio: string | null;
    resolution: string | null;
    durationBucket: "short" | "medium" | "long";
  };
  notes: string[];
}

export interface MotionAnalysis {
  summary: string;
  pace: "slow" | "medium" | "fast";
  cameraEnergy: "low" | "medium" | "high";
  notes: string[];
}

export interface EditorialAnalysis {
  summary: string;
  structure: Array<{
    role: LaunchFamilyRole;
    purpose: string;
  }>;
  notes: string[];
}

export interface BlueprintScene {
  id: string;
  role: LaunchFamilyRole;
  beatIndex: number | null;
  objective: string;
  referenceSceneId: string;
  sourceKeyframePath: string | null;
  copyPrompt: string;
  visualDirection: string[];
  assetNeeds: string[];
  durationSeconds: number;
}

export interface LaunchVideoBlueprintV1 {
  version: typeof BLUEPRINT_SCHEMA_VERSION;
  project: {
    name: string;
    slug: string;
    generatedAt: string;
    artifactRoot: string;
  };
  reference: {
    originalPath: string;
    artifactKey: string;
    durationSeconds: number | null;
    dimensions: {
      width: number | null;
      height: number | null;
      aspectRatio: string | null;
    };
    analysisPaths: string[];
  };
  assets: {
    product: string[];
    brand: string[];
    proof: string[];
    ui: string[];
    extra: string[];
    missing: string[];
  };
  style: {
    northStar: string;
    guardrails: string[];
    referenceNotes: string[];
  };
  audio: {
    voiceoverStatus: "pending" | "ready";
    soundtrackDirection: string[];
    eventsPath: string;
    transcriptPath: string;
  };
  performance: {
    targetDurationSeconds: number | null;
    hookTargetSeconds: number;
    primaryCTA: string;
    successCriteria: string[];
  };
  editorial: {
    familySpecVersion: typeof LAUNCH_FAMILY_SPEC_VERSION;
    arcSummary: string;
    notes: string[];
  };
  scenes: BlueprintScene[];
  judge: {
    status: "pending" | "reviewed";
    judgePath: string;
    thresholds: Record<string, number>;
  };
}

export interface JudgeOutput {
  version: typeof JUDGE_SCHEMA_VERSION;
  generatedAt: string;
  artifactRoot: string;
  summary: string;
  scores: Record<string, number>;
  top_fixes: string[];
  revision_notes: string[];
  approved: boolean;
}
