"use strict";

// Headless development harness for the custom Obsidian plugins.
//
// It boots a jsdom document that mimics Obsidian's file-explorer DOM, emulates
// the Obsidian runtime (see obsidian-env.js), loads the *real, unmodified*
// plugin sources from the extracted vault, and drives their core features while
// asserting the resulting behaviour. This is the "run the application" step for
// a repo whose only product is Obsidian plugin JavaScript.

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { createObsidianEnv } = require("./obsidian-env.js");
const { OUT, ensureExtracted } = require("./extract-vault.js");

const PLUGINS_DIR = path.join(OUT, "obsidian-vault", ".obsidian", "plugins");

let passed = 0;
let failed = 0;
function check(label, cond) {
  if (cond) {
    passed += 1;
    console.log(`  \u2713 ${label}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${label}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

function bootDom() {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div class="workspace-leaf-content" data-type="file-explorer">
        <div class="view-content">
          <div class="nav-files-container"></div>
        </div>
      </div>
    </body></html>`,
    { pretendToBeVisual: true, url: "http://localhost/" }
  );
  const { window } = dom;
  const globals = [
    "window", "document", "Element", "HTMLElement", "HTMLInputElement",
    "HTMLButtonElement", "Event", "CustomEvent", "MouseEvent", "Node",
    "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle",
    "localStorage",
  ];
  for (const key of globals) {
    global[key] = window[key];
  }
  global.window = window;
  global.document = window.document;
  return window;
}

function loadPlugin(id, obsidian) {
  const file = path.join(PLUGINS_DIR, id, "main.js");
  const code = fs.readFileSync(file, "utf8");
  const module = { exports: {} };
  const localRequire = (name) => (name === "obsidian" ? obsidian : require(name));
  const fn = new Function("module", "exports", "require", code);
  fn(module, module.exports, localRequire);
  return module.exports;
}

function addRow(container, cls, dataPath, label) {
  const row = document.createElement("div");
  row.className = cls;
  row.setAttribute("data-path", dataPath);
  const content = document.createElement("div");
  content.className = cls.includes("folder")
    ? "nav-folder-title-content"
    : "nav-file-title-content";
  content.textContent = label;
  row.appendChild(content);
  container.appendChild(row);
  return row;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(PLUGINS_DIR)) ensureExtracted();

  const window = bootDom();
  const env = createObsidianEnv(window, window.document);
  const { app, vault, obsidian, Notice, TFile, TFolder, modalHooks } = env;

  const container = document.querySelector(".nav-files-container");

  // Seed a small vault: a couple of top-level folders + notes, plus a nested
  // note so the delete de-duplication path can be exercised.
  const inbox = new TFolder("00_Inbox");
  const daily = new TFolder("01_Daily");
  vault.addFile(inbox);
  vault.addFile(daily);
  vault._root.children = [inbox, daily];
  vault.addFile(new TFile("00_Inbox/Note A.md"));
  vault.addFile(new TFile("00_Inbox/Sub/Note B.md"));
  vault.addFile(new TFile("01_Daily/2026-07-12.md"));

  const rowInboxFolder = addRow(container, "nav-folder-title", "00_Inbox", "00_Inbox");
  const rowNoteA = addRow(container, "nav-file-title", "00_Inbox/Note A.md", "Note A");
  const rowNoteB = addRow(container, "nav-file-title", "00_Inbox/Sub/Note B.md", "Note B");
  const rowDaily = addRow(container, "nav-file-title", "01_Daily/2026-07-12.md", "2026-07-12");

  // ------------------------------------------------------------------
  section("file-tree-bulk-actions");
  const FileTreeBulkActions = loadPlugin("file-tree-bulk-actions", obsidian);
  const ftba = new FileTreeBulkActions(app, { id: "file-tree-bulk-actions" });
  await ftba.onload();
  ftba.bindExplorers();

  const explorer = document.querySelector('.workspace-leaf-content[data-type="file-explorer"]');
  const actionBar = explorer.querySelector(".ftba-action-bar");
  check("plugin injected a bulk-action bar into the explorer", !!actionBar);
  check("action bar starts hidden", actionBar.classList.contains("is-hidden"));

  // Enter selection mode via the real pointer path (jsdom rects are 0x0, so a
  // pointerdown lands in the row's right-edge "selection zone").
  rowNoteA.querySelector(".nav-file-title-content").dispatchEvent(
    new window.MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0, button: 0 })
  );
  check("pointerdown on a note enters selection mode", ftba.selectionMode === true);
  check("Note A is selected after long-press zone tap", ftba.selectedPaths.has("00_Inbox/Note A.md"));
  check("action bar becomes visible in selection mode", !actionBar.classList.contains("is-hidden"));

  // Add more selections directly through the plugin's real toggle method.
  ftba.toggleRowSelection(rowNoteB);
  ftba.toggleRowSelection(rowDaily);
  const countEl = actionBar.querySelector(".ftba-action-count");
  check("selection count reflects 3 selected", countEl.textContent === "3 selected");
  check("selected rows get the ftba-selected class", rowNoteB.classList.contains("ftba-selected"));

  // .obsidian paths must never be selectable.
  check("isAllowedPath rejects .obsidian config", ftba.isAllowedPath(".obsidian/app.json", {}) === false);

  // Nested selection is de-duplicated to its shallowest ancestor.
  ftba.selectedPaths = new Set(["00_Inbox", "00_Inbox/Note A.md", "00_Inbox/Sub/Note B.md"]);
  const deduped = ftba.getDedupedDeletePaths();
  check("delete de-dupe collapses nested paths under 00_Inbox", deduped.length === 1 && deduped[0] === "00_Inbox");

  // Full delete flow: auto-confirm the modal and verify files are trashed.
  ftba.selectedPaths = new Set(["01_Daily/2026-07-12.md"]);
  ftba.selectionMode = true;
  modalHooks.onOpen = (modal) => {
    const confirmBtn = modal.contentEl.querySelector("button.mod-warning");
    confirmBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  };
  await ftba.deleteSelection();
  await delay(0);
  check("confirmed delete moves the file to trash", vault.trashed.includes("01_Daily/2026-07-12.md"));
  check("a Notice is shown after deletion", Notice._log.some((m) => /Deleted/.test(m)));
  check("selection is cleared after deletion", ftba.selectionMode === false && ftba.selectedPaths.size === 0);
  modalHooks.onOpen = null;

  // ------------------------------------------------------------------
  section("vault-mobile-signals");
  const VaultMobileSignals = loadPlugin("vault-mobile-signals", obsidian);
  const vms = new VaultMobileSignals(app, { id: "vault-mobile-signals" });
  await vms.onload();
  vms.bindExplorers();
  vms.refreshExplorers();

  check("body gets the vms-enabled class on load", document.body.classList.contains("vms-enabled"));
  check("explorer rows are decorated with vms-row", rowInboxFolder.classList.contains("vms-row"));

  const inboxAccent = rowInboxFolder.style.getPropertyValue("--vms-accent");
  check("00_Inbox folder is tinted with its configured accent (#ff9b42)", inboxAccent === "#ff9b42");

  const inboxIcon = rowInboxFolder.querySelector(".vms-row-icon-wrap");
  check("00_Inbox folder gets its emoji icon", !!inboxIcon && inboxIcon.textContent === "\uD83D\uDCE5");

  const toggle = rowInboxFolder.querySelector(".vms-graph-toggle");
  check("top-level folder gets a graph visibility toggle button", !!toggle);
  check("graph toggle starts in the visible state", toggle.textContent === "\uD83D\uDC41");

  // Toggle the graph group off and confirm it persists + updates the button.
  vms.toggleGraphGroup("00_Inbox");
  vms.refreshExplorers();
  const stored = JSON.parse(window.localStorage.getItem("thomas-vault-hidden-top-level-folders"));
  check("hiding a group persists it to localStorage", Array.isArray(stored) && stored.includes("00_inbox"));
  check("graph toggle flips to the hidden state", toggle.textContent === "\uD83D\uDEAB");

  vms.clearHiddenGroups();
  const clearedRaw = window.localStorage.getItem("thomas-vault-hidden-top-level-folders");
  const cleared = clearedRaw ? JSON.parse(clearedRaw) : [];
  check("show-all clears the hidden groups", Array.isArray(cleared) && cleared.length === 0);

  // ------------------------------------------------------------------
  section("advanced-graph-view (config + renderer)");
  const rendererPath = path.join(PLUGINS_DIR, "advanced-graph-view", "dynamic-renderer.js");
  const dataPath = path.join(PLUGINS_DIR, "advanced-graph-view", "data.json");
  check("dynamic-renderer.js is present", fs.existsSync(rendererPath));
  const graphData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  check("graph config parses and defines node style rules", Array.isArray(graphData.nodeStyleRules) && graphData.nodeStyleRules.length > 0);

  // ------------------------------------------------------------------
  console.log(`\n[harness] ${passed} passed, ${failed} failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
