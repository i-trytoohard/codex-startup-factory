import chalk from "chalk";
import ora from "ora";
import type { Command } from "commander";
import { loadConfig } from "@aoagents/ao-core";
import { getSessionManager } from "../lib/create-session-manager.js";
import { createPodcastWorkflow, parsePersonaInput } from "../lib/podcast-workflow.js";
import { preflight } from "../lib/preflight.js";
import { autoDetectProject } from "../lib/project-resolution.js";
import { getRunning } from "../lib/running-state.js";

function collectRepeated(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parseRounds(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
    throw new Error("rounds must be an integer between 1 and 12");
  }
  return parsed;
}

async function warnIfAONotRunning(projectId: string): Promise<void> {
  const running = await getRunning();
  if (!running) {
    console.log(
      chalk.yellow(
        "⚠ AO is not running — lifecycle polling is inactive. Run `ao start` so the podcast workflow is tracked.",
      ),
    );
    return;
  }

  if (!running.projects.includes(projectId)) {
    console.log(
      chalk.yellow(
        `⚠ The running AO instance (pid ${running.pid}) is not polling project "${projectId}". Run \`ao start ${projectId}\` so the podcast workflow is tracked.`,
      ),
    );
  }
}

async function runPodcastPreflight(projectId: string): Promise<void> {
  const config = loadConfig();
  const project = config.projects[projectId];
  const runtime = project?.runtime ?? config.defaults.runtime;
  if (runtime === "tmux") {
    await preflight.checkTmux();
  }
}

export function registerPodcast(program: Command): void {
  const podcast = program.command("podcast").description("Create persona-driven podcast workflows");

  podcast
    .command("create")
    .description("Create an instructor session and persona sessions for a podcast episode")
    .requiredOption("--topic <text>", "Podcast topic")
    .requiredOption(
      "--persona <name[@timeframe]>",
      "Persona name, optionally anchored to a timeframe like 'Nikola Tesla@1899'",
      collectRepeated,
      [],
    )
    .option("--project <id>", "Explicit project ID (otherwise auto-detected)")
    .option("--audience <text>", "Target audience for the episode")
    .option("--style <text>", "Conversation style, e.g. debate, classroom, interview")
    .option("--goal <text>", "Desired episode goal or takeaway")
    .option("--rounds <count>", "How many moderator-led rounds to run", parseRounds, 4)
    .option("--source <url>", "Extra source URL to prioritize in the research pack", collectRepeated, [])
    .action(
      async (opts: {
        topic: string;
        persona: string[];
        project?: string;
        audience?: string;
        style?: string;
        goal?: string;
        rounds: number;
        source: string[];
      }) => {
        if (opts.persona.length < 2) {
          console.error(chalk.red("Provide at least two --persona values for a podcast conversation."));
          process.exit(1);
        }

        const topic = opts.topic.trim();
        if (topic.length === 0 || topic.length > 500) {
          console.error(chalk.red("topic must be between 1 and 500 characters"));
          process.exit(1);
        }

        const config = loadConfig();
        const projectId = opts.project ?? autoDetectProject(config);
        if (!config.projects[projectId]) {
          console.error(chalk.red(`Unknown project: ${projectId}`));
          process.exit(1);
        }

        const spinner = ora("Building podcast workflow").start();

        try {
          await runPodcastPreflight(projectId);
          await warnIfAONotRunning(projectId);

          spinner.text = "Researching personas and spawning sessions";
          const sessionManager = await getSessionManager(config);
          const result = await createPodcastWorkflow({
            config,
            sessionManager,
            projectId,
            topic,
            personas: opts.persona.map(parsePersonaInput),
            audience: opts.audience?.trim() || undefined,
            style: opts.style?.trim() || undefined,
            goal: opts.goal?.trim() || undefined,
            rounds: opts.rounds,
            extraSources: opts.source,
          });

          spinner.succeed(`Podcast workflow ${chalk.green(result.episodeId)} created`);
          console.log(`  Instructor: ${chalk.cyan(result.instructor.id)}`);
          console.log(
            `  Personas:   ${result.personas.map((session) => chalk.cyan(session.id)).join(", ")}`,
          );
          console.log(`  Research:   ${chalk.dim(result.artifactDir)}`);
          console.log(
            `  Providers:  ${
              result.providersUsed.length > 0
                ? result.providersUsed.join(", ")
                : "wikipedia fallback"
            }`,
          );
        } catch (err) {
          spinner.fail("Failed to create podcast workflow");
          console.error(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`));
          process.exit(1);
        }
      },
    );
}
