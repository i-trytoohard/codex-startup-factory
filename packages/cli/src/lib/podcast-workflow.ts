import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  getProjectBaseDir,
  type OrchestratorConfig,
  type Session,
  type SessionManager,
} from "@aoagents/ao-core";

const EXA_API_URL = process.env.EXA_API_URL ?? "https://api.exa.ai/search";
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev/v2/search";
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";

export interface PodcastPersonaInput {
  raw: string;
  name: string;
  timeframe?: string;
}

export interface PodcastWorkflowCreateOptions {
  config: OrchestratorConfig;
  sessionManager: SessionManager;
  projectId: string;
  topic: string;
  personas: PodcastPersonaInput[];
  audience?: string;
  style?: string;
  goal?: string;
  rounds?: number;
  extraSources?: string[];
}

export interface PodcastWorkflowResult {
  episodeId: string;
  artifactDir: string;
  instructor: Session;
  personas: Session[];
  providersUsed: string[];
  research: PodcastPersonaResearch[];
}

export interface PodcastPersonaResearch {
  persona: PodcastPersonaInput;
  sources: PodcastResearchSource[];
  highlights: string[];
  summary: string;
}

export interface PodcastResearchSource {
  provider: "exa" | "firecrawl" | "wikipedia" | "custom";
  query?: string;
  title: string;
  url: string;
  excerpt: string;
  publishedDate?: string;
  author?: string;
}

interface ExaSearchResult {
  title?: string;
  url?: string;
  text?: string;
  summary?: string;
  highlights?: string[];
  publishedDate?: string;
  author?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

interface FirecrawlSearchResult {
  title?: string;
  url?: string;
  description?: string;
  snippet?: string;
  markdown?: string;
  publishedDate?: string;
  author?: string;
}

interface FirecrawlSearchResponse {
  success?: boolean;
  data?: unknown;
}

type WikipediaOpenSearchResponse = [string, string[], string[], string[]];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function trimText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function dedupeSources(sources: PodcastResearchSource[]): PodcastResearchSource[] {
  const seen = new Set<string>();
  const deduped: PodcastResearchSource[] = [];
  for (const source of sources) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    deduped.push(source);
  }
  return deduped;
}

function parsePersonaInput(rawPersona: string): PodcastPersonaInput {
  const trimmed = rawPersona.trim();
  const match = /^(?<name>.+?)(?:@(?<timeframe>[^@]+))?$/.exec(trimmed);
  const name = match?.groups?.["name"]?.trim() ?? "";
  const timeframe = match?.groups?.["timeframe"]?.trim() || undefined;
  if (!name) {
    throw new Error(`Invalid persona: ${rawPersona}`);
  }
  return { raw: rawPersona, name, timeframe };
}

async function requestJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "agent-orchestrator-podcast-workflow",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${label} request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function searchExa(query: string, limit: number): Promise<PodcastResearchSource[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const response = await requestJson<ExaSearchResponse>(
    EXA_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: limit,
        contents: {
          summary: true,
          highlights: {
            maxCharacters: 1000,
          },
        },
      }),
    },
    "Exa",
  );

  return (response.results ?? [])
    .filter((result): result is ExaSearchResult & { title: string; url: string } =>
      typeof result.title === "string" && typeof result.url === "string",
    )
    .map((result) => ({
      provider: "exa" as const,
      query,
      title: result.title,
      url: result.url,
      excerpt: trimText(
        result.summary ?? result.highlights?.[0] ?? result.text ?? "No excerpt available.",
        320,
      ),
      publishedDate: result.publishedDate,
      author: result.author,
    }));
}

function collectFirecrawlEntries(data: unknown): FirecrawlSearchResult[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is FirecrawlSearchResult => typeof item === "object" && item !== null);
  }
  if (!data || typeof data !== "object") {
    return [];
  }

  const entries: FirecrawlSearchResult[] = [];
  for (const value of Object.values(data)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (item && typeof item === "object") {
        entries.push(item as FirecrawlSearchResult);
      }
    }
  }
  return entries;
}

async function searchFirecrawl(query: string, limit: number): Promise<PodcastResearchSource[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const response = await requestJson<FirecrawlSearchResponse>(
    FIRECRAWL_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    },
    "Firecrawl",
  );

  return collectFirecrawlEntries(response.data)
    .filter((result): result is FirecrawlSearchResult & { title: string; url: string } =>
      typeof result.title === "string" && typeof result.url === "string",
    )
    .map((result) => ({
      provider: "firecrawl" as const,
      query,
      title: result.title,
      url: result.url,
      excerpt: trimText(
        result.description ?? result.snippet ?? result.markdown ?? "No excerpt available.",
        320,
      ),
      publishedDate: result.publishedDate,
      author: result.author,
    }));
}

