# 📦 Changelog

All notable changes to this project will be documented in this file.

## 🔁 Development Builds (Unreleased or GitHub-only)

> These builds are **not** published to npm.  
> Installed via:  
> `npm install git+https://github.com/merasugd/origami-launcher.git`

⚠️ **Warning:**  
Development builds are experimental and **not completely tested**.  
They may contain bugs, incomplete features, or unstable behavior.  
Some features introduced in these builds may never make it into stable releases.

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
> `npm install origami-minecraft`

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

