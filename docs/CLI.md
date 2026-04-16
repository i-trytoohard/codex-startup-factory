# AO CLI Reference

The `ao` CLI is the control interface for Agent Orchestrator. Most commands are used by the **orchestrator agent itself** to manage sessions, not by humans directly. Humans typically only need `ao start` and the web dashboard.

## Commands humans use

```bash
ao start                               # Auto-detect, generate config, start dashboard + orchestrator
ao start <url>                         # Clone repo, auto-configure, and start
ao start ~/other-repo                  # Add a new project and start
ao podcast create --topic "..." --persona "Nikola Tesla@1899" --persona "Albert Einstein@1935"
                                       # Create one instructor session plus 2+ researched persona sessions
ao stop                                # Stop everything (dashboard, orchestrator, lifecycle worker)
ao status                              # Overview of all sessions
ao status --watch                      # Live-updating terminal status view
ao dashboard                           # Open web dashboard in browser
```

## Commands the orchestrator agent uses

These are primarily invoked by the orchestrator agent running inside a tmux session. You can use them manually if needed, but the orchestrator handles this automatically.

```bash
ao spawn [issue]                       # Spawn an agent (project auto-detected from cwd)
ao spawn 123 --agent codex             # Override agent for this session
ao batch-spawn 101 102 103             # Spawn agents for multiple issues at once
ao send <session> "Fix the tests"      # Send instructions to a running agent
ao session ls                          # List sessions
ao session ls --json                   # Machine-readable session inventory
ao session kill <session>              # Kill a session
ao session restore <session>           # Revive a crashed agent
```

## Podcast workflow

Use `ao podcast create` when you want AO to run a moderated conversation between researched personas.

```bash
ao podcast create \
  --topic "How science changes civilization" \
  --persona "Nikola Tesla@1899" \
  --persona "Albert Einstein@1935" \
  --audience "Curious founders" \
  --style "debate" \
  --goal "Contrast invention-driven thinking with theory-driven thinking"
```

What it does:

- creates `1` instructor session that moderates the discussion
- creates `2+` persona sessions from repeated `--persona` flags
- researches each persona with Exa and Firecrawl when available, with Wikipedia fallback
- writes `brief.md` and `research.json` artifacts before the episode starts
- sends the instructor a kickoff brief containing the persona session IDs and summaries

Supported flags:

```bash
--topic <text>                         # Required podcast topic
--persona <name[@timeframe]>           # Required, repeat for each persona
--project <id>                         # Override project auto-detection
--audience <text>                      # Target audience
--style <text>                         # e.g. debate, interview, classroom
--goal <text>                          # Desired takeaway
--rounds <count>                       # Moderator-led rounds, default 4
--source <url>                         # Extra source URL to prioritize, repeatable
```

## Maintenance commands

```bash
ao doctor                              # Check install, runtime, and stale temp issues
ao doctor --fix                        # Apply safe fixes automatically
ao update                              # Update local AO install (source installs only)
ao config-help                         # Show full config schema reference
```

`ao doctor` checks PATH and launcher resolution, required binaries, configured plugin resolution, tmux and GitHub CLI health, config support directories, stale AO temp files, and core build/runtime sanity.

`ao update` fast-forwards the local install on `main`, reinstalls dependencies, clean-rebuilds core packages, refreshes the launcher, and runs smoke tests. Use `ao update --skip-smoke` to stop after rebuild, or `ao update --smoke-only` to rerun just the smoke checks.
