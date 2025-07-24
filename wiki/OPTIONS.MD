# 🎮 Origami Launcher Settings Guide

Welcome to the Origami Launcher Settings guide. This document explains what each launcher option does, both globally and per profile.

---

## ⚙️ Global Settings

These settings apply to **all profiles** unless overridden by per-profile configurations.

### 💾 Memory Settings

* **Min RAM**: The minimum amount of memory Minecraft will start with.
* **Max RAM**: The maximum amount of memory Minecraft is allowed to use.
* → Affects performance and stability. Too little RAM may cause lag or crashes.

---

### 🪟 Window Size

* Sets the initial size of the Minecraft game window (e.g. 1280x720).
* Does **not** affect resolution or quality — only the window's dimensions on screen.

---

### 🖥️ Fullscreen Mode

* When enabled, Minecraft will launch in fullscreen.
* When disabled, it will open in a window with your selected resolution.

---

### 🔌 Safe Exit

* When enabled, **Minecraft continues running** even if the terminal or command prompt is closed.
* Useful for keeping the game running in the background, especially on headless or server setups.

---

### 🔗 Max Sockets

* Controls how many network connections the launcher is allowed to open simultaneously.
* Higher values may improve mod downloads, but too many can cause network throttling.

---

### ⚡ Parallel Connections

* Controls how many files can be downloaded **at the same time**.
* Helps speed up downloads for modpacks or updates, depending on your system and internet.

---

### 🌐 Universal Game Directory

* When enabled, **all profiles share the same `.minecraft` folder** for saves, mods, and data.
* When disabled, each version uses its own folder in `./minecraft/versions/<version>/data`.
* Useful if you want a classic Minecraft layout, or for compatibility with older mods/tools.

---

### 🔒 Offline Authentication

* When enabled, you can **launch Minecraft without an internet connection**.
* Not recommended — only use if you're offline and understand the security risks.
* Accounts will not be verified or synced with Mojang servers.

---

## 🧍‍♂️ Per-Profile Settings

These settings apply only to the selected profile and override the global defaults.

---

### ☕ JVM Arguments

* Advanced users can modify the raw Java launch flags here.
* Affects performance, garbage collection, debugging, and memory handling.
* Example: `-XX:+UnlockExperimentalVMOptions -XX:+UseG1GC`

---

### 🧬 Java Runtime

* Allows you to select a specific Java version for this profile.
* Useful when different mods or Minecraft versions require specific Java builds.

---

## ✅ Defaults

If you don’t change anything, the launcher uses safe defaults:

| Setting              | Default Value     |
| -------------------- | ----------------- |
| Min RAM              | 512M              |
| Max RAM              | 2G                |
| Window Size          | 854x480           |
| Fullscreen           | Off               |
| Safe Exit            | Off               |
| Max Sockets          | 8                 |
| Parallel Connections | auto-detected     |
| Universal Game Dir   | Off               |
| Offline Auth         | Off               |

---

## 📝 Notes

* All settings are saved automatically.
* Per-profile settings take priority over global ones.
* You can reset settings anytime via the configuration menu.

---

Enjoy Minecraft with Origami! 💖
