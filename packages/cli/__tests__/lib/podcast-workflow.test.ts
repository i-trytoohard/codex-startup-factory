import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { OrchestratorConfig, Session, SessionManager } from "@aoagents/ao-core";
import { createPodcastWorkflow, parsePersonaInput } from "../../src/lib/podcast-workflow.js";

function makeSession(id: string): Session {
  return {
    id,
    projectId: "my-app",
    status: "working",
    activity: "active",
    branch: `session/${id}`,
    issueId: null,
    pr: null,
    workspacePath: `/tmp/${id}`,
    runtimeHandle: { id: `rt-${id}`, runtimeName: "mock", data: {} },
    agentInfo: null,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    metadata: {},
  };
}

describe("podcast workflow", () => {
  let tmpDir: string;
  let config: OrchestratorConfig;
  let originalExaKey: string | undefined;
  let originalFirecrawlKey: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ao-podcast-workflow-"));
    mkdirSync(join(tmpDir, "repo"), { recursive: true });
    writeFileSync(join(tmpDir, "agent-orchestrator.yaml"), "projects: {}\n");

    config = {
      configPath: join(tmpDir, "agent-orchestrator.yaml"),
      port: 3000,
      power: { preventIdleSleep: false },
      readyThresholdMs: 300_000,
      defaults: {
        runtime: "tmux",
        agent: "codex",
        workspace: "worktree",
        notifiers: [],
      },
      projects: {
        "my-app": {
          name: "My App",
          path: join(tmpDir, "repo"),
          defaultBranch: "main",
          sessionPrefix: "app",
        },
      },
      notifiers: {},
      notificationRouting: {},
      reactions: {},
    };

    originalExaKey = process.env.EXA_API_KEY;
    originalFirecrawlKey = process.env.FIRECRAWL_API_KEY;
    delete process.env.EXA_API_KEY;
    delete process.env.FIRECRAWL_API_KEY;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    if (originalExaKey) {
      process.env.EXA_API_KEY = originalExaKey;
    } else {
      delete process.env.EXA_API_KEY;
    }
    if (originalFirecrawlKey) {
      process.env.FIRECRAWL_API_KEY = originalFirecrawlKey;
    } else {
      delete process.env.FIRECRAWL_API_KEY;
    }
  });

  it("parses persona time anchors", () => {
    expect(parsePersonaInput("Nikola Tesla@1899")).toEqual({
      raw: "Nikola Tesla@1899",
      name: "Nikola Tesla",
      timeframe: "1899",
    });
    expect(parsePersonaInput("Albert Einstein")).toEqual({
      raw: "Albert Einstein",
      name: "Albert Einstein",
      timeframe: undefined,
    });
  });

  it("creates podcast research artifacts and spawns instructor/persona sessions", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("w/api.php")) {
        return {
          ok: true,
          json: async () => [
            "Nikola Tesla",
            ["Nikola Tesla"],
            ["inventor"],
            ["https://en.wikipedia.org/wiki/Nikola_Tesla"],
          ],
        };
      }
      if (url.includes("/page/summary/")) {
        return {
          ok: true,
          json: async () => ({
            extract: "Nikola Tesla was a Serbian-American inventor known for AC power systems.",
            content_urls: {
              desktop: {
                page: "https://en.wikipedia.org/wiki/Nikola_Tesla",
              },
            },
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const sessionManager = {
      spawn: vi
        .fn()
        .mockResolvedValueOnce(makeSession("app-1"))
        .mockResolvedValueOnce(makeSession("app-2")),
      spawnOrchestrator: vi.fn().mockResolvedValue(makeSession("app-orchestrator-1")),
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionManager;

    const result = await createPodcastWorkflow({
      config,
      sessionManager,
      projectId: "my-app",
      topic: "How electricity changes civilization",
      personas: [parsePersonaInput("Nikola Tesla@1899"), parsePersonaInput("Albert Einstein@1935")],
      audience: "Curious founders",
      style: "debate",
      goal: "Make the ideas feel historically grounded",
      rounds: 3,
    });

    expect(result.personas).toHaveLength(2);
    expect(result.instructor.id).toBe("app-orchestrator-1");

    expect((sessionManager.spawn as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        projectId: "my-app",
        promptMode: "raw",
        prompt: expect.stringContaining("Prepare an opening stance"),
        systemPrompt: expect.stringContaining("You are the persona agent for Nikola Tesla."),
        metadata: expect.objectContaining({
          workflowType: "podcast",
          podcastRole: "persona",
          personaName: "Nikola Tesla",
        }),
      }),
    );

    expect((sessionManager.spawnOrchestrator as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        projectId: "my-app",
        systemPrompt: expect.stringContaining("You are the instructor agent for a podcast workflow."),
        metadata: expect.objectContaining({
          workflowType: "podcast",
          podcastRole: "instructor",
        }),
      }),
    );

    expect((sessionManager.send as ReturnType<typeof vi.fn>).mock.calls).toEqual(
      expect.arrayContaining([
        [
          "app-orchestrator-1",
          expect.stringContaining("Persona sessions:"),
        ],
        [
          "app-1",
          expect.stringContaining("The moderator for this episode is app-orchestrator-1."),
        ],
        [
          "app-2",
          expect.stringContaining("The moderator for this episode is app-orchestrator-1."),
        ],
      ]),
    );

    const brief = readFileSync(join(result.artifactDir, "brief.md"), "utf-8");
    expect(brief).toContain("How electricity changes civilization");
    expect(brief).toContain("Nikola Tesla");

    const researchJson = readFileSync(join(result.artifactDir, "research.json"), "utf-8");
    expect(researchJson).toContain("\"episodeId\"");
    expect(researchJson).toContain("Albert Einstein");
    expect(result.providersUsed).toContain("wikipedia");
  });
});
