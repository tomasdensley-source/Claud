"use strict";

const { Modal, Notice, Plugin, TFile } = require("obsidian");

const PLUGIN_ID = "file-tree-bulk-actions";
const HOME_NOTE_PATH = "HOME-000 \u2013 Start here.md";
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 14;
const EXPLORER_SELECTOR = '.workspace-leaf-content[data-type="file-explorer"]';
const ROW_SELECTOR = ".nav-file-title, .nav-folder-title";
const IGNORE_TARGET_SELECTOR = ".ftba-action-bar, .vms-graph-toggle, .vms-row-icon, .vms-row-icon-wrap, .vms-row-toggle-wrap";

class FileTreeBulkActionsPlugin extends Plugin {
  async onload() {
    this.boundExplorers = new WeakMap();
    this.selectedPaths = new Set();
    this.selectionMode = false;
    this.isDeleting = false;
    this.lastToggleAt = 0;
    this.bindQueued = false;
    this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleBindExplorers()));
    this.onGlobalPointerDown = (event) => this.handleGlobalPointerDown(event);
    document.addEventListener("pointerdown", this.onGlobalPointerDown, true);
    this.register(() => document.removeEventListener("pointerdown", this.onGlobalPointerDown, true));
    this.addCommand({
      id: "cancel-bulk-selection",
      name: "Cancel file tree bulk selection",
      callback: () => this.clearSelection()
    });
    this.scheduleBindExplorers();
  }

  onunload() {
    this.clearSelection();
    const explorers = document.querySelectorAll(EXPLORER_SELECTOR);
    explorers.forEach((explorer) => explorer.classList.remove("ftba-selection-active"));
    document.querySelectorAll(`${EXPLORER_SELECTOR} ${ROW_SELECTOR}`).forEach((row) => {
      row.classList.remove("ftba-selected");
      row.removeAttribute("aria-selected");
    });
    document.querySelectorAll(".ftba-action-bar").forEach((bar) => bar.remove());
  }

  bindExplorers() {
    const explorers = document.querySelectorAll(EXPLORER_SELECTOR);
    explorers.forEach((explorer) => {
      if (this.boundExplorers.has(explorer)) {
        this.syncExplorerUi(explorer);
        return;
      }
      const state = this.createExplorerState(explorer);
      this.boundExplorers.set(explorer, state);
      this.attachExplorerEvents(state);
      this.syncExplorerUi(explorer);
    });
  }

  scheduleBindExplorers() {
    if (this.bindQueued) {
      return;
    }
    this.bindQueued = true;
    window.requestAnimationFrame(() => {
      this.bindQueued = false;
      this.bindExplorers();
    });
  }

  createExplorerState(explorer) {
    const actionHost = explorer.querySelector(".view-content") ?? explorer;
    const scrollHost = explorer.querySelector(".nav-files-container") ?? explorer;
    const actionBar = document.createElement("div");
    actionBar.className = "ftba-action-bar is-hidden";
    const meta = document.createElement("div");
    meta.className = "ftba-action-meta";
    const label = document.createElement("span");
    label.className = "ftba-action-label";
    label.textContent = "Bulk selection";
    const count = document.createElement("span");
    count.className = "ftba-action-count";
    count.textContent = "0 selected";
    const buttons = document.createElement("div");
    buttons.className = "ftba-action-buttons";
    const cancelButton = document.createElement("button");
    cancelButton.className = "ftba-cancel-button";
    cancelButton.textContent = "Cancel";
    const deleteButton = document.createElement("button");
    deleteButton.className = "ftba-delete-button mod-warning";
    deleteButton.textContent = "Delete All";
    meta.appendChild(label);
    meta.appendChild(count);
    buttons.appendChild(cancelButton);
    buttons.appendChild(deleteButton);
    actionBar.appendChild(meta);
    actionBar.appendChild(buttons);
    actionHost.appendChild(actionBar);
    return {
      explorer,
      actionHost,
      scrollHost,
      actionBar,
      count,
      cancelButton,
      deleteButton,
      pressTimer: 0,
      pressPath: "",
      pressMoved: false,
      pressPoint: null,
      tapRow: null,
      longPressTriggered: false,
      lastEndAt: 0
    };
  }

  attachExplorerEvents(state) {
    const { explorer, scrollHost, actionBar, cancelButton, deleteButton } = state;
    const onStart = (event) => this.handlePressStart(state, event);
    const onMove = (event) => this.handlePressMove(state, event);
    const onEnd = (event) => this.handlePressEnd(state, event);
    const onTouchEnd = (event) => this.handlePressEnd(state, event);
    const onScroll = () => this.cancelPendingPress(state);
    const onContextMenu = (event) => {
      if (!this.selectionMode) {
        return;
      }
      const row = this.findSelectableRow(event.target);
      if (!row) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.toggleRowSelection(row);
    };
    scrollHost.addEventListener("pointerdown", onStart, true);
    scrollHost.addEventListener("pointermove", onMove, true);
    scrollHost.addEventListener("pointerup", onEnd, true);
    scrollHost.addEventListener("pointercancel", onEnd, true);
    scrollHost.addEventListener("touchend", onTouchEnd, true);
    scrollHost.addEventListener("touchcancel", onEnd, true);
    scrollHost.addEventListener("scroll", onScroll, true);
    explorer.addEventListener("contextmenu", onContextMenu, true);
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.clearSelection();
    });
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.deleteSelection();
    });
    this.register(() => {
      scrollHost.removeEventListener("pointerdown", onStart, true);
      scrollHost.removeEventListener("pointermove", onMove, true);
      scrollHost.removeEventListener("pointerup", onEnd, true);
      scrollHost.removeEventListener("pointercancel", onEnd, true);
      scrollHost.removeEventListener("touchend", onTouchEnd, true);
      scrollHost.removeEventListener("touchcancel", onEnd, true);
      scrollHost.removeEventListener("scroll", onScroll, true);
      explorer.removeEventListener("contextmenu", onContextMenu, true);
      actionBar.remove();
    });
  }

  handlePressStart(state, event) {
    if (!(event.target instanceof Element) || event.button > 0) {
      return;
    }
    if (this.isIgnoredTarget(event.target)) {
      return;
    }
    const row = this.findSelectableRow(event.target);
    if (!row || !this.isSelectableRow(row)) {
      return;
    }
    this.cancelPendingPress(state);
    state.longPressTriggered = false;
    state.tapRow = row;
    state.pressMoved = false;
    state.pressPoint = { x: event.clientX, y: event.clientY };
    state.pressPath = this.getRowPath(row);

    // ── Selection zone: right 44px of each row ──────────────────────────────
    // Touching this strip immediately enters selection mode without waiting
    // for the 450ms timer, and calls preventDefault() before Android can fire
    // its system context menu (~500ms). The zone is shown as a colored
    // ::after strip in the CSS — see ftba styles "selection zone" block.
    const rowRect = row.getBoundingClientRect();
    if (event.clientX >= rowRect.right - 44) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.selectionMode) {
        this.selectionMode = true;
      }
      state.longPressTriggered = true;
      this.lastToggleAt = Date.now();
      this.toggleRowSelection(row);
      this.cancelPendingPress(state);
      return;
    }

    if (this.selectionMode) {
      return;
    }
    state.pressTimer = window.setTimeout(() => {
      state.pressTimer = 0;
      if (state.pressMoved || !state.pressPath) {
        return;
      }
      if (!this.selectionMode) {
        this.selectionMode = true;
      }
      state.longPressTriggered = true;
      this.lastToggleAt = Date.now();
      this.toggleRowSelection(row);
    }, LONG_PRESS_MS);
  }

  handlePressMove(state, event) {
    if (!state.pressPoint) {
      return;
    }
    const deltaX = Math.abs(event.clientX - state.pressPoint.x);
    const deltaY = Math.abs(event.clientY - state.pressPoint.y);
    if (deltaX > MOVE_CANCEL_PX || deltaY > MOVE_CANCEL_PX) {
      state.pressMoved = true;
      this.cancelPendingPress(state);
    }
  }

  handlePressEnd(state, event) {
    const now = Date.now();
    if (now - state.lastEndAt < 90) {
      return;
    }
    state.lastEndAt = now;
    if (state.longPressTriggered) {
      state.longPressTriggered = false;
      state.tapRow = null;
      this.cancelPendingPress(state);
      if (event?.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    const row = state.tapRow;
    const moved = Boolean(state.pressMoved);
    this.cancelPendingPress(state);
    if (!(event?.target instanceof Element) || moved || !this.selectionMode || !(row instanceof Element)) {
      return;
    }
    if (!row.contains(event.target) && !event.target.closest(ROW_SELECTOR)) {
      return;
    }
    if (!this.isSelectableRow(row)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.toggleRowSelection(row);
  }

  cancelPendingPress(state) {
    if (state.pressTimer) {
      window.clearTimeout(state.pressTimer);
      state.pressTimer = 0;
    }
    state.pressPoint = null;
    state.pressPath = "";
    state.tapRow = null;
    state.pressMoved = false;
    state.longPressTriggered = false;
  }

  handleGlobalPointerDown(event) {
    if (!this.selectionMode || !(event.target instanceof Element)) {
      return;
    }
    if (this.isIgnoredTarget(event.target)) {
      return;
    }
    if (event.target.closest(EXPLORER_SELECTOR) || event.target.closest(".ftba-action-bar")) {
      return;
    }
    this.clearSelection();
  }

  isIgnoredTarget(target) {
    return Boolean(target.closest(IGNORE_TARGET_SELECTOR));
  }

  findSelectableRow(target) {
    return target.closest(ROW_SELECTOR);
  }

  getRowPath(row) {
    return row.getAttribute("data-path") || row.closest("[data-path]")?.getAttribute("data-path") || "";
  }

  isSelectableRow(row) {
    const path = this.getRowPath(row);
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    return this.isAllowedPath(path, file);
  }

  isAllowedPath(path, file) {
    if (!path || !file) {
      return false;
    }
    if (path === ".obsidian" || path.startsWith(".obsidian/")) {
      return false;
    }
    return true;
  }

  toggleRowSelection(row) {
    const path = this.getRowPath(row);
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    if (!this.isAllowedPath(path, file)) {
      return;
    }
    if (this.selectedPaths.has(path)) {
      this.selectedPaths.delete(path);
    } else {
      this.selectedPaths.add(path);
    }
    this.lastToggleAt = Date.now();
    if (this.selectedPaths.size === 0) {
      this.selectionMode = false;
    }
    this.syncUi();
  }

  clearSelection() {
    this.selectedPaths.clear();
    this.selectionMode = false;
    this.syncUi();
  }

  syncUi() {
    const explorers = document.querySelectorAll(EXPLORER_SELECTOR);
    explorers.forEach((explorer) => this.syncExplorerUi(explorer));
  }

  syncExplorerUi(explorer) {
    const state = this.boundExplorers.get(explorer);
    if (!state) {
      return;
    }
    explorer.classList.toggle("ftba-selection-active", this.selectionMode);
    state.actionBar.classList.toggle("is-hidden", !this.selectionMode);
    state.count.textContent = `${this.selectedPaths.size} selected`;
    state.deleteButton.disabled = this.selectedPaths.size === 0;
    const rows = explorer.querySelectorAll(ROW_SELECTOR);
    rows.forEach((row) => {
      const path = this.getRowPath(row);
      const selected = this.selectedPaths.has(path);
      row.classList.toggle("ftba-selected", selected);
      row.setAttribute("aria-selected", String(selected));
    });
  }

  getDedupedDeletePaths() {
    const sorted = [...this.selectedPaths].sort((left, right) => left.length - right.length || left.localeCompare(right));
    const deduped = [];
    for (const path of sorted) {
      if (deduped.some((parent) => path === parent || path.startsWith(`${parent}/`))) {
        continue;
      }
      deduped.push(path);
    }
    return deduped;
  }

  pathWillBeDeleted(path, deletePaths) {
    return deletePaths.some((candidate) => path === candidate || path.startsWith(`${candidate}/`));
  }

  async redirectDeletedLeaves(deletePaths) {
    const home = this.app.vault.getAbstractFileByPath(HOME_NOTE_PATH);
    if (!(home instanceof TFile)) {
      return;
    }
    const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of markdownLeaves) {
      const openFile = leaf.view?.file;
      if (openFile && this.pathWillBeDeleted(openFile.path, deletePaths)) {
        await leaf.openFile(home, { active: false });
      }
    }
  }

  async deleteSelection() {
    if (this.isDeleting) {
      return;
    }
    const deletePaths = this.getDedupedDeletePaths();
    if (deletePaths.length === 0) {
      return;
    }
    const confirmed = await new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText("Confirm bulk delete");
      modal.contentEl.createEl("p", {
        text: `Delete ${deletePaths.length} item${deletePaths.length === 1 ? "" : "s"}? This moves them to the system trash.`
      });
      const buttonRow = modal.contentEl.createDiv({ cls: "modal-button-container" });
      buttonRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => { modal.close(); resolve(false); });
      const confirmBtn = buttonRow.createEl("button", { text: "Delete", cls: "mod-warning" });
      confirmBtn.addEventListener("click", () => { modal.close(); resolve(true); });
      modal.onClose = () => resolve(false);
      modal.open();
    });
    if (!confirmed) {
      return;
    }
    this.isDeleting = true;
    const deleteButtons = document.querySelectorAll(".ftba-delete-button");
    deleteButtons.forEach((button) => {
      button.disabled = true;
      button.textContent = "Deleting...";
    });
    try {
      await this.redirectDeletedLeaves(deletePaths);
      for (const path of deletePaths) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file || !this.isAllowedPath(path, file)) {
          continue;
        }
        await file.vault.trash(file, false);
      }
      new Notice(`Deleted ${deletePaths.length} item${deletePaths.length === 1 ? "" : "s"} from the file tree.`);
    } catch (error) {
      console.error(`[${PLUGIN_ID}] Failed to delete selected paths`, error);
      new Notice("Bulk delete failed. Check the console for details.");
    } finally {
      this.isDeleting = false;
      this.clearSelection();
      document.querySelectorAll(".ftba-delete-button").forEach((button) => {
        button.disabled = false;
        button.textContent = "Delete All";
      });
    }
  }
}

module.exports = FileTreeBulkActionsPlugin;
