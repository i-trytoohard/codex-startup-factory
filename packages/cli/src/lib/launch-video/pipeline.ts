import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { exec } from "../shell.js";
import { createBlueprintSceneDefaults, launchFamilySpecV1 } from "./spec.js";
import type {
  AnalysisScene,
  ArtifactPaths,
  AudioEvent,
  BlueprintScene,
  EditorialAnalysis,
  JudgeOutput,
  LaunchVideoBlueprintV1,
  MotionAnalysis,
  ReferenceMetadata,
  StyleAnalysis,
  TranscriptOutput,
} from "./types.js";
import {
  BLUEPRINT_SCHEMA_VERSION,
  JUDGE_SCHEMA_VERSION,
  LAUNCH_FAMILY_SPEC_VERSION,
} from "./types.js";

interface ToolchainAvailability {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  swiftAvailable: boolean;
  whisperAvailable: boolean;
}

interface InspectResult {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  nominalFrameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  hasAudio: boolean;
}

interface KeyframeRecord {
  index: number;
  timeSeconds: number;
  path: string;
}

interface AnalyzeOptions {
  inputPath: string;
  outputRoot?: string;
  force?: boolean;
  projectName?: string;
}

interface CommonCommandOptions {
  inputPath?: string;
  artifactDir?: string;
  outputRoot?: string;
  force?: boolean;
  projectName?: string;
}

export interface AnalyzeResult {
  artifactPaths: ArtifactPaths;
  metadata: ReferenceMetadata;
  cached: boolean;
}

export interface BlueprintResult {
  artifactPaths: ArtifactPaths;
  blueprint: LaunchVideoBlueprintV1;
  cached: boolean;
}

export interface JudgeResult {
  artifactPaths: ArtifactPaths;
  judge: JudgeOutput;
  cached: boolean;
}

export interface BuildResult {
  artifactPaths: ArtifactPaths;
  renderPlanPath: string;
  cached: boolean;
}

export interface ReviseResult {
  artifactPaths: ArtifactPaths;
  revisionPlanPath: string;
  cached: boolean;
}

const DEFAULT_OUTPUT_ROOT = "/Users/suraj.markupgmail.com/Desktop/video-hackathon-mvp";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+/g, "")
      .replace(/-+$/g, "") || "reference"
  );
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toAspectRatio(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const rounded = (width / height).toFixed(2);
  return `${rounded}:1`;
}

