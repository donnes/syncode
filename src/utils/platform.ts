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

export function isDebian(): boolean {
  if (!isLinux) return false;
  try {
    const osRelease = readFileSync("/etc/os-release", "utf-8");
    return (
      osRelease.includes("ID=debian") ||
      osRelease.includes("ID=ubuntu") ||
      osRelease.includes("ID=pop")
    );
  } catch {
    return false;
  }
}

export function getPackageManager(): "brew" | "yay" | "pacman" | "apt" | null {
  if (isMacOS) {
    return existsSync("/opt/homebrew/bin/brew") ||
      existsSync("/usr/local/bin/brew")
      ? "brew"
      : null;
  }
  if (isLinux) {
    if (existsSync("/usr/bin/yay")) return "yay";
    if (existsSync("/usr/bin/pacman")) return "pacman";
    if (existsSync("/usr/bin/apt") || existsSync("/usr/bin/apt-get")) {
      return "apt";
    }
  }
  return null;
}

export function getPlatformName(): string {
  if (isMacOS) return "macOS";
  if (isArch()) return "Arch Linux";
  if (isDebian()) return "Debian/Ubuntu";
  if (isLinux) return "Linux";
  return "Unknown";
}
