# 📦 Changelog

All notable changes to this project will be documented in this file.

## 🔁 Development Builds

> Installed via:
> `npm install -g @origami-minecraft/devbuilds`

⚠️ **Warning:**
Development builds are experimental and **not completely tested**.
They may contain bugs, incomplete features, or unstable behavior.
Some features introduced in these builds may never make it into stable releases.

🙏 Thanks for testing! If you'd like to help shape the future of Origami, feel free to try out dev builds and report bugs or feedback — your input helps make stable releases better for everyone!

---

## ✅ Stable Releases

> These builds are published to the **npm registry**:
> `npm install -g @origami-minecraft/stable`

---

### \[2.0.8] - 2025-07-08

* ✨ **Per-Profile Java Runtime Selection**

  * Selecting Java Runtime per profile now supported via choose profile then configure settings.
  * Custom Java paths are now properly remembered and validated

* 🔄 🗂 Menu Refactor: “Choose Profile” → “All Profiles”

  * Renamed main menu option from “Choose Profile” to just “All Profiles”
  * Reflects expanded features: not just selection, but also profile-specific actions

* ✨ **Per-Profile JVM Argument and Java Runtime Config**

  * now fully supports per-profile settings for:
    * JVM Arguments
    * Java binary selection
  * Clean fallback to global/default if not a profile settings configuration

* ✨ **Improved Java Path Validator for Custom Input**

  * Verifies that the path exists, is a directory, and contains a valid `bin/java` binary
  * More helpful error messages and validation output

* ✨ **Automatic Java Path Prompt Fallback**

  * If `JAVA_HOME` is not set or invalid, user is prompted once to enter a valid Java directory
  * Resolved executable path is saved to the profile or global context

* 🐛 **Java Installer Cleanup Fix**

  * Fixes an issue where deleting a manual Java path from database would abort the rest of the deletion loop
  * Ensures cleanup continues even after manual binaries are removed

---

### \[2.0.7] - 2025-07-07

* ✨ **Zulu OpenJDK Metadata API v1 Integration**

    * Migrated Zulu provider to use **Azul’s new `metadata/v1/zulu/packages` API**
    * Greatly improves accuracy, performance, and long-term stability of version listing and binary resolution
    * Proper support for `jdk` vs `jre`, OS/arch mapping, and bundle filtering via query params

* ✨ **Amazon Corretto Provider Added**

    * Added support for **Amazon Corretto** as a Java JDK provider
    * Implements metadata scraping using Corretto's CDN and latest-download endpoints
    * Automatically detects available JDK builds for various platforms

* 🏷️ Java Installations Now Track Provider Info
    * Each extracted Java runtime is tagged with a `.provider` file inside its folder
    * Enables better provider-aware selection and management of installations

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