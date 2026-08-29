import { isAbsolute, relative, resolve } from "node:path";
import type { OrchestratorConfig } from "@aoagents/ao-core";

interface ProjectWithPath {
  path: string;
}

function isWithinProject(projectPath: string, currentDir: string): boolean {
  const relativePath = relative(projectPath, currentDir);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

/**
 * Find the best matching project for the current directory.
 * When multiple project paths contain the cwd, prefer the deepest match.
 */
export function findProjectForDirectory<T extends ProjectWithPath>(
  projects: Record<string, T>,
  currentDir: string,
): string | null {
  const resolvedCurrentDir = resolve(currentDir);

  const matches = Object.entries(projects)
    .filter(([, project]) => isWithinProject(resolve(project.path), resolvedCurrentDir))
    .sort(([, a], [, b]) => resolve(b.path).length - resolve(a.path).length);

  return matches[0]?.[0] ?? null;
}

/**
 * Auto-detect the active project from config.
 * - If only one project exists, use it.
 * - If multiple projects exist, prefer AO_PROJECT_ID from session env.
 * - Otherwise match cwd against configured project paths.
 */
export function autoDetectProject(config: OrchestratorConfig): string {
  const projectIds = Object.keys(config.projects);
  if (projectIds.length === 0) {
    throw new Error("No projects configured. Run 'ao start' first.");
  }
  if (projectIds.length === 1) {
    return projectIds[0]!;
  }

  const envProject = process.env.AO_PROJECT_ID;
  if (envProject && config.projects[envProject]) {
    return envProject;
  }

  const cwd = resolve(process.cwd());
  const matchedProjectId = findProjectForDirectory(config.projects, cwd);
  if (matchedProjectId) {
    return matchedProjectId;
  }

  throw new Error(
    `Multiple projects configured. Specify one: ${projectIds.join(", ")}\nOr run from within a project directory.`,
  );
}
