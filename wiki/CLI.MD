# 🌸 Origami CLI — Documentation

> ✨ **Lightweight Minecraft CLI Launcher**
> Supports profiles, authentication, version installation, and launching — scriptable & interactive.

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

* `-l, --login <provider>` — Log in using a provider (`microsoft`, `littleskin`, `ely_by`, `meowskin`)
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

### `java`

Install or select a Java runtime (Temurin).

#### Options:

* `-i, --install` — Download and install a Temurin JDK
* `-s, --select` — Choose a JDK installed via Origami

#### Examples:

```bash
origami java --install
origami java --select
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
* `meowskin` — BlessingSkin auth system

---

## 💡 Tips & Notes

* You **must select a profile** before launching Minecraft.
* Development builds (`-devX`) may contain experimental or incomplete features.
* You can install and select Java via `origami java`.
* To see all available profiles:

  ```bash
  origami profile --list
  ```

---

## 📦 Version Example

```bash
origami --version
# 1.0.1 or 1.0.1-dev2
```

---

## 🔧 Example Script Usage

```bash
#!/bin/bash

# Script to set up Java, log in, and launch Minecraft
origami java --install
origami java --select
origami auth --login microsoft
origami profile --select myProfile
origami launch
```

---

## 📖 Related

* [GitHub Repository](https://github.com/merasugd/origami-launcher)
* [NPM Page](https://www.npmjs.com/package/@origami-minecraft/stable)