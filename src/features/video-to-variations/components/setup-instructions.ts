export type SetupOS = "windows" | "macos";
export const connectorRepository = "https://github.com/franciscortez/leveric-video-connector";
const clone = "git clone https://github.com/franciscortez/leveric-video-connector.git";
const macPath = 'export PATH="$(brew --prefix node@24)/bin:$(brew --prefix ffmpeg-full)/bin:$HOME/.local/bin:$PATH"';
export const setupInstructions: Record<SetupOS, { terminal: string; folder: string; install: string; clone: string; python: string; build: string; start: string }> = {
  windows: {
    terminal: "Open Start, type PowerShell, then open Windows PowerShell. Paste one command block at a time and press Enter. Accept installer prompts, then close and reopen PowerShell before continuing.",
    folder: "%USERPROFILE%\\Leveric\\leveric-video-connector",
    install: "winget install --id Git.Git -e\nwinget install --id Gyan.FFmpeg -e\nwinget install --id Python.Python.3.11 -e\nwinget install --id Anthropic.ClaudeCode -e",
    clone: `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE/Leveric" | Out-Null\nSet-Location "$env:USERPROFILE/Leveric"\n${clone}\nSet-Location leveric-video-connector`,
    python: 'py -3.11 -m venv "$env:USERPROFILE/.video-tools/venv"\n& "$env:USERPROFILE/.video-tools/venv/Scripts/python.exe" -m pip install -r requirements.txt\n& "$env:USERPROFILE/.video-tools/venv/Scripts/python.exe" -c "from faster_whisper import WhisperModel; WhisperModel(\'small\', device=\'cpu\', compute_type=\'int8\')"',
    build: "node --version\nnpm.cmd install --global pnpm@10.34.7\nclaude auth login\npnpm.cmd install --frozen-lockfile\npnpm.cmd video:connector:build\npnpm.cmd video:connector:doctor",
    start: 'Set-Location "$env:USERPROFILE/Leveric/leveric-video-connector"\npnpm.cmd video:connector',
  },
  macos: {
    terminal: "Press Command + Space, type Terminal, then press Return. Paste one command block at a time and press Return. Install Homebrew from the link below if brew is not available, and follow its printed Next steps first.",
    folder: "~/Leveric/leveric-video-connector",
    install: 'brew install git node@24 python@3.11 ffmpeg-full\nbrew install --cask claude-code\n' + macPath,
    clone: `mkdir -p "$HOME/Leveric"\ncd "$HOME/Leveric"\n${clone}\ncd leveric-video-connector`,
    python: 'python3.11 -m venv "$HOME/.video-tools/venv"\n"$HOME/.video-tools/venv/bin/python" -m pip install -r requirements.txt\n"$HOME/.video-tools/venv/bin/python" -c "from faster_whisper import WhisperModel; WhisperModel(\'small\', device=\'cpu\', compute_type=\'int8\')"',
    build: "node --version\nnpm install --global pnpm@10.34.7\nclaude auth login\npnpm install --frozen-lockfile\npnpm video:connector:build\npnpm video:connector:doctor",
    start: macPath + '\ncd "$HOME/Leveric/leveric-video-connector"\npnpm video:connector',
  },
};
