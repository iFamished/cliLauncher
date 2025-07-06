# 🌸 Origami

> ✨ Lightweight Minecraft CLI Launcher — beautiful, fast, and scriptable.

Origami is a terminal-first Minecraft launcher that supports authentication, installation, and launching of Minecraft versions — with built-in support for Microsoft accounts, mod loaders, profile management, and more. Designed for power users, modders, and anyone who loves minimalism and productivity.

![NPM](https://img.shields.io/npm/v/@origami-minecraft/stable?style=flat-square)
![License](https://img.shields.io/badge/license-GPL--3.0--only-blue.svg)
[![GitHub](https://img.shields.io/badge/github-merasugd%2Forigami-launcher?logo=github&style=flat-square)](https://github.com/merasugd/origami-launcher)

---

## 📥 Install Node.js

Before installing Origami, you need [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) (Node's package manager) installed.

### 🪟 Windows

1. Download the **LTS version** of Node.js from the [official website](https://nodejs.org/en/download).
2. Run the installer and follow the setup instructions.
3. Open **Command Prompt** and verify installation:

   ```bash
   node -v
   npm -v
   ```

### 🍎 macOS

You can use [Homebrew](https://brew.sh/):

```bash
brew install node
```

Or download the LTS installer from [nodejs.org](https://nodejs.org/en/download).

Verify installation:

```bash
node -v
npm -v
```

### 🐧 Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm
```

Alternatively, for newer versions:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Then check versions:

```bash
node -v
npm -v
```

### 📦 Alternative: Using NVM (Node Version Manager)

NVM allows you to easily switch between Node.js versions:

#### macOS/Linux:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
```

#### Windows:

Use [nvm-windows](https://github.com/coreybutler/nvm-windows):

1. Download the latest `nvm-setup.exe` from the [releases](https://github.com/coreybutler/nvm-windows/releases) page.
2. Install and open Command Prompt:

   ```bash
   nvm install lts
   nvm use lts
   node -v
   npm -v
   ```

> ✅ Make sure you're using **Node.js v18 or higher** for best compatibility.

---

## 🚀 Installation

### 🔒 Stable (Recommended)
Install the latest stable version from NPM:
```bash
npm install -g @origami-minecraft/stable
```

Once installed, you can use the `origami` command anywhere in your terminal.

---

### 🧪 Development Builds

> 🚧 Development builds are experimental. These builds may include experimental features and are considered unstable.

You can install them directly from NPM:

#### Install the latest dev build:
```bash
npm install -g @origami-minecraft/devbuilds
```

---

## 🗒️ Changelog

See what's new in stable builds in the [Changelog](https://github.com/merasugd/origami-launcher/blob/main/wiki/CHANGELOG.MD).

⚠️ Dev builds are expermental — use them at your own risk!

⚠️ Check out the latest dev build updates on the [GitHub Actions page.](https://github.com/merasugd/origami-launcher/actions)

---

## 🎮 Features

- 🎨 Beautiful terminal UI with gradient animations and ASCII art
- 🔐 Microsoft & Mojang Authenticator support
- 📂 Profile management (choose/create/remove)
- ⬇️ Install and manage Minecraft versions (vanilla & modded)
- 🛠 Customizable settings and CLI-first configuration
- 💨 Launch Minecraft directly from the terminal

---

## 📦 Usage

After installation, just run:

```bash
origami menu
```

### 🖼️ Preview

![Preview](https://raw.githubusercontent.com/merasugd/origami-launcher/refs/heads/main/wiki/images/image.png)

Navigate using your keyboard to log in, manage accounts, install versions, or launch the game.

---

### 📘 CLI Documentation

See the full CLI documentation here: [`📖 CLI.md`](https://github.com/merasugd/origami-launcher/blob/main/wiki/CLI.MD)

---

## 📝 License

This project is licensed under the **GPL-3.0-only** license.

---

## 🧪 Development

```bash
git clone https://github.com/merasugd/origami-launcher.git
cd origami-launcher
npm install

# testing
npm run compile
npm run origami
```

---

## 💖 Credits

- [Inquirer](https://github.com/SBoudrias/Inquirer.js) for interactive menus
- [Figlet](https://github.com/patorjk/figlet.js) for ASCII banners
- [Gradient-string](https://github.com/bokub/gradient-string) for rainbow text
- [MCLC](https://github.com/Pierce01/MinecraftLauncher-core) for the back bone of the launcher
- [Temurin](https://adoptium.net/) for JDK base
- Minecraft is copyright Mojang

---

## 🌐 Links

- 📁 GitHub: [github.com/merasugd/origami-launcher](https://github.com/merasugd/origami-launcher)
- 📦 NPM Stable: [npmjs.com/package/@origami-minecraft/stable](https://www.npmjs.com/package/@origami-minecraft/stable)

---

## 🙏 Support

Found a bug or want to suggest a feature? [Open an issue](https://github.com/merasugd/origami-launcher/issues) or submit a PR!

---

_Enjoy the terminal. Happy crafting :D_ 🧵