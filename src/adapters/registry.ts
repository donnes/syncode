/**
 * Adapter registry for managing editor/agent adapters
 */

import type { AgentAdapter, AdapterRegistryEntry } from "./types";
import { opencodeAdapter } from "./opencode";
import { claudeAdapter } from "./claude";
import { cursorAdapter } from "./cursor";
import { windsurfAdapter } from "./windsurf";
import { vscodeAdapter } from "./vscode";

export class AdapterRegistry {
  private adapters: Map<string, AdapterRegistryEntry> = new Map();

  /**
   * Register an adapter
   */
  register(adapter: AgentAdapter, enabled: boolean = true): void {
    this.adapters.set(adapter.id, { adapter, enabled });
  }

  /**
   * Get adapter by ID
   */
  get(id: string): AgentAdapter | null {
    const entry = this.adapters.get(id);
    return entry ? entry.adapter : null;
  }

  /**
   * Get all registered adapters
   */
  getAll(): AgentAdapter[] {
    return Array.from(this.adapters.values()).map((entry) => entry.adapter);
  }

  /**
   * Get enabled adapters only
   */
  getEnabled(): AgentAdapter[] {
    return Array.from(this.adapters.values())
      .filter((entry) => entry.enabled)
      .map((entry) => entry.adapter);
  }

  /**
   * Check if adapter is registered
   */
  has(id: string): boolean {
    return this.adapters.has(id);
  }

  /**
   * Enable an adapter
   */
  enable(id: string): boolean {
    const entry = this.adapters.get(id);
    if (entry) {
      entry.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable an adapter
   */
  disable(id: string): boolean {
    const entry = this.adapters.get(id);
    if (entry) {
      entry.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Unregister an adapter
   */
  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  /**
   * Get adapter IDs
   */
  getIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Global adapter registry instance
 */
export const adapterRegistry = new AdapterRegistry();

/**
 * Register built-in adapters
 * Called during initialization
 */
export function registerBuiltinAdapters(): void {
  // Register all built-in adapters
  adapterRegistry.register(opencodeAdapter);
  adapterRegistry.register(claudeAdapter);
  adapterRegistry.register(cursorAdapter);
  adapterRegistry.register(windsurfAdapter);
  adapterRegistry.register(vscodeAdapter);
}

// Auto-register built-in adapters on module load
registerBuiltinAdapters();
