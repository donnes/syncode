/**
 * Pull agent configs from remote repository
 */

import * as p from "@clack/prompts";
import { getConfig } from "../config/manager";
import type { GlobalConfig } from "../config/types";
import {
  fetch,
  getBehindCount,
  getCurrentBranch,
  getGitStatus,
  getRemoteUrl,
  hasChanges,
  pull,
} from "../utils/git";
import { expandHome } from "../utils/paths";
import { getErrorLogFile, logError } from "../utils/trace";

export async function pullCommand() {
  p.intro("Pull from Remote");

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

    p.log.warning(
      "Cannot pull with uncommitted changes. Commit or stash them first.",
    );
    p.outro("Pull cancelled");
    return;
  }

  // Fetch to get latest remote state
  const fetchSpinner = p.spinner();
  fetchSpinner.start("Fetching from remote");

  const fetchResult = await fetch();
  if (!fetchResult.success) {
    fetchSpinner.stop("Fetch failed");
    p.log.error(fetchResult.message);
    p.outro("Pull cancelled");
    return;
  }

  fetchSpinner.stop("Fetched from remote");

  // Check if we're behind
  const behindCount = await getBehindCount();
  if (behindCount === 0) {
    p.log.success("Already up to date");
    p.outro("No changes to pull");
    return;
  }

  p.log.info(`${behindCount} commit(s) behind remote`);

  // Pull from remote
  const spinner = p.spinner();
  spinner.start(`Pulling from ${branch}`);

  const result = await pull();

  if (result.success) {
    spinner.stop(`Pulled ${behindCount} commit(s) from ${branch}`);
    p.outro("Successfully pulled from remote");
  } else {
    spinner.stop("Pull failed");
    const logFile = logError(new Error(result.message), "pull");
    p.log.error(result.message);
    p.cancel(`Failed to pull from remote\n${getErrorLogFile(logFile)}`);
  }
}
