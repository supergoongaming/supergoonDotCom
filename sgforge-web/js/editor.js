"use strict";

let archiveFiles = {};
let archiveFlags = 0;
let modified = new Set();
let currentTab = null;
let loadedFileName = "";

function init() {
  document.getElementById("open-btn").addEventListener("click", openFile);
  document.getElementById("save-btn").addEventListener("click", saveArchive);
  document.getElementById("file-input").addEventListener("change", handleFileSelect);
}

function openFile() {
  document.getElementById("file-input").click();
}

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
      setStatus("Error loading file");
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
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = tab.label;
    btn.dataset.filename = tab.filename;
    btn.addEventListener("click", () => switchTab(tab.filename));
    tabBar.appendChild(btn);
  }

  if (tabs.length > 0) {
    switchTab(tabs[0].filename);
  }
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

  if (def && def.type === "array") {
    renderArrayForm(content, filename, def, data);
  } else if (def && def.type === "groups") {
    renderGroupsForm(content, filename, data);
  } else if (def && def.type === "config") {
    renderConfigForm(content, filename, def, data);
  } else if (isDialogFile(filename)) {
    renderDialogForm(content, filename, data);
  }
}

function markModified(filename) {
  modified.add(filename);
  setStatus("Modified: " + [...modified].sort().join(", "));
}

function setStatus(text) {
  document.getElementById("status-bar").textContent = text;
}

function saveCurrentForm() {
  if (!currentTab) return;
  const content = document.getElementById("tab-content");
  const form = content.querySelector("[data-form-filename]");
  if (!form) return;
  const filename = form.dataset.formFilename;
  const def = FORM_DEFS[filename];

  if (def && def.type === "array") {
    archiveFiles[filename] = saveArrayForm(form);
  } else if (def && def.type === "groups") {
    archiveFiles[filename] = saveGroupsForm(form);
  } else if (def && def.type === "config") {
    archiveFiles[filename] = saveConfigForm(form, def);
  } else if (isDialogFile(filename)) {
    archiveFiles[filename] = saveDialogForm(form);
  }
}

function saveArchive() {
  saveCurrentForm();
  const entries = filesToEntries(archiveFiles);
  const buf = buildArchive(entries, archiveFlags);
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = loadedFileName || "game.sg";
  a.click();
  URL.revokeObjectURL(url);
  modified.clear();
  setStatus("Saved: " + (loadedFileName || "game.sg"));
}

// --- Array Form (abilities, battleDB, battleZones, playerChars) ---

function renderArrayForm(container, filename, def, data) {
  const wrap = document.createElement("div");
  wrap.className = "array-form";
  wrap.dataset.formFilename = filename;

  const left = document.createElement("div");
  left.className = "array-list-panel";
  const listEl = document.createElement("div");
  listEl.className = "entry-list";
  left.appendChild(listEl);

  const btnRow = document.createElement("div");
  btnRow.className = "list-buttons";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  const dupBtn = document.createElement("button");
  dupBtn.textContent = "Duplicate";
  btnRow.append(addBtn, removeBtn, dupBtn);
  left.appendChild(btnRow);

  const right = document.createElement("div");
  right.className = "array-detail-panel";

  wrap.append(left, right);
  container.appendChild(wrap);

  let entries = JSON.parse(JSON.stringify(data || []));
  let selectedIdx = -1;
  wrap._entries = entries;

  function refreshList() {
    listEl.innerHTML = "";
    entries.forEach((entry, i) => {
      const item = document.createElement("div");
      item.className = "list-item" + (i === selectedIdx ? " selected" : "");
      item.textContent = def.displayName(entry);
      item.addEventListener("click", () => selectEntry(i));
      listEl.appendChild(item);
    });
  }

  function selectEntry(i) {
    saveEntryFromFields();
    selectedIdx = i;
    refreshList();
    renderFields();
  }

  function saveEntryFromFields() {
    if (selectedIdx < 0 || selectedIdx >= entries.length) return;
    const fields = right.querySelectorAll("[data-field-key]");
    fields.forEach((el) => {
      const key = el.dataset.fieldKey;
      const fieldDef = def.fields.find((f) => f.key === key);
      if (!fieldDef) return;
      entries[selectedIdx][key] = readFieldValue(el, fieldDef);
    });
  }

  function renderFields() {
    right.innerHTML = "";
    if (selectedIdx < 0 || selectedIdx >= entries.length) return;
    const entry = entries[selectedIdx];
    for (const fieldDef of def.fields) {
      if (fieldDef.section) {
        const h = document.createElement("h4");
        h.className = "section-header";
        h.textContent = fieldDef.section;
        right.appendChild(h);
        continue;
      }
      const row = createField(fieldDef, entry[fieldDef.key], () => markModified(filename));
      right.appendChild(row);
    }
  }

  addBtn.addEventListener("click", () => {
    saveEntryFromFields();
    entries.push(def.defaultEntry(entries));
    selectedIdx = entries.length - 1;
    refreshList();
    renderFields();
    markModified(filename);
  });

  removeBtn.addEventListener("click", () => {
    if (selectedIdx < 0) return;
    if (!confirm("Remove this entry?")) return;
    entries.splice(selectedIdx, 1);
    selectedIdx = Math.min(selectedIdx, entries.length - 1);
    refreshList();
    renderFields();
    markModified(filename);
  });

  dupBtn.addEventListener("click", () => {
    if (selectedIdx < 0) return;
    saveEntryFromFields();
    entries.push(JSON.parse(JSON.stringify(entries[selectedIdx])));
    selectedIdx = entries.length - 1;
    refreshList();
    renderFields();
    markModified(filename);
  });

  refreshList();
  if (entries.length > 0) selectEntry(0);
}

