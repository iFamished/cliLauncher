# 📦 Changelog

All notable changes to this project will be documented in this file.

## 🔁 Development Builds

> Installed via:
> `npm install -g @origami-minecraft/devbuilds`

⚠️ **Warning:**
Development builds are experimental and **not completely tested**.
They may contain bugs, incomplete features, or unstable behavior.
Some features introduced in these builds may never make it into stable releases.

---

## ✅ Stable Releases

> These builds are published to the **npm registry**:
> `npm install -g @origami-minecraft/stable`

---

### \[2.0.6] - 2025-07-06

* ✨ **Launcher Options Selector**

  * Added an interactive prompt to **choose which options to configure** (memory, window size, JVM args, etc.)
  * No longer forces reconfiguration of all options when modifying just one
  * Improves UX for fine-tuning launcher behavior without overwriting existing settings

* ⚠️ **User Feedback Enhancements**

  * Warns user when trying to edit JVM args with no loaded profile
  * Clearer messages and validation around memory, resolution, and connection settings

---

### \[2.0.5] - 2025-07-06

* ✨ **GraalVM Runtime Support**

  * Added support for downloading and selecting **GraalVM CE** as a Java runtime
  * Automatically fetches the latest stable releases from GitHub
  * Smart OS/architecture detection and binary resolution
  * Seamless integration into Java selection UI and CLI (`origami java --install`)

* ✨ **Zulu OpenJDK Support**

  * Added automated installation for **Zulu OpenJDK** via Azul’s public API
  * Supports multiple major versions with proper SemVer sorting
  * Covers Linux, macOS, and Windows platforms with `.tar.gz` and `.zip` binaries

* 🔄 **Java Runtime Installer Enhancements**

  * Improved sorting and detection of version tags (SemVer-aware)
  * Unified installation logic across Temurin, GraalVM, Zulu (Corretto coming soon)
  * Robust binary resolution pattern for common OS/arch combos

* ✨ **Java Binary Deletion Feature**

  * Added interactive method to list and delete installed Java binaries
  * Integrated directly into the Java binary management system
  * Prevents clutter and simplifies cleanup of unused JDKs

* 🐛 **Fixes**

  * Fixed pattern mismatch in GraalVM asset matching for Windows `.zip` files

---

### \[2.0.4] - 2025-07-06

* ✨ Added support for configurable page limit during Modrinth content browsing
* ✨ Added `nvm`-based Node.js installation instructions in the README and Node.js setup guide
* 🐛 Fixed type errors and improved prompt validation for numeric inputs (e.g., page size)
* 🔄 Refined dependency installation log output

  * ➕ Skips verbose logs when keeping already-installed mods
* ⚠️ Minor improvements to Modrinth filter persistence and prompt defaults

---

### \[2.0.1-2.0.3] - 2025-07-06

* 🐛 Fixed `origami_installs.json` not found.

---

### \[2.0.0] - 2025-07-06

> 🚀 **Major Mod Installer Update**

* ✨ **Brand-new Mod Downloading System**

  * Interactive UI to browse and install **mods**, **resource packs**, and **shaders** directly from **Modrinth**
  * Search, filter by Minecraft version, categories, loader (Fabric, Forge, NeoForge, etc.)
  * Supports paginated results, configurable filters, and intelligent dependency handling
  * Overwrite confirmation prompts with `Apply to All` logic
  * Smart version detection and semantic matching (`strict`, `match`, or `none`)

* ✨ **Modrinth Integration**

  * Fetches recommended and featured content directly from Modrinth
  * Handles mod dependencies with version compatibility resolution
  * Mod folder detection and cleanup for missing or disabled files

* 🔄 **Dependency Installer**

  * Auto-downloads required dependencies for mods
  * Graceful fallback for missing versions or projects

* 🔄 **Filter Configuration System**

  * Users can now set default filters for sorting, category, and version matching
  * Stored per profile, remembered between installations

* 🐛 **Downloader Enhancements**

  * Fixed “Too many open files” (EMFILE) issue with concurrency control
  * Improved platform-specific limits and retry logic
  * Better file overwrite logic and safety

* 🔐 **Secure Account Migration**

  * Migrated legacy to new encrypted format `account.dat` using `keytar` for better security
  * Automatic detection and upgrade from old formats


* ⚠️ **Internal Enhancements**

  * Refactored internal downloader manager
  * Added install feedback, spinners, and status indicators
  * Enhanced logging for CLI actions

---

### \[1.0.5] - 2025-07-01

* ✨ **Java Runtime Support (Temurin-based)**

  * New `java` command:

    * `origami java --install` to download and install Java (JDK or JRE)
    * `origami java --select` to choose installed Java versions
* ✨ **Temurin Java Integration in Menu**

  * New options in `origami menu` to install or select Java interactively
  * Auto-detects and remembers selected Java runtime

---

### \[1.0.3–1.0.4] - 2025-07-01

* 🐛 Fixed NPM Package Issues

  * Updated `package.json` metadata to reflect correct scoped naming
  * Deprecated old `origami-minecraft` package with a proper message directing users to:

    * Stable: `@origami-minecraft/stable`
    * Dev: `@origami-minecraft/devbuilds`

---

### \[1.0.2] - 2025-07-01

* 🔄 **Switched to Scoped Package Installation**

  * ⚠️ **Breaking Change**: All previous installation methods are now deprecated and unsupported.
  * `origami-minecraft` is now split into scoped packages:

    * ✅ Stable builds: `npm install -g @origami-minecraft/stable`
    * 🧪 Dev builds: `npm install -g @origami-minecraft/devbuilds`
  * This improves clarity, package separation, and future release workflows.

---

### \[1.0.1] - 2025-07-01

* ✨ Added `clean` command for resetting Minecraft or Origami data
* ✨ Added scriptable subcommands: `menu`, `profile`, `auth`, `launch`
* ✨ Added `--select`, `--list`, `--login`, `--remove`, `--choose` options
* ✨ Auto-detects installed Minecraft versions from `.minecraft/versions`
* ✨ Added version checking on launch to notify about new updates
* 🔄 Improved CLI error handling and input validation
* 🔄 Refactored internal command structure with fallback prompts

---

### \[1.0.0] - 2025-06-25

* 🎉 Initial stable release

---

## 📌 Legend

* ✨ Feature
* 🐛 Bugfix
* 🔄 Change
* ⚠️ Deprecation
* 🧪 Test
* 🚧 Refactor
* 🎉 Release