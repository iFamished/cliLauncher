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

### [1.0.5] - 2025-07-01
- ✨ **Java Runtime Support (Temurin-based)**
  - New `java` command:
    - `origami java --install` to download and install Java (JDK or JRE)
    - `origami java --select` to choose installed Java versions
- ✨ **Temurin Java Integration in Menu**
  - New options in `origami menu` to install or select Java interactively
  - Auto-detects and remembers selected Java runtime

---

### [1.0.3-1.0.4] - 2025-07-01
- 🐛 Fixed NPM Package Issues
  - Updated `package.json` metadata to reflect correct scoped naming
  - Deprecated old `origami-minecraft` package with a proper message directing users to:
    - Stable: `@origami-minecraft/stable`
    - Dev: `@origami-minecraft/devbuilds`

---

### [1.0.2] - 2025-07-01
- 🔄 **Switched to Scoped Package Installation**
  - ⚠️ **Breaking Change**: All previous installation methods are now deprecated and unsupported.
  - `origami-minecraft` is now split into scoped packages:
    - ✅ Stable builds: `npm install -g @origami-minecraft/stable`
    - 🧪 Dev builds: `npm install -g @origami-minecraft/devbuilds`
  - This improves clarity, package separation, and future release workflows.

--- 

### [1.0.1] - 2025-07-01
- ✨ Added `clean` command for resetting Minecraft or Origami data
- ✨ Added scriptable subcommands: `menu`, `profile`, `auth`, `launch`
- ✨ Added `--select`, `--list`, `--login`, `--remove`, `--choose` options
- ✨ Auto-detects installed Minecraft versions from `.minecraft/versions`
- ✨ Added version checking on launch to notify about new updates
- 🔄 Improved CLI error handling and input validation
- 🔄 Refactored internal command structure with fallback prompts

--- 

### [1.0.0] - 2025-06-25
- 🎉 Initial stable release

---

## 📌 Legend

- ✨ Feature  
- 🐛 Bugfix  
- 🔄 Change  
- ⚠️ Deprecation  
- 🧪 Test  
- 🚧 Refactor  
- 🎉 Release