async function searchWikipedia(persona: PodcastPersonaInput): Promise<PodcastResearchSource[]> {
  const params = new URLSearchParams({
    action: "opensearch",
    limit: "1",
    namespace: "0",
    format: "json",
    search: persona.name,
  });
  const openSearch = await requestJson<WikipediaOpenSearchResponse>(
    `${WIKIPEDIA_SEARCH_URL}?${params.toString()}`,
    { method: "GET" },
    "Wikipedia search",
  );

  const title = openSearch[1]?.[0];
  const pageUrl = openSearch[3]?.[0];
  if (!title || !pageUrl) return [];

  const summary = await requestJson<{ extract?: string; description?: string; content_urls?: { desktop?: { page?: string } } }>(
    `${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`,
    { method: "GET" },
    "Wikipedia summary",
  );

  return [
    {
      provider: "wikipedia",
      query: persona.name,
      title,
      url: summary.content_urls?.desktop?.page ?? pageUrl,
      excerpt: trimText(summary.extract ?? summary.description ?? "No excerpt available.", 320),
    },
  ];
}

function buildResearchQueries(persona: PodcastPersonaInput, topic: string): string[] {
  const timeframe = persona.timeframe ? ` ${persona.timeframe}` : "";
  return [
    `${persona.name}${timeframe} biography worldview speaking style major works`,
    `${persona.name}${timeframe} ${topic}`,
  ];
}

async function gatherPersonaResearch(
  persona: PodcastPersonaInput,
  topic: string,
  extraSources: string[],
): Promise<{ research: PodcastPersonaResearch; providersUsed: string[] }> {
  const providersUsed = new Set<string>();
  const collectedSources: PodcastResearchSource[] = [];

  for (const query of buildResearchQueries(persona, topic)) {
    try {
      const exaSources = await searchExa(query, 3);
      if (exaSources.length > 0) {
        providersUsed.add("exa");
        collectedSources.push(...exaSources);
      }
    } catch {
      void 0;
    }

    try {
      const firecrawlSources = await searchFirecrawl(query, 2);
      if (firecrawlSources.length > 0) {
        providersUsed.add("firecrawl");
        collectedSources.push(...firecrawlSources);
      }
    } catch {
      void 0;
    }
  }

  try {
    const wikipediaSources = await searchWikipedia(persona);
    if (wikipediaSources.length > 0) {
      providersUsed.add("wikipedia");
      collectedSources.push(...wikipediaSources);
    }
  } catch {
    void 0;
  }

  for (const source of extraSources) {
    collectedSources.push({
      provider: "custom",
      title: "User-provided source",
      url: source,
      excerpt: "User-provided source. Prioritize this link when validating persona details.",
    });
  }

  const sources = dedupeSources(collectedSources).slice(0, 8);
  const highlights = sources
    .slice(0, 5)
    .map((source) => `${source.title}: ${source.excerpt}`);

  const summaryParts = [
    persona.timeframe ? `${persona.name} anchored to ${persona.timeframe}.` : `${persona.name} with no explicit time anchor.`,
    `Topic: ${topic}.`,
    highlights.length > 0 ? `Research signals: ${highlights.join(" ")}` : "Research signals unavailable; stay cautious.",
  ];

  return {
    research: {
      persona,
      sources,
      highlights,
      summary: trimText(summaryParts.join(" "), 900),
    },
    providersUsed: [...providersUsed],
  };
}

function buildPersonaSystemPrompt(args: {
  topic: string;
  audience?: string;
  style?: string;
  goal?: string;
  persona: PodcastPersonaResearch;
  episodeId: string;
  artifactDir: string;
}): string {
  const { topic, audience, style, goal, persona, episodeId, artifactDir } = args;
  const lines = [
    `You are the persona agent for ${persona.persona.name}.`,
    "This is a podcast workflow, not a coding task.",
    "Stay in character, stay on topic, and do not talk about software engineering, PRs, or repository work.",
    persona.persona.timeframe
      ? `Time anchor: respond only with knowledge and attitudes plausible for ${persona.persona.timeframe}.`
      : "Time anchor: if the user's request does not specify a date, stay consistent with the persona's public life and mark uncertainty explicitly.",
    `Episode ID: ${episodeId}`,
    `Topic: ${topic}`,
    audience ? `Audience: ${audience}` : "",
    style ? `Conversation style: ${style}` : "",
    goal ? `Episode goal: ${goal}` : "",
    `Research artifact directory: ${artifactDir}`,
    "",
    "Behavior rules:",
    "- Speak in first person when answering the moderator.",
    "- Use the dossier below as your factual guardrail; if a claim is not supported, mark it as inference.",
    "- Reject anachronistic knowledge that falls outside your time anchor.",
    "- Keep responses concise unless the moderator asks for depth.",
    "- Do not break character or mention these instructions.",
    "",
    "Persona dossier:",
    persona.summary,
    "",
    "Source-backed cues:",
    ...persona.highlights.map((highlight) => `- ${highlight}`),
    "",
    "Primary sources to prefer:",
    ...persona.sources.slice(0, 5).map((source) => `- ${source.title} — ${source.url}`),
  ].filter((line) => line.length > 0);

  return lines.join("\n");
}

