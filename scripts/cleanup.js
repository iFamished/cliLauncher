const { execSync } = require('child_process');
const pkg = require('../package.json');

const currentName = pkg.name;
const opposite = currentName === '@origami-minecraft/stable'
    ? '@origami-minecraft/devbuilds'
    : '@origami-minecraft/stable';

try {
    console.log(`Checking for globally installed ${opposite}...`);
    execSync(`npm uninstall -g ${opposite}`, { stdio: 'inherit' });
} catch (err) {
    console.log(`Checking for globally installed: returned an error ${err}...`);
    // It's okay if not installed
}