import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');

const collectJavaScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
};

const runSyntaxCheck = (filePath) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', filePath], {
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Syntax check failed for ${filePath}.`));
    });
  });

const files = await collectJavaScriptFiles(sourceRoot);

for (const filePath of files) {
  await runSyntaxCheck(filePath);
}

process.stdout.write(`Syntax check passed for ${files.length} files.\n`);
