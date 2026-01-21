/**
 * Push agent configs to remote repository
 */

import * as p from "@clack/prompts";
import { getConfig } from "../config/manager";
import type { GlobalConfig } from "../config/types";
import {
  commit,
  getCurrentBranch,
  getGitStatus,
  getRemoteUrl,
  hasChanges,
  push,
  stageAll,
} from "../utils/git";
import { expandHome } from "../utils/paths";

export async function pushCommand() {
  p.intro("Push to Remote");

  // Get configuration
  let config: GlobalConfig;
  try {
    config = getConfig();
  } catch (_error) {
    p.cancel(
      "Configuration not found. Run 'syncode new' or 'syncode init' first.",
    );
    return;
  }

  const _repoPath = expandHome(config.repoPath);

  // Check for remote
  const remoteUrl = await getRemoteUrl();
  if (!remoteUrl) {
    p.cancel(
      "No remote repository configured. Add a remote with: git remote add origin <url>",
    );
    return;
  }

  const branch = await getCurrentBranch();
  p.log.info(`Branch: ${branch}`);
  p.log.info(`Remote: ${remoteUrl}`);

  console.log("");

  // Check for uncommitted changes
  if (await hasChanges()) {
    p.log.warning("Uncommitted changes detected");

    const gitStatus = await getGitStatus();
    if (gitStatus) {
      console.log(
        gitStatus
          .split("\n")
          .map((l) => `   ${l}`)
          .join("\n"),
      );
      console.log("");
    }

    const shouldCommit = await p.confirm({
      message: "Commit changes before pushing?",
      initialValue: true,
    });

    if (p.isCancel(shouldCommit)) {
      p.cancel("Cancelled");
      return;
    }

    if (shouldCommit) {
      // Ask for commit message
      const commitMessage = await p.text({
        message: "Commit message:",
        placeholder: "Update agent configs",
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return "Commit message is required";
          }
        },
      });

      if (p.isCancel(commitMessage)) {
        p.cancel("Cancelled");
        return;
      }

      // Stage all changes
      const spinner = p.spinner();
      spinner.start("Staging changes");

      const staged = await stageAll();
      if (!staged) {
        spinner.stop("Failed to stage changes");
        p.cancel("Failed to stage changes");
        return;
      }

      spinner.message("Committing changes");

      const committed = await commit(commitMessage);
      if (!committed) {
        spinner.stop("Failed to commit");
        p.cancel("Failed to commit changes");
        return;
      }

      spinner.stop("Changes committed");
    } else {
      p.log.warning(
        "Proceeding without committing (only pushing existing commits)",
      );
    }
  } else {
    p.log.success("Working tree is clean");
  }

  console.log("");

  // Push to remote
  const spinner = p.spinner();
  spinner.start(`Pushing to ${branch}`);

  const result = await push();

  if (result.success) {
    spinner.stop(`Pushed to ${branch}`);
    p.outro("Successfully pushed to remote");
  } else {
    spinner.stop("Push failed");
    p.log.error(result.message);
    p.cancel("Failed to push to remote");
  }
}
