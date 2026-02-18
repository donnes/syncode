import { dirname, join, relative, resolve } from "node:path";
import {
  createSymlinkWithBackup,
  ensureDir,
  getSymlinkTarget,
  isSymlink,
} from "../utils/fs";

export const SHARED_SKILLS_DIRNAME = "skills";

export function getSharedSkillsPath(): string {
  return join(process.env.HOME || "", ".agents", SHARED_SKILLS_DIRNAME);
}

export function getSharedSkillsRepoPath(repoPath: string): string {
  return resolve(repoPath, "..", "..", ".agents", SHARED_SKILLS_DIRNAME);
}

export function linkSharedSkillsOnSystem(
  agentSkillsPath: string,
  sharedSkillsPath: string = getSharedSkillsPath(),
): void {
  ensureDir(sharedSkillsPath);
  if (isSymlink(agentSkillsPath)) {
    const target = getSymlinkTarget(agentSkillsPath);
    if (target === sharedSkillsPath) {
      return;
    }
  }
  createSymlinkWithBackup(sharedSkillsPath, agentSkillsPath);
}

export function linkSharedSkillsInRepo(
  agentRepoPath: string,
  sharedSkillsRepoPath: string,
  agentSkillsDirName: string = SHARED_SKILLS_DIRNAME,
): void {
  ensureDir(sharedSkillsRepoPath);
  const linkPath = join(agentRepoPath, agentSkillsDirName);
  const relativeTarget = relative(dirname(linkPath), sharedSkillsRepoPath);
  if (isSymlink(linkPath)) {
    const target = getSymlinkTarget(linkPath);
    if (target === relativeTarget) {
      return;
    }
  }
  createSymlinkWithBackup(relativeTarget, linkPath);
}
