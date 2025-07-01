#!/usr/bin/env node
const { execSync } = require('child_process');
const pkg = require('../package.json');
const opposite = pkg.name === '@origami-minecraft/stable'
  ? '@origami-minecraft/devbuilds'
  : '@origami-minecraft/stable';

console.log(`✨ postinstall: removing any globally installed ${opposite}...`);
try {
  execSync(`npm uninstall -g ${opposite}`, { stdio: 'inherit' });
  console.log(`✅ Removed ${opposite} if it was installed.`);
} catch (err) {
  console.warn(`⚠️ No need to remove ${opposite} (it wasn't installed).`);
}