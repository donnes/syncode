import { ampAdapter } from "./amp";
import { antigravityAdapter } from "./antigravity";
import { claudeAdapter } from "./claude";
import { clawdbotAdapter } from "./clawdbot";
import { codexAdapter } from "./codex";
import { cursorAdapter } from "./cursor";
import { droidAdapter } from "./droid";
import { geminiCliAdapter } from "./gemini-cli";
import { githubCopilotAdapter } from "./github-copilot";
import { gooseAdapter } from "./goose";
import { kiloAdapter } from "./kilo";
import { kiroCliAdapter } from "./kiro-cli";
import { opencodeAdapter } from "./opencode";
import { rooAdapter } from "./roo";
import { traeAdapter } from "./trae";
import type { AdapterRegistryEntry, AgentAdapter } from "./types";
import { vscodeAdapter } from "./vscode";
import { windsurfAdapter } from "./windsurf";

export class AdapterRegistry {
  private adapters: Map<string, AdapterRegistryEntry> = new Map();

  register(adapter: AgentAdapter, enabled: boolean = true): void {
    this.adapters.set(adapter.id, { adapter, enabled });
  }

  get(id: string): AgentAdapter | null {
    const entry = this.adapters.get(id);
    return entry ? entry.adapter : null;
  }

  getAll(): AgentAdapter[] {
    return Array.from(this.adapters.values()).map((entry) => entry.adapter);
  }

  getEnabled(): AgentAdapter[] {
    return Array.from(this.adapters.values())
      .filter((entry) => entry.enabled)
      .map((entry) => entry.adapter);
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  enable(id: string): boolean {
    const entry = this.adapters.get(id);
    if (entry) {
      entry.enabled = true;
      return true;
    }
    return false;
  }

  disable(id: string): boolean {
    const entry = this.adapters.get(id);
    if (entry) {
      entry.enabled = false;
      return true;
    }
    return false;
  }

  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  getIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  clear(): void {
    this.adapters.clear();
  }
}
export const adapterRegistry = new AdapterRegistry();
export function registerBuiltinAdapters(): void {
  adapterRegistry.register(ampAdapter);
  adapterRegistry.register(antigravityAdapter);
  adapterRegistry.register(claudeAdapter);
  adapterRegistry.register(clawdbotAdapter);
  adapterRegistry.register(codexAdapter);
  adapterRegistry.register(cursorAdapter);
  adapterRegistry.register(droidAdapter);
  adapterRegistry.register(geminiCliAdapter);
  adapterRegistry.register(githubCopilotAdapter);
  adapterRegistry.register(gooseAdapter);
  adapterRegistry.register(kiloAdapter);
  adapterRegistry.register(kiroCliAdapter);
  adapterRegistry.register(opencodeAdapter);
  adapterRegistry.register(rooAdapter);
  adapterRegistry.register(traeAdapter);
  adapterRegistry.register(vscodeAdapter);
  adapterRegistry.register(windsurfAdapter);
}
registerBuiltinAdapters();
