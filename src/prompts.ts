import * as p from "@clack/prompts";
import { Cancelled } from "./errors.ts";

export function canPrompt(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/** Unwraps a prompt result, turning Ctrl-C into a Cancelled error. */
export function answer<T>(value: T | symbol): T {
  if (typeof value === "symbol") {
    p.cancel("Cancelled.");
    throw new Cancelled();
  }
  return value;
}