function saveArrayForm(formEl) {
  const right = formEl.querySelector(".array-detail-panel");
  const entries = formEl._entries;
  const filename = formEl.dataset.formFilename;
  const def = FORM_DEFS[filename];
  // Save currently visible entry
  const selectedItem = formEl.querySelector(".list-item.selected");
  if (selectedItem) {
    const idx = [...formEl.querySelectorAll(".list-item")].indexOf(selectedItem);
    if (idx >= 0 && idx < entries.length) {
      const fields = right.querySelectorAll("[data-field-key]");
      fields.forEach((el) => {
        const key = el.dataset.fieldKey;
        const fieldDef = def.fields.find((f) => f.key === key);
        if (!fieldDef) return;
        entries[idx][key] = readFieldValue(el, fieldDef);
      });
    }
  }
  return entries;
}

// --- Battle Groups Form ---

function renderGroupsForm(container, filename, data) {
  const wrap = document.createElement("div");
  wrap.className = "array-form";
  wrap.dataset.formFilename = filename;

  const left = document.createElement("div");
  left.className = "array-list-panel";
  const listEl = document.createElement("div");
  listEl.className = "entry-list";
  left.appendChild(listEl);

  const btnRow = document.createElement("div");
  btnRow.className = "list-buttons";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Group";
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  const dupBtn = document.createElement("button");
  dupBtn.textContent = "Duplicate";
  btnRow.append(addBtn, removeBtn, dupBtn);
  left.appendChild(btnRow);

  const right = document.createElement("div");
  right.className = "array-detail-panel";

  wrap.append(left, right);
  container.appendChild(wrap);

  let groups = JSON.parse(JSON.stringify(data || []));
  let selectedIdx = -1;
  wrap._groups = groups;

  function refreshList() {
    listEl.innerHTML = "";
    groups.forEach((group, i) => {
      const item = document.createElement("div");
      item.className = "list-item" + (i === selectedIdx ? " selected" : "");
      item.textContent = `Group ${i}: [${group.join(", ")}]`;
      item.addEventListener("click", () => selectGroup(i));
      listEl.appendChild(item);
    });
  }

  function selectGroup(i) {
    saveGroupDetail();
    selectedIdx = i;
    refreshList();
    renderGroupDetail();
  }

  function saveGroupDetail() {
    if (selectedIdx < 0 || selectedIdx >= groups.length) return;
    const textarea = right.querySelector("textarea");
    if (textarea) {
      groups[selectedIdx] = textarea.value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => parseInt(s, 10) || 0);
    }
  }

  function renderGroupDetail() {
    right.innerHTML = "";
    if (selectedIdx < 0 || selectedIdx >= groups.length) return;
    const label = document.createElement("label");
    label.textContent = "Enemy IDs (one per line, 0 = empty slot):";
    right.appendChild(label);
    const textarea = document.createElement("textarea");
    textarea.className = "group-ids-textarea";
    textarea.value = groups[selectedIdx].join("\n");
    textarea.addEventListener("input", () => markModified(filename));
    right.appendChild(textarea);
  }

  addBtn.addEventListener("click", () => {
    saveGroupDetail();
    groups.push([0]);
    selectedIdx = groups.length - 1;
    refreshList();
    renderGroupDetail();
    markModified(filename);
  });

  removeBtn.addEventListener("click", () => {
    if (selectedIdx < 0) return;
    if (!confirm("Remove this group?")) return;
    groups.splice(selectedIdx, 1);
    selectedIdx = Math.min(selectedIdx, groups.length - 1);
    refreshList();
    renderGroupDetail();
    markModified(filename);
  });

  dupBtn.addEventListener("click", () => {
    if (selectedIdx < 0) return;
    saveGroupDetail();
    groups.push([...groups[selectedIdx]]);
    selectedIdx = groups.length - 1;
    refreshList();
    renderGroupDetail();
    markModified(filename);
  });

  refreshList();
  if (groups.length > 0) selectGroup(0);
}