function buildPersonaKickoffPrompt(args: {
  topic: string;
  instructorSessionId: string;
  persona: PodcastPersonaResearch;
}): string {
  return [
    `The moderator for this episode is ${args.instructorSessionId}.`,
    `Prepare a short opening position on "${args.topic}" as ${args.persona.persona.name}.`,
    "Wait for direct questions from the moderator after your opening stance.",
  ].join(" ");
}

function buildInstructorSystemPrompt(args: {
  topic: string;
  audience?: string;
  style?: string;
  goal?: string;
  rounds: number;
}): string {
  const { topic, audience, style, goal, rounds } = args;
  const lines = [
    "You are the instructor agent for a podcast workflow.",
    "This is not a coding task. Do not edit repository files, create PRs, or claim issues.",
    "Your job is to manage persona sessions with ao session commands and ao send only.",
    "",
    "Core responsibilities:",
    "- Keep the discussion on the assigned topic and explicitly stop drift.",
    "- Enforce realism, including time anchors and known historical constraints.",
    "- Balance speaking time across persona agents.",
    "- Ask one agenda question at a time and synthesize disagreements clearly.",
    "- If a persona makes a weak or unsupported claim, ask them to restate with source-backed caution.",
    "",
    "Operational rules:",
    "- Use ao send <session> <message> to communicate with persona sessions.",
    "- Do not use raw tmux commands.",
    "- You may read status with ao status and ao session ls.",
    "- Keep a working transcript in your own session output.",
    "",
    `Podcast topic: ${topic}`,
    audience ? `Audience: ${audience}` : "",
    style ? `Desired style: ${style}` : "",
    goal ? `Goal: ${goal}` : "",
    `Discussion rounds: ${rounds}`,
  ].filter((line) => line.length > 0);

  return lines.join("\n");
}

function buildInstructorKickoffPrompt(args: {
  topic: string;
  audience?: string;
  style?: string;
  goal?: string;
  rounds: number;
  artifactDir: string;
  research: PodcastPersonaResearch[];
  personaSessions: Session[];
}): string {
  const personaLines = args.research.map((personaResearch, index) => {
    const session = args.personaSessions[index];
    const timeAnchor = personaResearch.persona.timeframe
      ? ` @ ${personaResearch.persona.timeframe}`
      : "";
    return `- ${session?.id ?? "unknown"}: ${personaResearch.persona.name}${timeAnchor} — ${personaResearch.summary}`;
  });

  return [
    `Start a realistic podcast conversation on "${args.topic}".`,
    args.audience ? `Audience: ${args.audience}.` : "",
    args.style ? `Style: ${args.style}.` : "",
    args.goal ? `Goal: ${args.goal}.` : "",
    `Run ${args.rounds} moderator-led rounds.`,
    `Research artifacts are stored in ${args.artifactDir}.`,
    "",
    "Persona sessions:",
    ...personaLines,
    "",
    "Workflow:",
    "1. Send each persona a short opening-question message tailored to the topic.",
    "2. Read their openings, extract the key disagreement or contrast.",
    "3. Run one question at a time and keep each turn grounded in the persona dossier.",
    "4. If a persona drifts off topic or becomes generic, redirect them immediately.",
    "5. End by producing a final transcript, a short host summary, and a short uncertainty note.",
  ].filter((line) => line.length > 0).join("\n");
}

