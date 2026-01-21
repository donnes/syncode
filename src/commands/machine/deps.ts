import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getConfig } from "../../config/manager";
import { exists } from "../../utils/fs";
import { contractHome, expandHome } from "../../utils/paths";
import {
  getPackageManager,
  getPlatformName,
  isArch,
  isDebian,
  isLinux,
  isMacOS,
} from "../../utils/platform";
import { commandExists, exec, execLive } from "../../utils/shell";

export async function machineDepsCommand() {
  p.intro("Machine Dependencies");

  let repoPath: string;
  try {
    const config = getConfig();
    repoPath = expandHome(config.repoPath);
  } catch (_error) {
    p.cancel(
      "Configuration not found. Run 'syncode new' or 'syncode init' first.",
    );
    return;
  }

  p.log.info(`Platform: ${getPlatformName()}`);
  p.log.info(`Repository: ${contractHome(repoPath)}`);

  if (!exists(repoPath)) {
    p.cancel("Repository path not found.");
    return;
  }

  const spinner = p.spinner();
  const packageManager = getPackageManager();

  if (isMacOS) {
    await installMacDeps(spinner, packageManager, repoPath);
    await installBun(spinner);
    await installNode(spinner);
    p.outro("Done");
    return;
  } else if (isLinux && isArch()) {
    await installArchDeps(spinner, packageManager, repoPath);
    await installBun(spinner);
    await installNode(spinner);
    p.outro("Done");
    return;
  } else if (isLinux && isDebian()) {
    await installDebianDeps(spinner, packageManager, repoPath);
    await installBun(spinner);
    await installNode(spinner);
    p.outro("Done");
    return;
  }

  p.log.warning("Unsupported platform for dependency installation");
  p.outro("Done");
}

async function installBun(spinner: ReturnType<typeof p.spinner>) {
  const bunInstalled = await commandExists("bun");
  if (bunInstalled) {
    p.log.success("bun: installed");
    return;
  }

  const confirm = await p.confirm({
    message: "Install bun?",
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  spinner.start("Installing bun...");
  const installed = await execLive("curl -fsSL https://bun.sh/install | bash");
  spinner.stop(installed ? "bun installed" : "bun install failed");
}

async function installNode(spinner: ReturnType<typeof p.spinner>) {
  const fnmInstalled = await commandExists("fnm");
  if (!fnmInstalled) {
    p.log.warning("fnm not found. Skipping Node.js install.");
    return;
  }

  const confirm = await p.confirm({
    message: "Install latest stable Node.js with fnm?",
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  spinner.start("Installing latest Node.js...");
  const installed = await execLive(
    "fnm install --latest && fnm default --latest",
  );
  spinner.stop(installed ? "Node.js installed" : "Node.js install failed");
}

async function installMacDeps(
  spinner: ReturnType<typeof p.spinner>,
  packageManager: ReturnType<typeof getPackageManager>,
  repoPath: string,
) {
  const brewfilePath = resolveDependencyFile(repoPath, ["Brewfile"]);

  if (!packageManager) {
    const installBrew = await p.confirm({
      message: "Homebrew not found. Install Homebrew?",
      initialValue: true,
    });

    if (p.isCancel(installBrew) || !installBrew) {
      p.log.warning("Homebrew not installed. Skipping package install.");
      return;
    }

    spinner.start("Installing Homebrew...");
    const installed = await execLive(
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    );
    spinner.stop(installed ? "Homebrew installed" : "Homebrew install failed");
  }

  if (!brewfilePath) {
    p.log.warning("Brewfile not found in repo.");
    return;
  }

  const confirm = await p.confirm({
    message: `Install packages from ${contractHome(brewfilePath)}?`,
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  spinner.start("Installing Homebrew packages...");
  const result = await exec(`brew bundle install --file="${brewfilePath}"`);
  if (result.success) {
    spinner.stop("Homebrew packages installed");
  } else {
    spinner.stop("Homebrew packages had errors");
    if (result.stderr) {
      p.log.warning(result.stderr);
    }
  }
}

async function installArchDeps(
  spinner: ReturnType<typeof p.spinner>,
  packageManager: ReturnType<typeof getPackageManager>,
  repoPath: string,
) {
  const packagesPath = resolveDependencyFile(repoPath, [
    "packages-arch.txt",
    "packages.txt",
  ]);

  if (!packagesPath) {
    p.log.warning("packages-arch.txt not found in repo.");
    return;
  }

  if (!packageManager) {
    p.log.warning("No supported package manager found (yay or pacman).");
    return;
  }

  const packages = readPackages(packagesPath);
  if (packages.length === 0) {
    p.log.warning("No packages to install.");
    return;
  }

  const confirm = await p.confirm({
    message: `Install ${packages.length} package(s) with ${packageManager}?`,
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  spinner.start(`Installing packages with ${packageManager}...`);
  const packageList = packages.join(" ");
  const command =
    packageManager === "yay"
      ? `yay -S --needed --noconfirm ${packageList}`
      : `sudo pacman -S --needed --noconfirm ${packageList}`;
  const result = await exec(command);
  if (result.success) {
    spinner.stop(`Installed ${packages.length} package(s)`);
  } else {
    spinner.stop("Package install had errors");
    if (result.stderr) {
      p.log.warning(result.stderr);
    }
  }
}

async function installDebianDeps(
  spinner: ReturnType<typeof p.spinner>,
  packageManager: ReturnType<typeof getPackageManager>,
  repoPath: string,
) {
  if (packageManager !== "apt") {
    p.log.warning("apt not found. Skipping package install.");
    return;
  }

  const packagesPath = resolveDependencyFile(repoPath, ["packages-debian.txt"]);

  if (!packagesPath) {
    p.log.warning("packages-debian.txt not found in repo.");
    return;
  }

  const packages = readPackages(packagesPath);
  if (packages.length === 0) {
    p.log.warning("No packages to install.");
    return;
  }

  const confirm = await p.confirm({
    message: `Install ${packages.length} package(s) with apt?`,
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    return;
  }

  spinner.start("Installing packages with apt...");
  const packageList = packages.join(" ");
  const result = await exec(`sudo apt-get install -y ${packageList}`);
  if (result.success) {
    spinner.stop(`Installed ${packages.length} package(s)`);
  } else {
    spinner.stop("Package install had errors");
    if (result.stderr) {
      p.log.warning(result.stderr);
    }
  }
}

function resolveDependencyFile(
  repoPath: string,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    const fullPath = candidate.startsWith("/")
      ? candidate
      : join(repoPath, candidate);
    if (exists(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function readPackages(path: string): string[] {
  const content = readFileSync(path, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}
