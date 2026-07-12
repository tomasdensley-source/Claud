"use strict";

// Extracts obsidian-vault-fixed.zip into ./obsidian-vault-extracted so the plugin
// sources can be loaded and exercised by the dev harness. Idempotent.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ZIP = path.join(ROOT, "obsidian-vault-fixed.zip");
const OUT = path.join(ROOT, "obsidian-vault-extracted");

function main() {
  if (!fs.existsSync(ZIP)) {
    console.error(`[extract] Cannot find ${ZIP}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  execFileSync("unzip", ["-o", ZIP, "-d", OUT], { stdio: "inherit" });
  console.log(`[extract] Vault extracted to ${OUT}`);
}

if (require.main === module) {
  main();
}

module.exports = { OUT, ensureExtracted: main };
