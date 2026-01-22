/**
 * Config migration system
 */

import * as p from "@clack/prompts";
import { getAgentMetadata } from "../agents/metadata";
import { getConfig, setConfig } from "./manager";
import type { GlobalConfig } from "./types";
import { SUPPORTED_AGENTS } from "./types";

export async function checkAndMigrateConfig(
  silent: boolean = false,
): Promise<void> {
  try {
    const config = getConfig();
    const missing = findMissingConfigs(config);

    if (missing.length === 0) {
      return;
    }

    if (silent) {
      return;
    }

    const names = missing
      .map((id) => getAgentMetadata(id)?.displayName || id)
      .join(", ");

    const shouldAdd = await p.confirm({
      message: `New config available: ${names}. Add to your config?`,
      initialValue: false,
    });

    if (p.isCancel(shouldAdd) || !shouldAdd) {
      return;
    }

    config.agents = [...config.agents, ...missing];
    setConfig(config);

    p.log.success(`✓ Added ${names} to your config`);
    p.log.info(`Run 'syncode sync' to import configs to your repo`);
  } catch {
    return;
  }
}

function findMissingConfigs(config: GlobalConfig): string[] {
  const missing: string[] = [];

  for (const id of SUPPORTED_AGENTS) {
    if (!config.agents.includes(id)) {
      missing.push(id);
    }
  }

  return missing;
}

export function hasNewConfigsAvailable(): boolean {
  try {
    const config = getConfig();
    const missing = findMissingConfigs(config);
    return missing.length > 0;
  } catch {
    return false;
  }
}

export function getNewConfigsAvailable(): string[] {
  try {
    const config = getConfig();
    return findMissingConfigs(config);
  } catch {
    return [];
  }
}
