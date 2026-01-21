export const BREWFILE_TEMPLATE = `# Brewfile - Core machine dependencies
# Edit to customize

# Taps
tap "jesseduffield/lazygit"

# Core dev tools
brew "neovim"
brew "ripgrep"
brew "fd"
brew "fzf"
brew "gcc"
brew "make"
brew "curl"
brew "unzip"
brew "tree-sitter"
brew "gh"
brew "lazygit"

# Node.js ecosystem
brew "fnm"

# Shell enhancements
brew "zoxide"
brew "eza"
brew "atuin"

# Languages & runtimes
brew "go"
brew "rbenv"

# Utilities
brew "biome"
brew "awscli"

# Casks (GUI apps)
cask "orbstack"
cask "raycast"
`;

export const PACKAGES_ARCH_TEMPLATE = `# packages-arch.txt - Core machine dependencies
# Edit to customize
# Install with: yay -S --needed - < packages-arch.txt

# Core dev tools
neovim
ripgrep
fd
fzf
base-devel
curl
unzip
tree-sitter
github-cli
lazygit

# Node.js ecosystem
fnm-bin

# Shell enhancements
zoxide
eza
atuin

# Languages & runtimes
go
rbenv

# Utilities
biome-bin
aws-cli-v2
`;

export const PACKAGES_DEBIAN_TEMPLATE = `# packages-debian.txt - Core machine dependencies
# Edit to customize
# Install with: sudo apt-get install -y $(grep -v '^#' packages-debian.txt)

# Core dev tools
git
neovim
ripgrep
fd-find
fzf
build-essential
curl
unzip

# Shell enhancements
zoxide
`;
