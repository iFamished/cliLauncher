# 📦 Changelog

All notable changes to this project will be documented in this file.

## 🔁 Development Builds

> Installed via:
> `npm install -g @origami-minecraft/devbuilds`
> or
> `yarn global add @origami-minecraft/devbuilds`

⚠️ **Warning:**
Development builds are experimental and **not completely tested**.
They may contain bugs, incomplete features, or unstable behavior.
Some features introduced in these builds may never make it into stable releases.

🙏 Thanks for testing! If you'd like to help shape the future of Origami, feel free to try out dev builds and report bugs or feedback — your input helps make stable releases better for everyone!

---

## ✅ Stable Releases

> These builds are published to the **npm registry**:
> `npm install -g @origami-minecraft/stable`
> or
> `yarn global add @origami-minecraft/stable`

---

### \[2.3.0] - 2025-07-27

> 📦 **Modpack Installer**

* 🧪 **Experimental Modpack Installer**
  * Modpacks can now be installed via the **interactive menu** (`origami menu`)
  * Supports basic `.mrpack` modpack formats (Modrinth), downloads mods, and sets up loaders

> 🌐 **Profile & Game Directory Improvements**

* 🌐 **Universal Game Directory (Per Profile)**
  * Previously a **global-only** setting, **Universal Game Directory** can now be enabled **per profile**
  * Great for cases where some profiles need traditional `.minecraft` behavior, while others prefer isolated folders

* 🛠️ **Fixed Profile Auto Importer**
  * Now reads `version.json` to determine the correct loader metadata (e.g., Forge, Fabric) instead of guessing from the folder name
  * Prevents misclassification (e.g., treating Quilt as Fabric)

> 🚀 **Performance & Stability Improvements**

* ⚡ **Parallel Downloading for Non-Assets and Non-Libraries**
  * Added parallel downloading support to the general file downloader
  * Assets and libraries already had parallel downloading via **MCLC**, but now this applies to other downloads (e.g., modpacks, custom files)

* 💾 **Safer File Writing**
  * Fixed downloader to use **temporary files** before renaming to final path
  * Prevents partial or corrupted files if a download fails or is interrupted

> 🔧 **Loader Compatibility**

* 🛠️ **Improved JVM Flag Handling for Forge + NeoForge**
  * 🐛 Fixed crashes on certain Forge and NeoForge installs due to missing JVM arguments
  * Launcher now auto-detects and injects necessary `-D` flags for both loaders

> 🎛️ **Modrinth Filter Enhancements**

* 🎯 **Improved Modrinth Filter Configuration**
  * Filter settings like page limit, categories, and version matching are now individually configurable
  * No longer need to reconfigure all filters each time — just change what you want
  * Improves speed and user control when browsing mods or resource packs

> 📂 **New Extraction System**

* 🗃️ **Streamlined Tar & Zip Extraction**
  * Rewrote the internal extraction system for `.zip` and `.tar.gz` formats
  * Ensures reliable decompression using safer stream handling and temporary files
  * Adds support for progress tracking

---

### \[2.2.1] - 2025-07-24
* Fixed readme issues

---

### \[2.2.0] - 2025-07-24

> 📦 **Data Structure Migration + Log Improvements**

* 🔄 **New Storage Structure for Origami Files**

  * ✅ All `origami_files` data (e.g., accounts, global settings, profiles) has been **moved out of `.minecraft`**
  * ✅ Keeps Origami files **safe from accidental `.minecraft` deletion**
  * 🧠 Migration is seamless — **auto-migration is fully supported**, no user action needed!

* 📁 **Game Version Data Relocation**

  * All version-specific data in `./minecraft/origami_files/instances/<id>` has been moved to:

    ```
    ./minecraft/versions/<id>/data
    ```
  * 🔍 Groups configuration files, metadata, and game data **in one place per version**
  * Makes it easier to navigate and manually tweak individual instance settings

