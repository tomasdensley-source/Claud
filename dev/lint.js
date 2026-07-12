"use strict";

// "Lint" for this repo = a syntax check of every JavaScript file, both the dev
// harness and the plugin sources shipped inside the vault zip. The plugins have
// no build step, so `node --check` is the closest equivalent to a compile pass.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { OUT, ensureExtracted } = require("./extract-vault.js");

const ROOT = path.resolve(__dirname, "..");

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
}

function main() {
  if (!fs.existsSync(OUT)) ensureExtracted();

  const files = [];
  walk(path.join(ROOT, "dev"), files);
  walk(OUT, files);

  let failed = 0;
  for (const file of files) {
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
      console.log(`  ok    ${path.relative(ROOT, file)}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL  ${path.relative(ROOT, file)}`);
      console.error(String(err.stderr || err.message));
    }
  }

  console.log(`\n[lint] checked ${files.length} file(s), ${failed} failure(s).`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
