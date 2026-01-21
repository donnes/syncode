import { existsSync, readFileSync } from "node:fs";

export const isMacOS = process.platform === "darwin";
export const isLinux = process.platform === "linux";

export function isArch(): boolean {
  if (!isLinux) return false;
  try {
    const osRelease = readFileSync("/etc/os-release", "utf-8");
    return osRelease.includes("Arch Linux") || osRelease.includes("ID=arch");
  } catch {
    return false;
  }
}

export function getPackageManager(): "brew" | "yay" | "pacman" | null {
  if (isMacOS) {
    return existsSync("/opt/homebrew/bin/brew") ||
      existsSync("/usr/local/bin/brew")
      ? "brew"
      : null;
  }
  if (isLinux) {
    if (existsSync("/usr/bin/yay")) return "yay";
    if (existsSync("/usr/bin/pacman")) return "pacman";
  }
  return null;
}

export function getPlatformName(): string {
  if (isMacOS) return "macOS";
  if (isArch()) return "Arch Linux";
  if (isLinux) return "Linux";
  return "Unknown";
}