function saveGroupsForm(formEl) {
  const right = formEl.querySelector(".array-detail-panel");
  const groups = formEl._groups;
  const textarea = right.querySelector("textarea");
  const selectedItem = formEl.querySelector(".list-item.selected");
  if (textarea && selectedItem) {
    const idx = [...formEl.querySelectorAll(".list-item")].indexOf(selectedItem);
    if (idx >= 0 && idx < groups.length) {
      groups[idx] = textarea.value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => parseInt(s, 10) || 0);
    }
  }
  return groups;
}

// --- Config Form (gameConfig) ---

function renderConfigForm(container, filename, def, data) {
  const wrap = document.createElement("div");
  wrap.className = "config-form";
  wrap.dataset.formFilename = filename;
  wrap._data = JSON.parse(JSON.stringify(data || {}));

  for (const item of def.layout) {
    if (item.section) {
      const h = document.createElement("h4");
      h.className = "section-header";
      h.textContent = item.section;
      wrap.appendChild(h);
      continue;
    }
    const val = getNestedValue(wrap._data, item.path);
    const row = createField(item, val, () => markModified(filename));
    row.dataset.configPath = JSON.stringify(item.path);
    wrap.appendChild(row);
  }
  container.appendChild(wrap);
}

function saveConfigForm(formEl, def) {
  const data = formEl._data;
  for (const item of def.layout) {
    if (item.section) continue;
    const el = formEl.querySelector(`[data-config-path='${JSON.stringify(item.path)}']`);
    if (el) {
      setNestedValue(data, item.path, readFieldValue(el, item));
    }
  }
  return data;
}

function getNestedValue(obj, path) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur?.[path[i]];
  }
  return cur?.[path[path.length - 1]];
}

