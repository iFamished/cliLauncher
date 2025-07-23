# 🌸 Origami CLI — Documentation

> ✨ **Lightweight Minecraft CLI Launcher**  
> Supports profiles, authentication, version installation, Java management, mod installation, and launching — both scriptable & interactive.

---

## 📦 Installation

### Stable Release (Recommended)

```bash
npm install -g @origami-minecraft/stable
```

### Development Build (Unstable, bleeding-edge)

```bash
npm install -g @origami-minecraft/devbuilds
```

---

## 🧭 Usage

```bash
origami [command] [options]
```

To show help:

```bash
origami --help
```

---

## 📜 Commands

### `menu`

Launch the full interactive menu UI.

```bash
origami menu
```

---

### `launch`

Launch Minecraft using the currently selected profile.

```bash
origami launch
```

---

### `profile`

Manage Minecraft profiles.

#### Options:

* `-s, --select <profile>` — Select a specific profile
* `-i, --install` — Install a Minecraft version
* `-d, --delete` — Opens the Profile Deletion Menu
* `-l, --list` — List all available profiles

#### Examples:

```bash
origami profile
origami profile --list
origami profile --select MyProfile
origami profile --install
```

---

### `auth`

Authenticate Minecraft accounts.

#### Options:

* `-l, --login <provider>` — Log in using a provider (`microsoft`, `littleskin`, `ely_by`)
* `-r, --remove <account>` — Remove an account by ID
* `-c, --choose` — Select an account to use

#### Examples:

```bash
origami auth
origami auth --login microsoft
origami auth --remove 1234567890abcdef
origami auth --choose
```

---

### `authprovider`

Manage user-added authentication providers (e.g. custom Yggdrasil servers).

#### Options:

* `-c, --create` — Add a custom auth provider
* `-d, --delete` — Delete one or more custom auth providers (checkbox-based)

#### Examples:

```bash
origami authprovider
origami authprovider --create
origami authprovider --delete
```

---

### `java`

Manage Java runtimes (Temurin).

#### Options:

* `-i, --install` — Download and install a Temurin JDK
* `-s, --select` — Choose a JDK installed via Origami
* `-d, --delete` — Delete installed Java

#### Examples:

```bash
origami java --install
origami java --select
origami java --delete
```

---

### `modrinth`

Install mods, shaders, or resource packs from Modrinth (requires selected profile).

```bash
origami modrinth
```

---

### `manage`

Manage installed content for the selected profile — enables/disables mods and removes items.

```bash
origami manage
```

---

### `clean`

Reset data folders related to Minecraft or Origami.

#### Options:

* `--minecraft` — Reset `.minecraft` folder
* `--origami` — Reset Origami configuration (e.g. accounts, profiles)
* `--all` — Reset everything

#### Examples:

```bash
origami clean --minecraft
origami clean --origami
origami clean --all
```

---

## 🧪 Supported Auth Providers

You can log in using:

* `microsoft` — Official Microsoft account login
* `littleskin` — BlessingSkin auth system
* `ely_by` — Ely.by auth system

❌ **Note:** `meowskin` is no longer supported.

---

## 💡 Tips & Notes

* You **must select a profile** before launching Minecraft.
* Development builds (`-devX`) may contain experimental or incomplete features.
* You can install, select, and delete Java via `origami java`, `origami java --delete`.
* You can manage mods and content via `origami modrinth` and `origami manage`.

---

## 📦 Version Example

```bash
origami --version
# 1.0.6 or 1.0.6-dev3
```

---

## 🔧 Example Script Usage

```bash
#!/bin/bash

# Script to set up Java, log in, install mods, and launch Minecraft
origami java --install
origami java --select
origami auth --login microsoft
origami profile --select myProfile
origami modrinth
origami launch
```

---

## 📖 Related

* [GitHub Repository](https://github.com/merasugd/origami-launcher)
* [NPM Page](https://www.npmjs.com/package/@origami-minecraft/stable)