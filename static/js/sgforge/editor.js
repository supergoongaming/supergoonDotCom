import { el } from "./util.js";
import { parseArchive, buildArchive, entriesToFiles, filesToEntries } from "./archive.js";
import { FORM_DEFS, isDialogFile } from "./defs/index.js";
import { renderArrayForm, saveArrayForm } from "./forms/array.js";
import { renderListForm, saveListForm } from "./forms/list.js";
import { renderConfigForm, saveConfigForm } from "./forms/config.js";

let archiveFiles = {};
let archiveFlags = 0;
let modified = new Set();
let currentTab = null;
let loadedFileName = "";

function setStatus(text) {
  document.getElementById("status-bar").textContent = text;
}

function markModified(filename) {
  modified.add(filename);
  setStatus("Modified: " + [...modified].sort().join(", "));
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("open-btn").addEventListener("click", () => {
    document.getElementById("file-input").click();
  });
  document.getElementById("save-btn").addEventListener("click", saveArchive);
  document.getElementById("file-input").addEventListener("change", handleFileSelect);
});

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  loadedFileName = file.name;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const { flags, entries } = parseArchive(ev.target.result);
      archiveFlags = flags;
      archiveFiles = entriesToFiles(entries);
      modified.clear();
      buildTabs();
      setStatus("Loaded: " + file.name);
      document.getElementById("save-btn").disabled = false;
      document.getElementById("file-label").textContent = file.name;
    } catch (err) {
      alert("Failed to open archive: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function buildTabs() {
  const tabBar = document.getElementById("tab-bar");
  const content = document.getElementById("tab-content");
  tabBar.innerHTML = "";
  content.innerHTML = "";
  currentTab = null;

  const tabs = [];
  for (const [filename, def] of Object.entries(FORM_DEFS)) {
    if (archiveFiles[filename] !== undefined) {
      tabs.push({ filename, label: def.label });
    }
  }
  for (const filename of Object.keys(archiveFiles)) {
    if (isDialogFile(filename)) {
      tabs.push({ filename, label: "Dialog: " + filename.replace(".json", "") });
    }
  }

  for (const tab of tabs) {
    const btn = el("button", { className: "tab-btn" }, tab.label);
    btn.dataset.filename = tab.filename;
    btn.addEventListener("click", () => switchTab(tab.filename));
    tabBar.appendChild(btn);
  }

  if (tabs.length > 0) switchTab(tabs[0].filename);
}

function switchTab(filename) {
  if (currentTab === filename) return;
  saveCurrentForm();
  currentTab = filename;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filename === filename);
  });

  const content = document.getElementById("tab-content");
  content.innerHTML = "";
  const data = archiveFiles[filename];
  const def = FORM_DEFS[filename];

  if (def && def.type === "array") renderArrayForm(content, filename, def, data, markModified);
  else if (def && def.type === "groups") renderListForm(content, filename, data, "group", markModified);
  else if (def && def.type === "config") renderConfigForm(content, filename, def, data, markModified);
  else if (isDialogFile(filename)) renderListForm(content, filename, data, "dialog", markModified);
}

function saveCurrentForm() {
  if (!currentTab) return;
  const form = document.querySelector("[data-form-filename]");
  if (!form) return;
  const filename = form.dataset.formFilename;
  const def = FORM_DEFS[filename];

  if (def && def.type === "array") archiveFiles[filename] = saveArrayForm(form, def);
  else if (def && def.type === "groups") archiveFiles[filename] = saveListForm(form, "group");
  else if (def && def.type === "config") archiveFiles[filename] = saveConfigForm(form, def);
  else if (isDialogFile(filename)) archiveFiles[filename] = saveListForm(form, "dialog");
}

function saveArchive() {
  saveCurrentForm();
  const entries = filesToEntries(archiveFiles);
  const buf = buildArchive(entries, archiveFlags);
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: loadedFileName || "game.sg" });
  a.click();
  URL.revokeObjectURL(url);
  modified.clear();
  setStatus("Saved: " + (loadedFileName || "game.sg"));
}
