import * as p from "@clack/prompts";
import { Cancelled } from "./errors.ts";

export function canPrompt(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Unwraps a prompt result, turning Ctrl-C into a Cancelled error. */
export function answer<T>(value: T): Exclude<T, symbol> {
  if (typeof value === "symbol") {
    p.cancel("Cancelled.");
    throw new Cancelled();
  }
  // Prompts only return symbols for cancellation, handled above.
  return value as Exclude<T, symbol>;
}