function setNestedValue(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!cur[path[i]]) cur[path[i]] = {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

// --- Dialog Form ---

function renderDialogForm(container, filename, data) {
  const wrap = document.createElement("div");
  wrap.className = "array-form";
  wrap.dataset.formFilename = filename;

  const left = document.createElement("div");
  left.className = "array-list-panel";
  const listEl = document.createElement("div");
  listEl.className = "entry-list";
  left.appendChild(listEl);

  const btnRow = document.createElement("div");
  btnRow.className = "list-buttons";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Key";
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  const renameBtn = document.createElement("button");
  renameBtn.textContent = "Rename";
  btnRow.append(addBtn, removeBtn, renameBtn);
  left.appendChild(btnRow);

  const right = document.createElement("div");
  right.className = "array-detail-panel dialog-detail";

  wrap.append(left, right);
  container.appendChild(wrap);

  let dialogData = JSON.parse(JSON.stringify(data || {}));
  let keys = Object.keys(dialogData).sort();
  let selectedKey = null;
  wrap._dialogData = dialogData;

  function refreshList() {
    listEl.innerHTML = "";
    keys = Object.keys(dialogData).sort();
    keys.forEach((key) => {
      const item = document.createElement("div");
      item.className = "list-item" + (key === selectedKey ? " selected" : "");
      item.textContent = `${key} (${dialogData[key].length})`;
      item.addEventListener("click", () => selectKey(key));
      listEl.appendChild(item);
    });
  }

  function selectKey(key) {
    saveCurrent();
    selectedKey = key;
    refreshList();
    renderPages();
  }

  function saveCurrent() {
    if (!selectedKey || !dialogData[selectedKey]) return;
    const textarea = right.querySelector("textarea");
    if (textarea) {
      const content = textarea.value;
      dialogData[selectedKey] = content ? content.split("\n") : [];
    }
  }

  function renderPages() {
    right.innerHTML = "";
    if (!selectedKey) return;
    const label = document.createElement("label");
    label.textContent = "Dialog pages (one line = one text box advance):";
    right.appendChild(label);
    const textarea = document.createElement("textarea");
    textarea.className = "dialog-textarea";
    textarea.value = (dialogData[selectedKey] || []).join("\n");
    textarea.addEventListener("input", () => markModified(filename));
    right.appendChild(textarea);
  }

  addBtn.addEventListener("click", () => {
    const name = prompt("Interaction key:");
    if (!name || dialogData[name]) return;
    saveCurrent();
    dialogData[name] = ["New dialog text."];
    selectedKey = name;
    refreshList();
    renderPages();
    markModified(filename);
  });

  removeBtn.addEventListener("click", () => {
    if (!selectedKey) return;
    if (!confirm(`Remove '${selectedKey}'?`)) return;
    delete dialogData[selectedKey];
    selectedKey = null;
    refreshList();
    right.innerHTML = "";
    markModified(filename);
  });

  renameBtn.addEventListener("click", () => {
    if (!selectedKey) return;
    const newName = prompt("New key name:", selectedKey);
    if (!newName || newName === selectedKey || dialogData[newName]) return;
    saveCurrent();
    dialogData[newName] = dialogData[selectedKey];
    delete dialogData[selectedKey];
    selectedKey = newName;
    refreshList();
    renderPages();
    markModified(filename);
  });

  refreshList();
  if (keys.length > 0) selectKey(keys[0]);
}

function saveDialogForm(formEl) {
  const dialogData = formEl._dialogData;
  const right = formEl.querySelector(".dialog-detail");
  const textarea = right?.querySelector("textarea");
  const selectedItem = formEl.querySelector(".list-item.selected");
  if (textarea && selectedItem) {
    const key = selectedItem.textContent.replace(/ \(\d+\)$/, "");
    if (dialogData[key] !== undefined) {
      dialogData[key] = textarea.value ? textarea.value.split("\n") : [];
    }
  }
  return dialogData;
}

// --- Field Rendering ---

function createField(fieldDef, value, onChange) {
  const row = document.createElement("div");
  row.className = "field-row";
  if (fieldDef.key) row.dataset.fieldKey = fieldDef.key;

  const label = document.createElement("label");
  label.textContent = fieldDef.label;
  row.appendChild(label);

  switch (fieldDef.type) {
    case "int": {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      if (fieldDef.min !== undefined) input.min = fieldDef.min;
      input.value = value ?? 0;
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "float": {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.value = value ?? 0;
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "string": {
      const input = document.createElement("input");
      input.type = "text";
      input.value = value ?? "";
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "bool": {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!value;
      input.addEventListener("change", onChange);
      row.appendChild(input);
      break;
    }
    case "rect": {
      const rect = value || { x: 0, y: 0, w: 0, h: 0 };
      const container = document.createElement("div");
      container.className = "rect-fields";
      for (const k of ["x", "y", "w", "h"]) {
        const lbl = document.createElement("span");
        lbl.textContent = k + ":";
        const inp = document.createElement("input");
        inp.type = "number";
        inp.step = "1";
        inp.dataset.rectKey = k;
        inp.value = rect[k] ?? 0;
        inp.addEventListener("input", onChange);
        container.append(lbl, inp);
      }
      row.appendChild(container);
      break;
    }
    case "intlist": {
      const input = document.createElement("input");
      input.type = "text";
      input.value = (value || []).join(", ");
      input.placeholder = "comma-separated integers";
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "strlist": {
      const input = document.createElement("input");
      input.type = "text";
      input.value = (value || []).join(", ");
      input.placeholder = "comma-separated strings";
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "sublist": {
      const container = document.createElement("div");
      container.className = "sublist-container";
      const table = document.createElement("table");
      table.className = "sublist-table";
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      for (const sf of fieldDef.subfields) {
        const th = document.createElement("th");
        th.textContent = sf.label;
        headerRow.appendChild(th);
      }
      const thAction = document.createElement("th");
      thAction.textContent = "";
      headerRow.appendChild(thAction);
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      container.appendChild(table);

      const addRowBtn = document.createElement("button");
      addRowBtn.textContent = "+ Add Row";
      addRowBtn.className = "add-row-btn";
      container.appendChild(addRowBtn);
      row.appendChild(container);

      function renderRows(items) {
        tbody.innerHTML = "";
        (items || []).forEach((item, i) => {
          const tr = document.createElement("tr");
          for (const sf of fieldDef.subfields) {
            const td = document.createElement("td");
            const inp = document.createElement("input");
            inp.type = sf.type === "int" || sf.type === "float" ? "number" : "text";
            if (sf.type === "float") inp.step = "0.01";
            inp.value = item[sf.key] ?? (sf.type === "string" ? "" : 0);
            inp.dataset.subKey = sf.key;
            inp.addEventListener("input", onChange);
            td.appendChild(inp);
            tr.appendChild(td);
          }
          const tdDel = document.createElement("td");
          const delBtn = document.createElement("button");
          delBtn.textContent = "X";
          delBtn.className = "del-row-btn";
          delBtn.addEventListener("click", () => {
            tr.remove();
            onChange();
          });
          tdDel.appendChild(delBtn);
          tr.appendChild(tdDel);
          tbody.appendChild(tr);
        });
      }

      renderRows(value);
      addRowBtn.addEventListener("click", () => {
        const newItem = {};
        for (const sf of fieldDef.subfields) {
          newItem[sf.key] = sf.type === "string" ? "" : 0;
        }
        const items = readSublistValue(tbody, fieldDef.subfields);
        items.push(newItem);
        renderRows(items);
        onChange();
      });
      break;
    }
  }

  return row;
}

function readFieldValue(el, fieldDef) {
  switch (fieldDef.type) {
    case "int": {
      const input = el.querySelector("input");
      return parseInt(input.value, 10) || 0;
    }
    case "float": {
      const input = el.querySelector("input");
      return parseFloat(input.value) || 0;
    }
    case "string": {
      const input = el.querySelector("input");
      return input.value;
    }
    case "bool": {
      const input = el.querySelector("input");
      return input.checked;
    }
    case "rect": {
      const inputs = el.querySelectorAll("[data-rect-key]");
      const rect = {};
      inputs.forEach((inp) => {
        rect[inp.dataset.rectKey] = parseInt(inp.value, 10) || 0;
      });
      return rect;
    }
    case "intlist": {
      const input = el.querySelector("input");
      return input.value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => parseInt(s, 10) || 0);
    }
    case "strlist": {
      const input = el.querySelector("input");
      return input.value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }
    case "sublist": {
      const tbody = el.querySelector("tbody");
      return readSublistValue(tbody, fieldDef.subfields);
    }
    default:
      return null;
  }
}

function readSublistValue(tbody, subfields) {
  const rows = tbody.querySelectorAll("tr");
  const items = [];
  rows.forEach((tr) => {
    const item = {};
    for (const sf of subfields) {
      const inp = tr.querySelector(`[data-sub-key="${sf.key}"]`);
      if (!inp) continue;
      if (sf.type === "int") item[sf.key] = parseInt(inp.value, 10) || 0;
      else if (sf.type === "float") item[sf.key] = parseFloat(inp.value) || 0;
      else item[sf.key] = inp.value;
    }
    items.push(item);
  });
  return items;
}

document.addEventListener("DOMContentLoaded", init);