function durationBucket(durationSeconds: number | null): "short" | "medium" | "long" {
  if (durationSeconds === null || durationSeconds <= 30) return "short";
  if (durationSeconds <= 90) return "medium";
  return "long";
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJsonFile(path: string, value: unknown): void {
  writeFileSync(path, prettyJson(value), "utf8");
}

function writeTextFile(path: string, value: string): void {
  writeFileSync(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function resolveArtifactPaths(
  inputPath: string,
  outputRoot = DEFAULT_OUTPUT_ROOT,
): ArtifactPaths {
  const absoluteInputPath = resolve(inputPath);
  const stats = statSync(absoluteInputPath);
  const baseName = basename(absoluteInputPath);
  const artifactKey = `${baseName}--${stableHash(`${absoluteInputPath}:${stats.size}:${stats.mtimeMs}`).slice(0, 8)}`;
  const rootDir = resolve(outputRoot, artifactKey);

  return {
    rootDir,
    referenceDir: join(rootDir, "reference"),
    assetsDir: join(rootDir, "assets"),
    analysisDir: join(rootDir, "analysis"),
    blueprintsDir: join(rootDir, "blueprints"),
    judgeDir: join(rootDir, "judge"),
    rendersDir: join(rootDir, "renders"),
    keyframesDir: join(rootDir, "analysis", "keyframes"),
  };
}

function ensureArtifactTree(paths: ArtifactPaths): void {
  for (const path of [
    paths.rootDir,
    paths.referenceDir,
    paths.assetsDir,
    paths.analysisDir,
    paths.blueprintsDir,
    paths.judgeDir,
    paths.rendersDir,
    paths.keyframesDir,
  ]) {
    mkdirSync(path, { recursive: true });
  }
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    await exec("zsh", ["-lc", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

async function detectToolchain(): Promise<ToolchainAvailability> {
  const [ffmpegAvailable, ffprobeAvailable, swiftAvailable, whisperAvailable] = await Promise.all([
    commandAvailable("ffmpeg"),
    commandAvailable("ffprobe"),
    commandAvailable("swift"),
    commandAvailable("whisper"),
  ]);

  return { ffmpegAvailable, ffprobeAvailable, swiftAvailable, whisperAvailable };
}

function swiftToolPath(): string {
  return resolve(
    decodeURIComponent(
      new URL("../../assets/launch-video/avfoundation-tool.swift", import.meta.url).pathname,
    ),
  );
}

async function inspectWithSwift(inputPath: string): Promise<InspectResult> {
  const tempDir = mkdtempSync(join(tmpdir(), "ao-launch-video-"));
  const tempScriptPath = join(tempDir, "avfoundation-tool.swift");
  writeFileSync(tempScriptPath, readFileSync(swiftToolPath(), "utf8"), "utf8");

  const { stdout } = await exec("swift", [tempScriptPath, "inspect", resolve(inputPath)]);
  const parsed = JSON.parse(stdout) as {
    durationSeconds?: number;
    width?: number;
    height?: number;
    nominalFrameRate?: number;
    videoCodec?: string;
    audioCodec?: string;
    hasAudio?: boolean;
  };

  return {
    durationSeconds: parsed.durationSeconds ?? null,
    width: parsed.width ?? null,
    height: parsed.height ?? null,
    nominalFrameRate: parsed.nominalFrameRate ?? null,
    videoCodec: parsed.videoCodec ?? null,
    audioCodec: parsed.audioCodec ?? null,
    hasAudio: parsed.hasAudio ?? false,
  };
}

async function inspectWithMdls(inputPath: string): Promise<InspectResult> {
  const { stdout } = await exec("mdls", [
    "-name",
    "kMDItemDurationSeconds",
    "-name",
    "kMDItemPixelWidth",
    "-name",
    "kMDItemPixelHeight",
    "-name",
    "kMDItemCodecs",
    resolve(inputPath),
  ]);

  const durationMatch = stdout.match(/kMDItemDurationSeconds\s+=\s+([0-9.]+)/);
  const widthMatch = stdout.match(/kMDItemPixelWidth\s+=\s+([0-9]+)/);
  const heightMatch = stdout.match(/kMDItemPixelHeight\s+=\s+([0-9]+)/);
  const codecMatches = [...stdout.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  return {
    durationSeconds: durationMatch ? Number(durationMatch[1]) : null,
    width: widthMatch ? Number(widthMatch[1]) : null,
    height: heightMatch ? Number(heightMatch[1]) : null,
    nominalFrameRate: null,
    videoCodec: codecMatches[0] ?? null,
    audioCodec: codecMatches[1] ?? null,
    hasAudio: codecMatches.length > 1,
  };
}

async function inspectReference(
  inputPath: string,
  toolchain: ToolchainAvailability,
): Promise<InspectResult> {
  if (toolchain.swiftAvailable) {
    return inspectWithSwift(inputPath);
  }

  return inspectWithMdls(inputPath);
}

function buildScenePlan(durationSeconds: number | null): Array<{
  role: AnalysisScene["role"];
  beatIndex: number | null;
  label: string;
  startSeconds: number;
  endSeconds: number;
  intent: string;
}> {
  const safeDuration = durationSeconds && durationSeconds > 0 ? durationSeconds : 60;
  const ratios = [
    {
      role: "hook",
      beatIndex: null,
      label: "Hook",
      ratio: 0.08,
      intent: "Open on the strongest promise or transformation.",
    },
    {
      role: "before",
      beatIndex: null,
      label: "Before",
      ratio: 0.14,
      intent: "Clarify the pain or baseline state.",
    },
    {
      role: "after",
      beatIndex: null,
      label: "After",
      ratio: 0.16,
      intent: "Reveal the improved state quickly.",
    },
    {
      role: "value-beats",
      beatIndex: 0,
      label: "Value Beat 1",
      ratio: 0.16,
      intent: "Introduce the first concrete proof point.",
    },
    {
      role: "value-beats",
      beatIndex: 1,
      label: "Value Beat 2",
      ratio: 0.15,
      intent: "Stack a second specific benefit.",
    },
    {
      role: "value-beats",
      beatIndex: 2,
      label: "Value Beat 3",
      ratio: 0.15,
      intent: "Land another differentiator or social proof.",
    },
    {
      role: "outro",
      beatIndex: null,
      label: "Outro",
      ratio: 0.16,
      intent: "Deliver CTA and memory anchor.",
    },
  ] as const;

  let cursor = 0;
  return ratios.map((item, index) => {
    const remainingDuration = safeDuration - cursor;
    const rawDuration = index === ratios.length - 1 ? remainingDuration : safeDuration * item.ratio;
    const sceneDuration = Number(Math.max(2, rawDuration).toFixed(2));
    const startSeconds = Number(cursor.toFixed(2));
    const endSeconds = Number(Math.min(safeDuration, cursor + sceneDuration).toFixed(2));
    cursor = endSeconds;

    return {
      role: item.role,
      beatIndex: item.beatIndex,
      label: item.label,
      startSeconds,
      endSeconds,
      intent: item.intent,
    };
  });
}

function sceneMidpoints(scenes: ReturnType<typeof buildScenePlan>): number[] {
  return scenes.map((scene) => Number(((scene.startSeconds + scene.endSeconds) / 2).toFixed(2)));
}

async function extractKeyframes(
  inputPath: string,
  outputDir: string,
  times: number[],
  toolchain: ToolchainAvailability,
): Promise<KeyframeRecord[]> {
  if (times.length === 0) return [];
  if (!toolchain.swiftAvailable) return [];

  const tempDir = mkdtempSync(join(tmpdir(), "ao-launch-video-"));
  const tempScriptPath = join(tempDir, "avfoundation-tool.swift");
  writeFileSync(tempScriptPath, readFileSync(swiftToolPath(), "utf8"), "utf8");

  const { stdout } = await exec("swift", [
    tempScriptPath,
    "keyframes",
    resolve(inputPath),
    outputDir,
    times.map((value) => value.toFixed(2)).join(","),
  ]);

  return JSON.parse(stdout) as KeyframeRecord[];
}

function buildScenes(durationSeconds: number | null, keyframes: KeyframeRecord[]): AnalysisScene[] {
  const plan = buildScenePlan(durationSeconds);
  return plan.map((scene, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    role: scene.role,
    beatIndex: scene.beatIndex,
    label: scene.label,
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    durationSeconds: Number((scene.endSeconds - scene.startSeconds).toFixed(2)),
    keyframePath: keyframes[index]?.path ?? null,
    intent: scene.intent,
    notes: [
      "Scene boundaries are heuristic duration slices for the hackathon MVP.",
      "Swap in model-based or ffmpeg scene detection later without changing the artifact contract.",
    ],
    detectionMethod: "heuristic-duration-slices",
  }));
}

function buildTranscriptStub(
  durationSeconds: number | null,
  toolchain: ToolchainAvailability,
): TranscriptOutput {
  return {
    status: "stub",
    provider: "none",
    language: null,
    segments: [],
    todo: toolchain.whisperAvailable
      ? ["Wire the Whisper CLI into this contract and replace the stub segments."]
      : [
          "Install Whisper or another transcription backend to replace this stub.",
          `Reference duration is ${durationSeconds?.toFixed(2) ?? "unknown"} seconds; preserve this file path for cache reuse.`,
        ],
  };
}

function buildAudioEvents(scenes: AnalysisScene[], hasAudio: boolean): AudioEvent[] {
  const events: AudioEvent[] = [];

  if (hasAudio) {
    events.push({
      id: "audio-001",
      type: "music-bed",
      startSeconds: 0,
      endSeconds: scenes.at(-1)?.endSeconds ?? 0,
      inferred: true,
      notes:
        "Reference contains an audio track; assume a consistent score bed until actual separation is added.",
    });
  }

  for (const scene of scenes) {
    events.push({
      id: `audio-${scene.id}`,
      type: scene.role === "outro" ? "cta-hit" : scene.role === "hook" ? "riser" : "whoosh",
      startSeconds: scene.startSeconds,
      endSeconds: Math.min(scene.endSeconds, scene.startSeconds + 0.8),
      inferred: true,
      notes: `Suggested accent aligned to ${scene.role}${scene.beatIndex !== null ? ` beat ${scene.beatIndex + 1}` : ""}.`,
    });
  }

  events.push({
    id: "audio-voiceover-placeholder",
    type: "voiceover-placeholder",
    startSeconds: 0,
    endSeconds: scenes.at(-1)?.endSeconds ?? 0,
    inferred: true,
    notes: "Reserve room for future VO or caption-led copy even before assets are supplied.",
  });

  return events;
}

function buildStyleAnalysis(metadata: InspectResult, scenes: AnalysisScene[]): StyleAnalysis {
  return {
    summary:
      "Reference suggests a short-form launch edit built around rapid scene progression and concise visual contrast.",
    launchFamilyFit:
      "Strong fit for a launch-family blueprint with a front-loaded hook and modular proof beats.",
    format: {
      aspectRatio: toAspectRatio(metadata.width, metadata.height),
      resolution: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : null,
      durationBucket: durationBucket(metadata.durationSeconds),
    },
    notes: [
      `Detected ${scenes.length} scene slices, which maps cleanly onto hook / before / after / value-beats / outro roles.`,
      metadata.width && metadata.height
        ? `Reference is ${metadata.width}x${metadata.height}, so future assets should be framed for the same delivery ratio unless intentionally reformatted.`
        : "Resolution is unavailable; keep framing flexible until deeper inspection is added.",
      "Style extraction is heuristic in this MVP and should be upgraded with vision analysis later.",
    ],
  };
}

function buildMotionAnalysis(
  durationSeconds: number | null,
  scenes: AnalysisScene[],
): MotionAnalysis {
  const averageSceneDuration =
    scenes.length > 0
      ? scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) / scenes.length
      : 0;
  const pace: MotionAnalysis["pace"] =
    averageSceneDuration <= 6 ? "fast" : averageSceneDuration <= 10 ? "medium" : "slow";

  return {
    summary: "Motion read is inferred from scene cadence rather than optical flow in this MVP.",
    pace,
    cameraEnergy: durationSeconds !== null && durationSeconds <= 90 ? "high" : "medium",
    notes: [
      `Average scene duration is ${averageSceneDuration.toFixed(2)} seconds.`,
      "Keyframe spacing is designed to give one representative still per launch-family beat.",
      "Upgrade path: replace this with frame-difference or motion-vector analysis when ffmpeg/OpenCV is available.",
    ],
  };
}

function buildEditorialAnalysis(scenes: AnalysisScene[]): EditorialAnalysis {
  return {
    summary:
      "Editorial structure is anchored to the launch-family spec and intentionally modular so later loops can swap assets without changing the whole cut.",
    structure: launchFamilySpecV1.map((item) => ({
      role: item.role,
      purpose: item.objective,
    })),
    notes: [
      `Scenes currently cover ${scenes.map((scene) => scene.role).join(", ")}.`,
      "Blueprint seed is derived from these roles rather than final asset decisions.",
      "This keeps the family reusable when product shots, logos, and proof assets arrive later.",
    ],
  };
}

function buildBlueprint(
  projectName: string,
  artifactPaths: ArtifactPaths,
  metadata: ReferenceMetadata,
  scenes: AnalysisScene[],
  style: StyleAnalysis,
  editorial: EditorialAnalysis,
  assetsOverride?: Partial<LaunchVideoBlueprintV1["assets"]>,
): LaunchVideoBlueprintV1 {
  const blueprintScenes: BlueprintScene[] = scenes.map((scene) => {
    const defaults = createBlueprintSceneDefaults(scene.role, scene.beatIndex);
    return {
      id: scene.id,
      role: scene.role,
      beatIndex: scene.beatIndex,
      objective: scene.intent,
      referenceSceneId: scene.id,
      sourceKeyframePath: scene.keyframePath,
      copyPrompt: defaults.copyPrompt,
      visualDirection: defaults.visualDirection,
      assetNeeds: defaults.assetNeeds,
      durationSeconds: scene.durationSeconds,
    };
  });

  return {
    version: BLUEPRINT_SCHEMA_VERSION,
    project: {
      name: projectName,
      slug: slugify(projectName),
      generatedAt: new Date().toISOString(),
      artifactRoot: artifactPaths.rootDir,
    },
    reference: {
      originalPath: metadata.originalPath,
      artifactKey: metadata.artifactKey,
      durationSeconds: metadata.durationSeconds,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
      },
      analysisPaths: [
        join(artifactPaths.analysisDir, "metadata.json"),
        join(artifactPaths.analysisDir, "scenes.json"),
        join(artifactPaths.analysisDir, "transcript.json"),
        join(artifactPaths.analysisDir, "audio-events.json"),
        join(artifactPaths.analysisDir, "style.json"),
        join(artifactPaths.analysisDir, "motion.json"),
        join(artifactPaths.analysisDir, "editorial.json"),
        join(artifactPaths.analysisDir, "blueprint-seed.json"),
        join(artifactPaths.analysisDir, "notes.md"),
      ],
    },
    assets: {
      product: assetsOverride?.product ?? [],
      brand: assetsOverride?.brand ?? [],
      proof: assetsOverride?.proof ?? [],
      ui: assetsOverride?.ui ?? [],
      extra: assetsOverride?.extra ?? [],
      missing: assetsOverride?.missing ?? [
        "Primary product footage or UI capture",
        "Brand lockup / logo",
        "Proof asset or customer signal",
      ],
    },
    style: {
      northStar: style.summary,
      guardrails: [
        "Keep the hook inside the first 3-5 seconds.",
        "Maintain modular proof beats that can be swapped independently.",
        "Prefer direct launch copy over abstract brand language.",
      ],
      referenceNotes: style.notes,
    },
    audio: {
      voiceoverStatus: "pending",
      soundtrackDirection: [
        "Use a driving score bed with clear transitions at scene boundaries.",
        "Leave room for caption-first or VO-first execution.",
      ],
      eventsPath: join(artifactPaths.analysisDir, "audio-events.json"),
      transcriptPath: join(artifactPaths.analysisDir, "transcript.json"),
    },
    performance: {
      targetDurationSeconds: metadata.durationSeconds,
      hookTargetSeconds: 3,
      primaryCTA: "Insert product CTA once user assets arrive.",
      successCriteria: [
        "Hook lands in first 3 seconds.",
        "At least three value beats are specific and evidence-backed.",
        "Outro ends on a clear next action.",
      ],
    },
    editorial: {
      familySpecVersion: LAUNCH_FAMILY_SPEC_VERSION,
      arcSummary: editorial.summary,
      notes: editorial.notes,
    },
    scenes: blueprintScenes,
    judge: {
      status: "pending",
      judgePath: join(artifactPaths.judgeDir, "judge-v1.json"),
      thresholds: {
        hook_strength: 8,
        clarity: 8,
        proof: 7,
        readiness: 7,
      },
    },
  };
}

function buildJudge(artifactRoot: string, blueprint: LaunchVideoBlueprintV1): JudgeOutput {
  const missingAssetPenalty = blueprint.assets.missing.length > 0 ? 2 : 0;
  const transcriptPenalty =
    readJsonFile<TranscriptOutput>(blueprint.audio.transcriptPath).status === "stub" ? 1 : 0;
  const scores = {
    hook_strength: blueprint.scenes.some((scene) => scene.role === "hook") ? 8 : 5,
    clarity: Math.max(5, 8 - transcriptPenalty),
    proof: Math.max(4, 8 - missingAssetPenalty),
    readiness: Math.max(4, 8 - missingAssetPenalty - transcriptPenalty),
  };
  const approved = Object.values(scores).every((score) => score >= 7);

  return {
    version: JUDGE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    artifactRoot,
    summary: approved
      ? "Blueprint is structurally ready for a first render pass."
      : "Blueprint structure is ready, but missing assets and transcript keep it in revision-needed state.",
    scores,
    top_fixes: [
      "Replace transcript stub with real transcription or locked copy.",
      "Add product, proof, and brand assets so value beats become concrete.",
      "Turn the render placeholder into a real preview once media generation is wired in.",
    ],
    revision_notes: [
      "Keep the launch-family scene roles intact during the first asset pass.",
      "Promote the strongest proof beat earlier if a standout asset appears.",
      "Use the judge output as a visible handoff point before automating revisions.",
    ],
    approved,
  };
}

function buildNotesMarkdown(
  metadata: ReferenceMetadata,
  scenes: AnalysisScene[],
  style: StyleAnalysis,
  motion: MotionAnalysis,
  editorial: EditorialAnalysis,
): string {
  const lines = [
    "# Reference Launch Video Notes",
    "",
    `- Reference: \`${metadata.originalPath}\``,
    `- Artifact key: \`${metadata.artifactKey}\``,
    `- Duration: ${metadata.durationSeconds?.toFixed(2) ?? "unknown"}s`,
    `- Resolution: ${metadata.width ?? "?"}x${metadata.height ?? "?"}`,
    `- Cache status: ${metadata.cacheStatus}`,
    "",
    "## Scene Map",
    "",
    ...scenes.map(
      (scene) =>
        `- ${scene.label} (${scene.role}${scene.beatIndex !== null ? ` ${scene.beatIndex + 1}` : ""}): ${scene.startSeconds.toFixed(2)}s - ${scene.endSeconds.toFixed(2)}s`,
    ),
    "",
    "## Style Notes",
    "",
    ...style.notes.map((note) => `- ${note}`),
    "",
    "## Motion Notes",
    "",
    ...motion.notes.map((note) => `- ${note}`),
    "",
    "## Editorial Notes",
    "",
    ...editorial.notes.map((note) => `- ${note}`),
    "",
    "## TODO",
    "",
    "- Replace heuristic scene slicing with detector-based segmentation when deeper tooling is available.",
    "- Replace transcript stub once Whisper or another transcription provider is installed.",
    "- Wire blueprint scenes into an actual renderer after user assets arrive.",
  ];

  return lines.join("\n");
}

function completeAnalysisExists(paths: ArtifactPaths): boolean {
  const requiredFiles = [
    join(paths.referenceDir, "reference.json"),
    join(paths.analysisDir, "metadata.json"),
    join(paths.analysisDir, "scenes.json"),
    join(paths.analysisDir, "transcript.json"),
    join(paths.analysisDir, "audio-events.json"),
    join(paths.analysisDir, "style.json"),
    join(paths.analysisDir, "motion.json"),
    join(paths.analysisDir, "editorial.json"),
    join(paths.analysisDir, "blueprint-seed.json"),
    join(paths.analysisDir, "notes.md"),
  ];

  return (
    requiredFiles.every((path) => existsSync(path)) && readdirSync(paths.keyframesDir).length > 0
  );
}

export async function analyzeReferenceVideo(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const absoluteInputPath = resolve(options.inputPath);
  const artifactPaths = resolveArtifactPaths(absoluteInputPath, options.outputRoot);
  ensureArtifactTree(artifactPaths);

  const stats = statSync(absoluteInputPath);
  const artifactKey = basename(artifactPaths.rootDir);
  const fingerprint = stableHash(`${absoluteInputPath}:${stats.size}:${stats.mtimeMs}`);
  const existingMetadataPath = join(artifactPaths.analysisDir, "metadata.json");
  if (!options.force && existsSync(existingMetadataPath) && completeAnalysisExists(artifactPaths)) {
    const existing = readJsonFile<ReferenceMetadata>(existingMetadataPath);
    if (existing.fingerprint === fingerprint) {
      return {
        artifactPaths,
        metadata: { ...existing, cacheStatus: "reused" },
        cached: true,
      };
    }
  }

  const toolchain = await detectToolchain();
  const inspectResult = await inspectReference(absoluteInputPath, toolchain);
  const plannedScenes = buildScenePlan(inspectResult.durationSeconds);
  const keyframeTimes = sceneMidpoints(plannedScenes);
  const keyframes = await extractKeyframes(
    absoluteInputPath,
    artifactPaths.keyframesDir,
    keyframeTimes,
    toolchain,
  );
  const scenes = buildScenes(inspectResult.durationSeconds, keyframes);
  const transcript = buildTranscriptStub(inspectResult.durationSeconds, toolchain);
  const audioEvents = buildAudioEvents(scenes, inspectResult.hasAudio);
  const style = buildStyleAnalysis(inspectResult, scenes);
  const motion = buildMotionAnalysis(inspectResult.durationSeconds, scenes);
  const editorial = buildEditorialAnalysis(scenes);

  const metadata: ReferenceMetadata = {
    originalPath: absoluteInputPath,
    fileName: basename(absoluteInputPath),
    artifactKey,
    fingerprint,
    durationSeconds: inspectResult.durationSeconds,
    width: inspectResult.width,
    height: inspectResult.height,
    aspectRatio: toAspectRatio(inspectResult.width, inspectResult.height),
    videoCodec: inspectResult.videoCodec,
    audioCodec: inspectResult.audioCodec,
    hasAudio: inspectResult.hasAudio,
    keyframeCount: keyframes.length,
    analyzedAt: new Date().toISOString(),
    cacheStatus: "generated",
    extraction: {
      ffmpegAvailable: toolchain.ffmpegAvailable,
      ffprobeAvailable: toolchain.ffprobeAvailable,
      swiftAvailable: toolchain.swiftAvailable,
      whisperAvailable: toolchain.whisperAvailable,
      sceneDetection: "heuristic-duration-slices",
      transcription: toolchain.whisperAvailable ? "whisper" : "stub-missing-dependency",
      keyframeExtractor: toolchain.swiftAvailable ? "swift-avfoundation" : "none",
    },
  };

  const blueprintSeed = buildBlueprint(
    options.projectName ?? "Launch Video MVP",
    artifactPaths,
    metadata,
    scenes,
    style,
    editorial,
  );

  writeJsonFile(join(artifactPaths.referenceDir, "reference.json"), {
    originalPath: absoluteInputPath,
    artifactKey,
    capturedAt: new Date().toISOString(),
    note: "Reference video remains in place; this file anchors the Desktop artifact bundle.",
  });
  writeTextFile(
    join(artifactPaths.assetsDir, "README.md"),
    [
      "# Assets Staging",
      "",
      "- Put future product, brand, proof, and UI assets here.",
      "- The MVP blueprint currently points to this folder but does not ingest new assets automatically yet.",
    ].join("\n"),
  );
  writeJsonFile(join(artifactPaths.analysisDir, "metadata.json"), metadata);
  writeJsonFile(join(artifactPaths.analysisDir, "scenes.json"), scenes);
  writeJsonFile(join(artifactPaths.analysisDir, "transcript.json"), transcript);
  writeJsonFile(join(artifactPaths.analysisDir, "audio-events.json"), audioEvents);
  writeJsonFile(join(artifactPaths.analysisDir, "style.json"), style);
  writeJsonFile(join(artifactPaths.analysisDir, "motion.json"), motion);
  writeJsonFile(join(artifactPaths.analysisDir, "editorial.json"), editorial);
  writeJsonFile(join(artifactPaths.analysisDir, "blueprint-seed.json"), blueprintSeed);
  writeTextFile(
    join(artifactPaths.analysisDir, "notes.md"),
    buildNotesMarkdown(metadata, scenes, style, motion, editorial),
  );

  return { artifactPaths, metadata, cached: false };
}

function resolveArtifactPathsFromOptions(options: CommonCommandOptions): ArtifactPaths {
  if (options.artifactDir) {
    const rootDir = resolve(options.artifactDir);
    return {
      rootDir,
      referenceDir: join(rootDir, "reference"),
      assetsDir: join(rootDir, "assets"),
      analysisDir: join(rootDir, "analysis"),
      blueprintsDir: join(rootDir, "blueprints"),
      judgeDir: join(rootDir, "judge"),
      rendersDir: join(rootDir, "renders"),
      keyframesDir: join(rootDir, "analysis", "keyframes"),
    };
  }

  if (!options.inputPath) {
    throw new Error("Provide either --artifact-dir or --input.");
  }

  return resolveArtifactPaths(options.inputPath, options.outputRoot);
}

function ensureAnalyzed(paths: ArtifactPaths): void {
  if (!completeAnalysisExists(paths)) {
    throw new Error(
      `Analysis bundle is incomplete at ${paths.rootDir}. Run 'ao launch-video analyze' first.`,
    );
  }
}

export async function generateBlueprint(
  options: CommonCommandOptions & { assetsPath?: string },
): Promise<BlueprintResult> {
  const artifactPaths = resolveArtifactPathsFromOptions(options);
  ensureArtifactTree(artifactPaths);
  ensureAnalyzed(artifactPaths);

  const blueprintPath = join(artifactPaths.blueprintsDir, "blueprint-v1.json");
  if (!options.force && existsSync(blueprintPath)) {
    return {
      artifactPaths,
      blueprint: readJsonFile<LaunchVideoBlueprintV1>(blueprintPath),
      cached: true,
    };
  }

  const metadata = readJsonFile<ReferenceMetadata>(
    join(artifactPaths.analysisDir, "metadata.json"),
  );
  const scenes = readJsonFile<AnalysisScene[]>(join(artifactPaths.analysisDir, "scenes.json"));
  const style = readJsonFile<StyleAnalysis>(join(artifactPaths.analysisDir, "style.json"));
  const editorial = readJsonFile<EditorialAnalysis>(
    join(artifactPaths.analysisDir, "editorial.json"),
  );
  const assetsOverride = options.assetsPath
    ? readJsonFile<Partial<LaunchVideoBlueprintV1["assets"]>>(resolve(options.assetsPath))
    : undefined;

  const blueprint = buildBlueprint(
    options.projectName ?? "Launch Video MVP",
    artifactPaths,
    metadata,
    scenes,
    style,
    editorial,
    assetsOverride,
  );
  writeJsonFile(blueprintPath, blueprint);
  return { artifactPaths, blueprint, cached: false };
}

export async function runJudge(options: CommonCommandOptions): Promise<JudgeResult> {
  const artifactPaths = resolveArtifactPathsFromOptions(options);
  ensureArtifactTree(artifactPaths);
  ensureAnalyzed(artifactPaths);

  const judgePath = join(artifactPaths.judgeDir, "judge-v1.json");
  if (!options.force && existsSync(judgePath)) {
    return {
      artifactPaths,
      judge: readJsonFile<JudgeOutput>(judgePath),
      cached: true,
    };
  }

  const blueprint = existsSync(join(artifactPaths.blueprintsDir, "blueprint-v1.json"))
    ? readJsonFile<LaunchVideoBlueprintV1>(join(artifactPaths.blueprintsDir, "blueprint-v1.json"))
    : (
        await generateBlueprint({
          artifactDir: artifactPaths.rootDir,
          projectName: options.projectName,
        })
      ).blueprint;
  const judge = buildJudge(artifactPaths.rootDir, blueprint);
  writeJsonFile(judgePath, judge);
  return { artifactPaths, judge, cached: false };
}

export async function createBuildPlan(options: CommonCommandOptions): Promise<BuildResult> {
  const artifactPaths = resolveArtifactPathsFromOptions(options);
  ensureArtifactTree(artifactPaths);
  ensureAnalyzed(artifactPaths);

  const buildPlanPath = join(artifactPaths.rendersDir, "preview-v1.md");
  if (!options.force && existsSync(buildPlanPath)) {
    return { artifactPaths, renderPlanPath: buildPlanPath, cached: true };
  }

  const blueprintPath = join(artifactPaths.blueprintsDir, "blueprint-v1.json");
  if (!existsSync(blueprintPath)) {
    await generateBlueprint({
      artifactDir: artifactPaths.rootDir,
      projectName: options.projectName,
    });
  }

  const buildPlan = [
    "# Preview Render Placeholder",
    "",
    `- Intended render path: \`${join(artifactPaths.rendersDir, "preview-v1.mp4")}\``,
    `- Blueprint source: \`${blueprintPath}\``,
    "- Status: placeholder for hackathon MVP",
    "",
    "## Manual Next Step",
    "",
    "1. Supply product, brand, proof, and UI assets.",
    "2. Render a first cut using the blueprint scene order and analysis keyframes.",
    "3. Replace this markdown placeholder with a real `preview-v1.mp4` when a renderer is wired in.",
  ].join("\n");
  writeTextFile(buildPlanPath, buildPlan);

  return { artifactPaths, renderPlanPath: buildPlanPath, cached: false };
}

export async function createRevisionPlan(options: CommonCommandOptions): Promise<ReviseResult> {
  const artifactPaths = resolveArtifactPathsFromOptions(options);
  ensureArtifactTree(artifactPaths);
  ensureAnalyzed(artifactPaths);

  const revisionPlanPath = join(artifactPaths.judgeDir, "revision-v1.json");
  if (!options.force && existsSync(revisionPlanPath)) {
    return { artifactPaths, revisionPlanPath, cached: true };
  }

  const judgePath = join(artifactPaths.judgeDir, "judge-v1.json");
  const judge = existsSync(judgePath)
    ? readJsonFile<JudgeOutput>(judgePath)
    : (await runJudge({ artifactDir: artifactPaths.rootDir, projectName: options.projectName }))
        .judge;

  writeJsonFile(revisionPlanPath, {
    version: "revision-v1",
    generatedAt: new Date().toISOString(),
    sourceJudgePath: judgePath,
    approved: judge.approved,
    queued_changes: judge.top_fixes,
    revision_notes: judge.revision_notes,
    next_blueprint_path: join(artifactPaths.blueprintsDir, "blueprint-v1.json"),
  });

  return { artifactPaths, revisionPlanPath, cached: false };
}

export function summarizeAnalyzeResult(result: AnalyzeResult): string {
  return [
    `artifact_root=${result.artifactPaths.rootDir}`,
    `cache=${result.cached ? "reused" : "generated"}`,
    `duration_seconds=${result.metadata.durationSeconds ?? "unknown"}`,
    `keyframes=${result.metadata.keyframeCount}`,
  ].join("\n");
}

export function summarizeBlueprintResult(result: BlueprintResult): string {
  return [
    `artifact_root=${result.artifactPaths.rootDir}`,
    `blueprint=${join(result.artifactPaths.blueprintsDir, "blueprint-v1.json")}`,
    `cache=${result.cached ? "reused" : "generated"}`,
  ].join("\n");
}

export function summarizeJudgeResult(result: JudgeResult): string {
  return [
    `artifact_root=${result.artifactPaths.rootDir}`,
    `judge=${join(result.artifactPaths.judgeDir, "judge-v1.json")}`,
    `approved=${result.judge.approved}`,
    `cache=${result.cached ? "reused" : "generated"}`,
  ].join("\n");
}

export function summarizeBuildResult(result: BuildResult): string {
  return [
    `artifact_root=${result.artifactPaths.rootDir}`,
    `render_plan=${result.renderPlanPath}`,
    `cache=${result.cached ? "reused" : "generated"}`,
  ].join("\n");
}

export function summarizeReviseResult(result: ReviseResult): string {
  return [
    `artifact_root=${result.artifactPaths.rootDir}`,
    `revision_plan=${result.revisionPlanPath}`,
    `cache=${result.cached ? "reused" : "generated"}`,
  ].join("\n");
}