* 🌐 **New Global Setting: "Universal Game Directory"**

  * You can now enable a **Universal Game Directory** mode in the global settings
  * When enabled, the launcher uses `.minecraft` as the **main game directory** for all versions
  * Useful for compatibility with mods or tools expecting files in the traditional location

* 🧹 **OpenGL Debug Spam Suppressed**

  * 🪄 Suppressed `GLDebug` OpenGL error messages from Minecraft log output like:

    ```
    GL_INVALID_OPERATION in (null): (ID: 173538523) Generic error
    ```
  * Keeps logs clean and readable by hiding non-critical rendering errors

* ✨ **Config UI Now Shows Current Values**

  * The options configuration screen now **displays current values** for each setting
  * Makes reviewing and editing settings easier and more transparent

* ✨ **New: Reset Settings**
  * You can now **reset all global or per-profile options** to their default values from the configuration menu
  * Great for resolving issues or starting fresh with default launcher behavior

* 🐛 **Fixed Profile Settings Not Saving Properly**

  * Per-profile JVM and Java runtime settings now **save correctly** and persist between sessions

---

### \[2.1.0] - 2025-07-24

> 🎉 **Minor UI Update**

* ✨ **New UI Header in Interactive Menu**

  * The interactive menu now shows a cleaner banner and includes:

    * 🎮 Current selected **profile**
    * 👤 Current selected **account**
    * ☕ Selected **Java binary**

* ✨ **New Error Popup System**

  * Errors are now displayed in a clean, bordered **popup box** using `boxen`
  * 💬 The errors will ask you to press Enter to continue, so you don’t miss them!

* ✨ **Java Runtime Compatibility Check**

  * Before launching, Origami now verifies if your Java version matches the required version for the **Minecraft version/profile**

* 🔄 **Mod Loader Dependency Fixes**

  * Ensures **vanilla Minecraft version is installed first** before setting up a mod loader (e.g. Forge, NeoForge, Fabric)
  * Prevents mod loader crashes due to missing vanilla base versions

* 🐛 **NeoForge is now fully supported!**

  * 🐛 After weeks of instability, NeoForge support is now considered **stable**
  * Launcher auto-handles metadata, dependencies, and profile creation like other loaders

* ✨ Improved JVM Argument Profiles by Loader

  * Forge, NeoForge, Fabric, Quilt, and Vanilla get tailored arguments based on their launch requirements

---

### \[2.0.11] - 2025-07-23

* ✨ **Added support for custom Yggdrasil authentication servers**

  * `origami authprovider --create` now allows adding custom servers
  * Useful for private or enterprise login endpoints

* ✨ **Offline mode authentication (experimental)**

  * ⚠️ Only available if you **do not have internet**
  * Can be toggled in global config via `Allow Offline Auth`
  * Not recommended for regular users with Wi-Fi

* 🔄 **Auth system refactor**

  * Older accounts that do not match supported providers are now categorized as `"other"`
  * ❗ **Disabled**, **non-working**, and **offline-created** accounts are also marked as `"other"` if **Offline Auth is disabled** (which is the default)
  * Helps preserve data while warning users of unsupported or incompatible accounts

* ⚠️ **Removed support for `meowskin`**

  * API changes have broken compatibility
  * Users must switch to supported providers (Microsoft, Littleskin, Ely.by)

* 🐛 **Check for non-TTY environments**

  * CLI now detects when it's running in a **non-interactive shell**
  * Prevents prompts from blocking scripts or automation tools

---

### \[2.0.10] - 2025-07-08

* 🐛 **Fixed current bugs with Authlib JAR and Global/Profile Settings**

---

### \[2.0.9] - 2025-07-08

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

### \[2.0.3] - 2025-07-06

* 🐛 Fixed `origami_installs.json` not found.

---

### \[2.0.0] - 2025-07-06

> 🎉 **Major Mod Installer Update**

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

### \[1.0.4] - 2025-07-01

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