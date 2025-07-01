import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const versionArg = args.find(arg => arg.startsWith('--version='));

if (!versionArg) {
  console.error('❌ Missing --version argument (e.g. --version=1.0.0 or --version=1.0.0-dev)');
  process.exit(1);
}

let version = versionArg.split('=')[1];
const isDev = version.includes('dev');

const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

if (isDev) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-T:]/g, '').slice(0, 14);
  version = `${version}.${timestamp}`;
  pkg.name = '@origami-minecraft/devbuilds';
  console.log(`📦 Publishing DEV build: ${pkg.name}@${version}`);
} else {
  pkg.name = '@origami-minecraft/stable';
  console.log(`📦 Publishing STABLE release: ${pkg.name}@${version}`);
}

pkg.version = version;

// Write package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Run publish
try {
  execSync('npm publish --access public', { stdio: 'inherit' });
  console.log('✅ Published successfully!');
} catch (err) {
  console.error('❌ Publish failed:', err);
  process.exit(1);
}