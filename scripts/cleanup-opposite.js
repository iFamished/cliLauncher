const { execSync } = require('child_process');
const pkg = require('../package.json');

const currentName = pkg.name;
const opposite = currentName === '@origami-minecraft/stable'
    ? '@origami-minecraft/devbuilds'
    : '@origami-minecraft/stable';

try {
    console.log(`Checking for globally installed ${opposite}...`);
    const result = execSync(`npm list -g --depth=0 ${opposite}`, { stdio: 'pipe' }).toString();

    if (result.includes(opposite)) {
        console.log(`Found ${opposite}, removing...`);
        execSync(`npm uninstall -g ${opposite}`, { stdio: 'inherit' });
    }
} catch (err) {
    // It's okay if not installed
}