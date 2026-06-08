const { readdirSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = join(__dirname, '..');
const skippedDirs = new Set(['node_modules', '.git']);

const collectJavaScriptFiles = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return skippedDirs.has(entry.name) ? [] : collectJavaScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
};

const files = collectJavaScriptFiles(rootDir).sort();
const failures = [];

files.forEach((file) => {
  const result = spawnSync(process.execPath, ['-c', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push({
      file: relative(rootDir, file),
      output: `${result.stderr || ''}${result.stdout || ''}`.trim()
    });
  }
});

if (failures.length) {
  failures.forEach(({ file, output }) => {
    console.error(`Syntax check failed: ${file}`);
    if (output) console.error(output);
  });
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} function source files.`);
