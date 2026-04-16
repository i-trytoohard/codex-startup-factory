import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionManager } from "@aoagents/ao-core";

const { mockConfigRef, mockSessionManager, mockCreatePodcastWorkflow, mockGetRunning } = vi.hoisted(
  () => ({
    mockConfigRef: { current: null as Record<string, unknown> | null },
    mockSessionManager: {} as SessionManager,
    mockCreatePodcastWorkflow: vi.fn(),
    mockGetRunning: vi.fn(),
  }),
);

const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  stop: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  text: "",
};

vi.mock("ora", () => ({
  default: () => mockSpinner,
}));

vi.mock("@aoagents/ao-core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadConfig: () => mockConfigRef.current,
  };
});

vi.mock("../../src/lib/create-session-manager.js", () => ({
  getSessionManager: async () => mockSessionManager,
}));

vi.mock("../../src/lib/podcast-workflow.js", () => ({
  createPodcastWorkflow: (...args: unknown[]) => mockCreatePodcastWorkflow(...args),
  parsePersonaInput: (raw: string) => {
    const match = /^(?<name>.+?)(?:@(?<timeframe>[^@]+))?$/.exec(raw.trim());
    return {
      raw,
      name: match?.groups?.["name"]?.trim() ?? raw.trim(),
      timeframe: match?.groups?.["timeframe"]?.trim() || undefined,
    };
  },
}));

vi.mock("../../src/lib/preflight.js", () => ({
  preflight: {
    checkTmux: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../src/lib/running-state.js", () => ({
  getRunning: () => mockGetRunning(),
}));

import { Command } from "commander";
import { registerPodcast } from "../../src/commands/podcast.js";

describe("podcast command", () => {
  let program: Command;

  beforeEach(() => {
    mockConfigRef.current = {
      configPath: "/tmp/agent-orchestrator.yaml",
      port: 3000,
      readyThresholdMs: 300_000,
      power: { preventIdleSleep: false },
      defaults: {
        runtime: "tmux",
        agent: "codex",
        workspace: "worktree",
        notifiers: [],
      },
      projects: {
        "my-app": {
          name: "My App",
          path: "/tmp/repo",
          defaultBranch: "main",
          sessionPrefix: "app",
        },
      },
      notifiers: {},
      notificationRouting: {},
      reactions: {},
    } as Record<string, unknown>;
    mockCreatePodcastWorkflow.mockReset();
    mockGetRunning.mockResolvedValue({ pid: 1234, port: 3000, startedAt: "", projects: ["my-app"] });
    program = new Command();
    program.exitOverride();
    registerPodcast(program);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to createPodcastWorkflow with parsed personas", async () => {
    mockCreatePodcastWorkflow.mockResolvedValue({
      episodeId: "podcast-123",
      artifactDir: "/tmp/podcasts/podcast-123",
      instructor: { id: "app-orchestrator-1" },
      personas: [{ id: "app-1" }, { id: "app-2" }],
      providersUsed: ["wikipedia"],
      research: [],
    });

    await program.parseAsync([
      "node",
      "test",
      "podcast",
      "create",
      "--topic",
      "Future of science",
      "--persona",
      "Nikola Tesla@1899",
      "--persona",
      "Albert Einstein@1935",
      "--style",
      "debate",
      "--rounds",
      "3",
    ]);

    expect(mockCreatePodcastWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "my-app",
        topic: "Future of science",
        style: "debate",
        rounds: 3,
        personas: [
          { raw: "Nikola Tesla@1899", name: "Nikola Tesla", timeframe: "1899" },
          { raw: "Albert Einstein@1935", name: "Albert Einstein", timeframe: "1935" },
        ],
      }),
    );
  });

  it("fails when fewer than two personas are provided", async () => {
    await expect(
      program.parseAsync([
        "node",
        "test",
        "podcast",
        "create",
        "--topic",
        "Future of science",
        "--persona",
        "Nikola Tesla@1899",
      ]),
    ).rejects.toThrow("process.exit(1)");
  });
});
