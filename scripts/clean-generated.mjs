import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceRoot = path.join(rootDir, "src", "ts");
const outputRoot = path.join(rootDir, "assets", "js");

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

const sourceFiles = walkTsFiles(sourceRoot);

for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(sourceRoot, sourceFile);
  const jsOutput = path.join(outputRoot, relativePath).replace(/\.ts$/, ".js");
  const dtsOutput = path.join(outputRoot, relativePath).replace(/\.ts$/, ".d.ts");

  [jsOutput, dtsOutput].forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      console.log(`removed ${path.relative(rootDir, filePath)}`);
    }
  });
}
