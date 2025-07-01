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

### [1.0.1-dev2] - 2025-06-30
- ✨ Added the support for clean up or resetting data.
- ✨ Added new `clean` CLI subcommand:
  - `--minecraft` — resets `.minecraft` directory
  - `--origami` — resets Origami config/data (e.g. accounts, profiles)
  - `--all` — resets both

--- 

### [1.0.1-dev1] - 2025-06-30
- ✨ Added scriptable CLI subcommands: `menu`, `profile`, `auth`, and `launch`
- ✨ Implemented `--select`, `--list` flags for `origami profile` command
- ✨ Implemented `--login`, `--remove`, `--choose` options for `origami auth`
- ✨ Auto-detect and index valid Minecraft versions from `.minecraft/versions`
- 🔄 CLI validates and fails gracefully with friendly messages
- 🔄 Refactored command actions with `commander`, input validators, and fallback to interactive menus

---

## ✅ Stable Releases

> These builds are published to the **npm registry**:  
> `npm install -g @origami-minecraft/stable`

--- 

### [1.0.3] - 2025-07-01
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

