export const SHARED_SKILLS_AGENT_ID = "agents";

const sharedSkillsAgents = new Set([
  "amp",
  "claude",
  "codex",
  "cursor",
  "devin",
  "droid",
  "gemini-cli",
  "github-copilot",
  "kimi-cli",
  "opencode",
  "vscode",
]);

export function usesSharedSkills(agentId: string): boolean {
  return sharedSkillsAgents.has(agentId);
}

export function ensureSharedSkillsAgent(agentIds: string[]): string[] {
  if (!agentIds.some(usesSharedSkills)) {
    return agentIds;
  }
  if (agentIds.includes(SHARED_SKILLS_AGENT_ID)) {
    return agentIds;
  }
  return [...agentIds, SHARED_SKILLS_AGENT_ID];
}

export function sortSharedSkillsFirst(agentIds: string[]): string[] {
  if (!agentIds.includes(SHARED_SKILLS_AGENT_ID)) {
    return agentIds;
  }
  return [
    SHARED_SKILLS_AGENT_ID,
    ...agentIds.filter((id) => id !== SHARED_SKILLS_AGENT_ID),
  ];
}
