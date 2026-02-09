export {
  type AgentMetadata,
  agentMetadata,
  detectInstalledAgents,
  getAgentMetadata,
  getAgentsWithAdapters,
  getAgentsWithoutAdapters,
  getAllAgentIds,
  isAgentInstalled,
} from "./metadata";
export {
  ensureSharedSkillsAgent,
  SHARED_SKILLS_AGENT_ID,
  sortSharedSkillsFirst,
  usesSharedSkills,
} from "./shared-skills";
