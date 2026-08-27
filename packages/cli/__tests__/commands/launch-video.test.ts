import { describe, it, expect, beforeEach, vi } from "vitest";
import { Command } from "commander";

const {
  mockAnalyzeReferenceVideo,
  mockGenerateBlueprint,
  mockCreateBuildPlan,
  mockRunJudge,
  mockCreateRevisionPlan,
} = vi.hoisted(() => ({
  mockAnalyzeReferenceVideo: vi.fn(),
  mockGenerateBlueprint: vi.fn(),
  mockCreateBuildPlan: vi.fn(),
  mockRunJudge: vi.fn(),
  mockCreateRevisionPlan: vi.fn(),
}));

vi.mock("../../src/lib/launch-video/pipeline.js", () => ({
  analyzeReferenceVideo: (...args: unknown[]) => mockAnalyzeReferenceVideo(...args),
  createBuildPlan: (...args: unknown[]) => mockCreateBuildPlan(...args),
  createRevisionPlan: (...args: unknown[]) => mockCreateRevisionPlan(...args),
  generateBlueprint: (...args: unknown[]) => mockGenerateBlueprint(...args),
  runJudge: (...args: unknown[]) => mockRunJudge(...args),
  summarizeAnalyzeResult: vi.fn().mockReturnValue("analyze-summary"),
  summarizeBlueprintResult: vi.fn().mockReturnValue("blueprint-summary"),
  summarizeBuildResult: vi.fn().mockReturnValue("build-summary"),
  summarizeJudgeResult: vi.fn().mockReturnValue("judge-summary"),
  summarizeReviseResult: vi.fn().mockReturnValue("revise-summary"),
}));

import { registerLaunchVideo } from "../../src/commands/launch-video.js";

describe("registerLaunchVideo", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerLaunchVideo(program);
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockAnalyzeReferenceVideo.mockReset().mockResolvedValue({});
    mockGenerateBlueprint.mockReset().mockResolvedValue({});
    mockCreateBuildPlan.mockReset().mockResolvedValue({});
    mockRunJudge.mockReset().mockResolvedValue({});
    mockCreateRevisionPlan.mockReset().mockResolvedValue({});
  });

  it("runs analyze with the expected options", async () => {
    await program.parseAsync([
      "node",
      "test",
      "launch-video",
      "analyze",
      "--input",
      "/tmp/reference.mp4",
      "--project-name",
      "Demo",
    ]);

    expect(mockAnalyzeReferenceVideo).toHaveBeenCalledWith({
      force: undefined,
      inputPath: "/tmp/reference.mp4",
      outputRoot: "/Users/suraj.markupgmail.com/Desktop/video-hackathon-mvp",
      projectName: "Demo",
    });
  });

  it("supports blueprint, build, judge, and revise subcommands", async () => {
    await program.parseAsync([
      "node",
      "test",
      "launch-video",
      "blueprint",
      "--artifact-dir",
      "/tmp/bundle",
    ]);
    await program.parseAsync([
      "node",
      "test",
      "launch-video",
      "build",
      "--artifact-dir",
      "/tmp/bundle",
    ]);
    await program.parseAsync([
      "node",
      "test",
      "launch-video",
      "judge",
      "--artifact-dir",
      "/tmp/bundle",
    ]);
    await program.parseAsync([
      "node",
      "test",
      "launch-video",
      "revise",
      "--artifact-dir",
      "/tmp/bundle",
    ]);

    expect(mockGenerateBlueprint).toHaveBeenCalledTimes(1);
    expect(mockCreateBuildPlan).toHaveBeenCalledTimes(1);
    expect(mockRunJudge).toHaveBeenCalledTimes(1);
    expect(mockCreateRevisionPlan).toHaveBeenCalledTimes(1);
  });
});