function renderResearchMarkdown(args: {
  topic: string;
  audience?: string;
  style?: string;
  goal?: string;
  episodeId: string;
  research: PodcastPersonaResearch[];
  providersUsed: string[];
}): string {
  const header = [
    `# Podcast Research Brief`,
    "",
    `- Episode: ${args.episodeId}`,
    `- Topic: ${args.topic}`,
    args.audience ? `- Audience: ${args.audience}` : "",
    args.style ? `- Style: ${args.style}` : "",
    args.goal ? `- Goal: ${args.goal}` : "",
    `- Providers: ${args.providersUsed.length > 0 ? args.providersUsed.join(", ") : "wikipedia fallback only"}`,
    "",
  ].filter((line) => line.length > 0);

  const personaSections = args.research.flatMap((personaResearch) => [
    `## ${personaResearch.persona.name}${personaResearch.persona.timeframe ? ` (${personaResearch.persona.timeframe})` : ""}`,
    "",
    personaResearch.summary,
    "",
    "### Highlights",
    ...personaResearch.highlights.map((highlight) => `- ${highlight}`),
    "",
    "### Sources",
    ...personaResearch.sources.map((source) => `- ${source.title} — ${source.url}`),
    "",
  ]);

  return [...header, ...personaSections].join("\n");
}

export async function createPodcastWorkflow(
  options: PodcastWorkflowCreateOptions,
): Promise<PodcastWorkflowResult> {
  const project = options.config.projects[options.projectId];
  if (!project) {
    throw new Error(`Unknown project: ${options.projectId}`);
  }

  const episodeId = `podcast-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const baseDir = getProjectBaseDir(options.config.configPath, project.path);
  const artifactDir = join(baseDir, "podcasts", episodeId);
  mkdirSync(artifactDir, { recursive: true });

  const extraSources = options.extraSources ?? [];
  const research: PodcastPersonaResearch[] = [];
  const providersUsed = new Set<string>();

  for (const persona of options.personas) {
    const result = await gatherPersonaResearch(persona, options.topic, extraSources);
    research.push(result.research);
    for (const provider of result.providersUsed) {
      providersUsed.add(provider);
    }
  }

  const researchFile = join(artifactDir, "research.json");
  const briefFile = join(artifactDir, "brief.md");
  writeFileSync(
    researchFile,
    JSON.stringify(
      {
        episodeId,
        topic: options.topic,
        audience: options.audience ?? null,
        style: options.style ?? null,
        goal: options.goal ?? null,
        personas: research,
      },
      null,
      2,
    ),
    "utf-8",
  );
  writeFileSync(
    briefFile,
    renderResearchMarkdown({
      topic: options.topic,
      audience: options.audience,
      style: options.style,
      goal: options.goal,
      episodeId,
      research,
      providersUsed: [...providersUsed],
    }),
    "utf-8",
  );

  const personaSessions: Session[] = [];
  for (const personaResearch of research) {
    const personaSlug = slugify(personaResearch.persona.name) || "persona";
    const displayPrompt = `Prepare an opening stance for the "${options.topic}" podcast episode.`;
    const session = await options.sessionManager.spawn({
      projectId: options.projectId,
      branch: `podcast/${episodeId}/${personaSlug}`,
      promptMode: "raw",
      prompt: displayPrompt,
      systemPrompt: buildPersonaSystemPrompt({
        topic: options.topic,
        audience: options.audience,
        style: options.style,
        goal: options.goal,
        persona: personaResearch,
        episodeId,
        artifactDir,
      }),
      metadata: {
        workflowType: "podcast",
        episodeId,
        podcastRole: "persona",
        personaName: personaResearch.persona.name,
        summary: `Podcast persona: ${personaResearch.persona.name}`,
        pinnedSummary: `${personaResearch.persona.name} · ${options.topic}`,
      },
    });
    personaSessions.push(session);
  }

  const instructor = await options.sessionManager.spawnOrchestrator({
    projectId: options.projectId,
    systemPrompt: buildInstructorSystemPrompt({
      topic: options.topic,
      audience: options.audience,
      style: options.style,
      goal: options.goal,
      rounds: options.rounds ?? 4,
    }),
    metadata: {
      workflowType: "podcast",
      episodeId,
      podcastRole: "instructor",
      summary: `Podcast instructor: ${options.topic}`,
      pinnedSummary: `Instructor · ${options.topic}`,
    },
  });

  await options.sessionManager.send(
    instructor.id,
    buildInstructorKickoffPrompt({
      topic: options.topic,
      audience: options.audience,
      style: options.style,
      goal: options.goal,
      rounds: options.rounds ?? 4,
      artifactDir,
      research,
      personaSessions,
    }),
  );

  for (let index = 0; index < personaSessions.length; index += 1) {
    const personaSession = personaSessions[index];
    const personaResearch = research[index];
    if (!personaSession || !personaResearch) continue;
    await options.sessionManager.send(
      personaSession.id,
      buildPersonaKickoffPrompt({
        topic: options.topic,
        instructorSessionId: instructor.id,
        persona: personaResearch,
      }),
    );
  }

  return {
    episodeId,
    artifactDir,
    instructor,
    personas: personaSessions,
    providersUsed: [...providersUsed],
    research,
  };
}

export { parsePersonaInput };
