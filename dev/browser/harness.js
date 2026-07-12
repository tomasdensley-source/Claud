"use strict";

// Browser-side dev harness. Loads the real file-tree-bulk-actions plugin and
// wires it up against an emulated Obsidian explorer so the bulk-select/delete
// UI can be exercised (and recorded) in a normal browser.

const PLUGIN_BASE =
  "/obsidian-vault-extracted/obsidian-vault/.obsidian/plugins/file-tree-bulk-actions";

const FILES = [
  { cls: "nav-folder-title", path: "00_Inbox", label: "\uD83D\uDCE5 00_Inbox", folder: true },
  { cls: "nav-file-title", path: "00_Inbox/Quick capture.md", label: "Quick capture" },
  { cls: "nav-file-title", path: "00_Inbox/Read later.md", label: "Read later" },
  { cls: "nav-folder-title", path: "01_Daily", label: "\uD83D\uDCC5 01_Daily", folder: true },
  { cls: "nav-file-title", path: "01_Daily/2026-07-12.md", label: "2026-07-12" },
  { cls: "nav-file-title", path: "01_Daily/2026-07-11.md", label: "2026-07-11" },
  { cls: "nav-file-title", path: "02_Action/Ship dev harness.md", label: "Ship dev harness" },
];

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function buildRows(container) {
  for (const item of FILES) {
    const row = document.createElement("div");
    row.className = item.cls;
    row.setAttribute("data-path", item.path);
    const content = document.createElement("div");
    content.className = item.folder ? "nav-folder-title-content" : "nav-file-title-content";
    content.textContent = item.label;
    row.appendChild(content);
    container.appendChild(row);
  }
}

function showToast(message) {
  let host = document.querySelector(".demo-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "demo-toast-host";
    host.style.cssText =
      "position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;gap:8px;z-index:9999;";
    document.body.appendChild(host);
  }
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText =
    "background:#2a2f3a;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4);";
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

async function loadPlugin(obsidian) {
  const code = await fetch(`${PLUGIN_BASE}/main.js`).then((r) => r.text());
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name === "obsidian") return obsidian;
    throw new Error(`Unexpected require: ${name}`);
  };
  new Function("module", "exports", "require", code)(module, module.exports, localRequire);
  return module.exports;
}

async function main() {
  const container = document.getElementById("files");
  buildRows(container);

  const env = window.createObsidianEnv(window, document);
  const { app, vault, obsidian, TFile, TFolder } = env;

  // In real Obsidian the core file-explorer view removes a row when its file is
  // trashed. Our emulation has no core explorer, so mirror that behaviour here
  // by dropping the matching row from the DOM after the plugin trashes a file.
  const baseTrash = vault.trash.bind(vault);
  vault.trash = async (file) => {
    await baseTrash(file);
    const row = container.querySelector(`[data-path="${file.path}"]`);
    if (row) row.remove();
  };

  // Seed the vault so the plugin can resolve every visible row.
  const roots = new Map();
  for (const item of FILES) {
    if (item.folder) {
      const folder = new TFolder(item.path);
      vault.addFile(folder);
      roots.set(item.path, folder);
    } else {
      vault.addFile(new TFile(item.path));
    }
  }
  vault._root.children = [...roots.values()];

  // Surface Notices as on-screen toasts for the demo.
  const BaseNotice = obsidian.Notice;
  obsidian.Notice = class extends BaseNotice {
    constructor(message) {
      super(message);
      showToast(message);
    }
  };

  const FileTreeBulkActions = await loadPlugin(obsidian);
  const plugin = new FileTreeBulkActions(app, { id: "file-tree-bulk-actions" });
  await plugin.onload();
  plugin.bindExplorers();

  setStatus("Plugin loaded. Long-press or tap a note's right edge to select.");
  window.__ftba = plugin; // handy for manual inspection
}

window.addEventListener("DOMContentLoaded", () => {
  main().catch((err) => {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  });
});
