"use strict";

// A lightweight emulation of the parts of the Obsidian runtime that the vault's
// custom plugins depend on. This lets the *real, unmodified* plugin JavaScript
// (shipped inside obsidian-vault-fixed.zip) be loaded and exercised outside of
// the Obsidian desktop app.
//
// It provides:
//   * A mock `obsidian` module (Plugin, Modal, Notice, TFile, TFolder, ...).
//   * A fake `app` (workspace / vault / metadataCache / commands).
//   * The DOM convenience helpers (createEl, createDiv, setText, ...) that
//     Obsidian patches onto HTMLElement.prototype.
//
// The same factory is used by both the Node (jsdom) harness and the browser
// harness so the two demonstrations run identical scaffolding.

function createObsidianEnv(win, doc) {
  // ---- DOM helpers that Obsidian normally adds to HTMLElement.prototype ----
  const proto = win.HTMLElement.prototype;

  function applyOptions(el, options) {
    if (!options) return el;
    if (typeof options === "string") {
      el.className = options;
      return el;
    }
    if (options.cls) {
      el.className = Array.isArray(options.cls) ? options.cls.join(" ") : options.cls;
    }
    if (options.text != null) el.textContent = options.text;
    if (options.type) el.setAttribute("type", options.type);
    if (options.attr) {
      for (const key of Object.keys(options.attr)) {
        el.setAttribute(key, String(options.attr[key]));
      }
    }
    return el;
  }

  if (!proto.createEl) {
    proto.createEl = function createEl(tag, options) {
      const el = this.ownerDocument.createElement(tag);
      applyOptions(el, options);
      this.appendChild(el);
      return el;
    };
  }
  if (!proto.createDiv) {
    proto.createDiv = function createDiv(options) {
      return this.createEl("div", options);
    };
  }
  if (!proto.createSpan) {
    proto.createSpan = function createSpan(options) {
      return this.createEl("span", options);
    };
  }
  if (!proto.setText) {
    proto.setText = function setText(text) {
      this.textContent = text;
      return this;
    };
  }
  if (!proto.empty) {
    proto.empty = function empty() {
      while (this.firstChild) this.removeChild(this.firstChild);
      return this;
    };
  }

  // ---------------------------- Obsidian classes ---------------------------
  class Events {
    constructor() {
      this._handlers = Object.create(null);
    }
    on(name, cb) {
      (this._handlers[name] || (this._handlers[name] = [])).push(cb);
      return { name, cb };
    }
    off() {}
    trigger(name, ...args) {
      (this._handlers[name] || []).forEach((cb) => cb(...args));
    }
  }

  class Notice {
    constructor(message) {
      this.message = message;
      Notice._log.push(message);
    }
  }
  Notice._log = [];

  // Hook the harness can set to auto-respond to a Modal once it opens.
  const modalHooks = { onOpen: null };

  class Modal {
    constructor(app) {
      this.app = app;
      this.containerEl = doc.createElement("div");
      this.titleEl = doc.createElement("div");
      this.contentEl = doc.createElement("div");
      this.containerEl.appendChild(this.titleEl);
      this.containerEl.appendChild(this.contentEl);
      this._closed = false;
      
      // Style the modal to look like an Obsidian modal
      this.containerEl.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e1e1e;color:#dcddde;padding:20px;border-radius:8px;box-shadow:0 0 0 1px rgba(0,0,0,.1),0 8px 16px rgba(0,0,0,.3);z-index:10000;min-width:400px;max-width:600px;";
      this.titleEl.style.cssText = "font-size:16px;font-weight:600;margin-bottom:12px;";
      this.contentEl.style.cssText = "margin-bottom:16px;";
    }
    open() {
      doc.body.appendChild(this.containerEl);
      if (typeof this.onOpen === "function") this.onOpen();
      if (typeof modalHooks.onOpen === "function") modalHooks.onOpen(this);
    }
    close() {
      if (this._closed) return;
      this._closed = true;
      if (this.containerEl.parentNode) {
        this.containerEl.parentNode.removeChild(this.containerEl);
      }
      // Obsidian invokes onClose asynchronously (after the close animation),
      // which is why the confirm-button pattern in the plugin resolves `true`
      // before onClose can resolve `false`.
      Promise.resolve().then(() => {
        if (typeof this.onClose === "function") this.onClose();
      });
    }
  }

  class TAbstractFile {
    constructor(path, vault) {
      this.path = path;
      this.vault = vault;
      const parts = path.split("/");
      this.name = parts[parts.length - 1];
    }
  }
  class TFile extends TAbstractFile {
    constructor(path, vault) {
      super(path, vault);
      const dot = this.name.lastIndexOf(".");
      this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
      this.extension = dot > 0 ? this.name.slice(dot + 1) : "";
    }
  }
  class TFolder extends TAbstractFile {
    constructor(path, vault) {
      super(path, vault);
      this.children = [];
    }
  }

  class Plugin {
    constructor(app, manifest) {
      this.app = app;
      this.manifest = manifest || {};
      this._cleanups = [];
      this.commands = [];
    }
    registerEvent(ref) {
      this._cleanups.push(ref);
      return ref;
    }
    register(cb) {
      this._cleanups.push(cb);
    }
    registerDomEvent(el, type, cb, options) {
      el.addEventListener(type, cb, options);
      this._cleanups.push(() => el.removeEventListener(type, cb, options));
    }
    addCommand(cmd) {
      this.commands.push(cmd);
      return cmd;
    }
    async loadData() {
      return this._data == null ? null : this._data;
    }
    async saveData(data) {
      this._data = data;
    }
    unload() {
      this._cleanups.forEach((c) => typeof c === "function" && c());
      this._cleanups = [];
    }
  }

  // MarkdownView is only referenced via `instanceof` / getActiveViewOfType.
  class MarkdownView {}

  // -------------------------------- Fake app -------------------------------
  const vault = new Events();
  Object.assign(vault, {
    _files: new Map(),
    _root: new TFolder("", null),
    trashed: [],
    getAbstractFileByPath(p) {
      return this._files.get(p) || null;
    },
    getRoot() {
      return this._root;
    },
    async trash(file) {
      this.trashed.push(file.path);
      this._files.delete(file.path);
    },
    async cachedRead() {
      return "";
    },
    addFile(file) {
      file.vault = this;
      this._files.set(file.path, file);
      return file;
    },
  });
  vault._root.vault = vault;

  const workspace = new Events();
  Object.assign(workspace, {
    _activeFile: null,
    getActiveFile() {
      return this._activeFile;
    },
    getLeavesOfType() {
      return [];
    },
    getActiveViewOfType() {
      return null;
    },
    getMostRecentLeaf() {
      return { openFile: async () => {} };
    },
    getLeaf() {
      return { openFile: async () => {} };
    },
  });

  const metadataCache = new Events();

  const app = {
    workspace,
    vault,
    metadataCache,
    commands: { executeCommandById() {} },
  };

  const obsidian = {
    Plugin,
    Modal,
    Notice,
    TFile,
    TFolder,
    TAbstractFile,
    MarkdownView,
    Events,
  };

  return { obsidian, app, vault, workspace, metadataCache, Notice, TFile, TFolder, modalHooks };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createObsidianEnv };
}
if (typeof window !== "undefined") {
  window.createObsidianEnv = createObsidianEnv;
}
