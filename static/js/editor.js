"use strict";

let archiveFiles = {};
let archiveFlags = 0;
let modified = new Set();
let currentTab = null;
let loadedFileName = "";

function el(tag, props, ...children) {
  const e = document.createElement(tag);
  if (props) Object.assign(e, props);
  for (const c of children) {
    if (typeof c === "string") e.textContent = c;
    else if (c) e.appendChild(c);
  }
  return e;
}

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

  if (def && def.type === "array") renderArrayForm(content, filename, def, data);
  else if (def && def.type === "groups") renderListForm(content, filename, data, "group");
  else if (def && def.type === "config") renderConfigForm(content, filename, def, data);
  else if (isDialogFile(filename)) renderListForm(content, filename, data, "dialog");
}

function saveCurrentForm() {
  if (!currentTab) return;
  const form = document.querySelector("[data-form-filename]");
  if (!form) return;
  const filename = form.dataset.formFilename;
  const def = FORM_DEFS[filename];

  if (def && def.type === "array") archiveFiles[filename] = saveArrayForm(form);
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

// --- Array Form ---

function renderArrayForm(container, filename, def, data) {
  const wrap = el("div", { className: "array-form" });
  wrap.dataset.formFilename = filename;

  const left = el("div", { className: "array-list-panel" });
  const listEl = el("div", { className: "entry-list" });
  left.appendChild(listEl);

  const btnRow = el("div", { className: "list-buttons" });
  const addBtn = el("button", null, "Add");
  const removeBtn = el("button", null, "Remove");
  const dupBtn = el("button", null, "Duplicate");
  btnRow.append(addBtn, removeBtn, dupBtn);
  left.appendChild(btnRow);

  const right = el("div", { className: "array-detail-panel" });
  wrap.append(left, right);
  container.appendChild(wrap);

  let entries = JSON.parse(JSON.stringify(data || []));
  let selectedIdx = -1;
  wrap._entries = entries;

  function refreshList() {
    listEl.innerHTML = "";
    entries.forEach((entry, i) => {
      const item = el("div", { className: "list-item" + (i === selectedIdx ? " selected" : "") }, def.displayName(entry));
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
    right.querySelectorAll("[data-field-key]").forEach((fieldEl) => {
      const fieldDef = def.fields.find((f) => f.key === fieldEl.dataset.fieldKey);
      if (fieldDef) entries[selectedIdx][fieldDef.key] = readFieldValue(fieldEl, fieldDef);
    });
  }

  function renderFields() {
    right.innerHTML = "";
    if (selectedIdx < 0 || selectedIdx >= entries.length) return;
    const entry = entries[selectedIdx];
    for (const fieldDef of def.fields) {
      if (fieldDef.section) {
        right.appendChild(el("h4", { className: "section-header" }, fieldDef.section));
        continue;
      }
      right.appendChild(createField(fieldDef, entry[fieldDef.key], () => markModified(filename)));
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
    if (selectedIdx < 0 || !confirm("Remove this entry?")) return;
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
  const def = FORM_DEFS[formEl.dataset.formFilename];
  const selectedItem = formEl.querySelector(".list-item.selected");
  if (selectedItem) {
    const idx = [...formEl.querySelectorAll(".list-item")].indexOf(selectedItem);
    if (idx >= 0 && idx < entries.length) {
      right.querySelectorAll("[data-field-key]").forEach((fieldEl) => {
        const fieldDef = def.fields.find((f) => f.key === fieldEl.dataset.fieldKey);
        if (fieldDef) entries[idx][fieldDef.key] = readFieldValue(fieldEl, fieldDef);
      });
    }
  }
  return entries;
}

// --- List Form (Groups + Dialog, unified) ---

function renderListForm(container, filename, data, mode) {
  const wrap = el("div", { className: "array-form" });
  wrap.dataset.formFilename = filename;
  wrap.dataset.formMode = mode;

  const left = el("div", { className: "array-list-panel" });
  const listEl = el("div", { className: "entry-list" });
  left.appendChild(listEl);

  const btnRow = el("div", { className: "list-buttons" });
  const addBtn = el("button", null, mode === "dialog" ? "Add Key" : "Add Group");
  const removeBtn = el("button", null, "Remove");
  const extraBtn = el("button", null, mode === "dialog" ? "Rename" : "Duplicate");
  btnRow.append(addBtn, removeBtn, extraBtn);
  left.appendChild(btnRow);

  const right = el("div", { className: "array-detail-panel" });
  wrap.append(left, right);
  container.appendChild(wrap);

  let store = JSON.parse(JSON.stringify(data || (mode === "dialog" ? {} : [])));
  let selected = null;
  wrap._store = store;

  function keys() {
    return mode === "dialog" ? Object.keys(store).sort() : store.map((_, i) => i);
  }

  function label(k) {
    if (mode === "dialog") return `${k} (${store[k].length})`;
    return `Group ${k}: [${store[k].join(", ")}]`;
  }

  function refreshList() {
    listEl.innerHTML = "";
    for (const k of keys()) {
      const item = el("div", { className: "list-item" + (k === selected || k === Number(selected) ? " selected" : "") }, label(k));
      item.addEventListener("click", () => select(k));
      listEl.appendChild(item);
    }
  }

  function select(k) {
    saveCurrent();
    selected = k;
    refreshList();
    renderDetail();
  }

  function saveCurrent() {
    if (selected === null) return;
    const textarea = right.querySelector("textarea");
    if (!textarea) return;
    if (mode === "dialog") {
      store[selected] = textarea.value ? textarea.value.split("\n") : [];
    } else {
      store[selected] = textarea.value.split("\n").map((s) => s.trim()).filter((s) => s !== "").map((s) => parseInt(s, 10) || 0);
    }
  }

  function renderDetail() {
    right.innerHTML = "";
    if (selected === null) return;
    const lbl = mode === "dialog" ? "Dialog pages (one line = one text box advance):" : "Enemy IDs (one per line, 0 = empty slot):";
    right.appendChild(el("label", null, lbl));
    const textarea = el("textarea", { className: mode === "dialog" ? "dialog-textarea" : "group-ids-textarea" });
    const val = mode === "dialog" ? (store[selected] || []).join("\n") : store[selected].join("\n");
    textarea.value = val;
    textarea.addEventListener("input", () => markModified(filename));
    right.appendChild(textarea);
  }

  addBtn.addEventListener("click", () => {
    saveCurrent();
    if (mode === "dialog") {
      const name = prompt("Interaction key:");
      if (!name || store[name]) return;
      store[name] = ["New dialog text."];
      selected = name;
    } else {
      store.push([0]);
      selected = store.length - 1;
    }
    refreshList();
    renderDetail();
    markModified(filename);
  });

  removeBtn.addEventListener("click", () => {
    if (selected === null) return;
    const confirmMsg = mode === "dialog" ? `Remove '${selected}'?` : "Remove this group?";
    if (!confirm(confirmMsg)) return;
    if (mode === "dialog") {
      delete store[selected];
      selected = null;
    } else {
      store.splice(selected, 1);
      selected = store.length > 0 ? Math.min(selected, store.length - 1) : null;
    }
    refreshList();
    renderDetail();
    markModified(filename);
  });

  extraBtn.addEventListener("click", () => {
    if (selected === null) return;
    saveCurrent();
    if (mode === "dialog") {
      const newName = prompt("New key name:", selected);
      if (!newName || newName === selected || store[newName]) return;
      store[newName] = store[selected];
      delete store[selected];
      selected = newName;
    } else {
      store.push([...store[selected]]);
      selected = store.length - 1;
    }
    refreshList();
    renderDetail();
    markModified(filename);
  });

  refreshList();
  const k = keys();
  if (k.length > 0) select(k[0]);
}

function saveListForm(formEl, mode) {
  const store = formEl._store;
  const right = formEl.querySelector(".array-detail-panel");
  const textarea = right?.querySelector("textarea");
  if (!textarea) return store;
  const selectedItem = formEl.querySelector(".list-item.selected");
  if (!selectedItem) return store;

  if (mode === "dialog") {
    const key = selectedItem.textContent.replace(/ \(\d+\)$/, "");
    if (store[key] !== undefined) {
      store[key] = textarea.value ? textarea.value.split("\n") : [];
    }
  } else {
    const idx = [...formEl.querySelectorAll(".list-item")].indexOf(selectedItem);
    if (idx >= 0 && idx < store.length) {
      store[idx] = textarea.value.split("\n").map((s) => s.trim()).filter((s) => s !== "").map((s) => parseInt(s, 10) || 0);
    }
  }
  return store;
}

// --- Config Form ---

function renderConfigForm(container, filename, def, data) {
  const wrap = el("div", { className: "config-form" });
  wrap.dataset.formFilename = filename;
  wrap._data = JSON.parse(JSON.stringify(data || {}));

  for (const item of def.layout) {
    if (item.section) {
      wrap.appendChild(el("h4", { className: "section-header" }, item.section));
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
    const row = formEl.querySelector(`[data-config-path='${JSON.stringify(item.path)}']`);
    if (row) setNestedValue(data, item.path, readFieldValue(row, item));
  }
  return data;
}

function getNestedValue(obj, path) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur?.[path[i]];
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

// --- Field Rendering ---

function createField(fieldDef, value, onChange) {
  const row = el("div", { className: "field-row" });
  if (fieldDef.key) row.dataset.fieldKey = fieldDef.key;
  row.appendChild(el("label", null, fieldDef.label));

  switch (fieldDef.type) {
    case "int":
    case "float": {
      const input = el("input", {
        type: "number",
        step: fieldDef.type === "float" ? "0.01" : "1",
        value: value ?? 0,
      });
      if (fieldDef.min !== undefined) input.min = fieldDef.min;
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "string": {
      const input = el("input", { type: "text", value: value ?? "" });
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "bool": {
      const input = el("input", { type: "checkbox", checked: !!value });
      input.addEventListener("change", onChange);
      row.appendChild(input);
      break;
    }
    case "rect": {
      const rect = value || { x: 0, y: 0, w: 0, h: 0 };
      const container = el("div", { className: "rect-fields" });
      for (const k of ["x", "y", "w", "h"]) {
        const inp = el("input", { type: "number", step: "1", value: rect[k] ?? 0 });
        inp.dataset.rectKey = k;
        inp.addEventListener("input", onChange);
        container.append(el("span", null, k + ":"), inp);
      }
      row.appendChild(container);
      break;
    }
    case "intlist":
    case "strlist": {
      const input = el("input", {
        type: "text",
        value: (value || []).join(", "),
        placeholder: fieldDef.type === "intlist" ? "comma-separated integers" : "comma-separated strings",
      });
      input.addEventListener("input", onChange);
      row.appendChild(input);
      break;
    }
    case "sublist": {
      const container = el("div", { className: "sublist-container" });
      const table = el("table", { className: "sublist-table" });
      const thead = el("thead");
      const headerRow = el("tr");
      for (const sf of fieldDef.subfields) headerRow.appendChild(el("th", null, sf.label));
      headerRow.appendChild(el("th"));
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = el("tbody");
      table.appendChild(tbody);
      container.appendChild(table);

      const addRowBtn = el("button", { className: "add-row-btn" }, "+ Add Row");
      container.appendChild(addRowBtn);
      row.appendChild(container);

      function renderRows(items) {
        tbody.innerHTML = "";
        (items || []).forEach((item) => {
          const tr = el("tr");
          for (const sf of fieldDef.subfields) {
            const td = el("td");
            const inp = el("input", {
              type: sf.type === "int" || sf.type === "float" ? "number" : "text",
              value: item[sf.key] ?? (sf.type === "string" ? "" : 0),
            });
            if (sf.type === "float") inp.step = "0.01";
            inp.dataset.subKey = sf.key;
            inp.addEventListener("input", onChange);
            td.appendChild(inp);
            tr.appendChild(td);
          }
          const tdDel = el("td");
          const delBtn = el("button", { className: "del-row-btn" }, "X");
          delBtn.addEventListener("click", () => { tr.remove(); onChange(); });
          tdDel.appendChild(delBtn);
          tr.appendChild(tdDel);
          tbody.appendChild(tr);
        });
      }

      renderRows(value);
      addRowBtn.addEventListener("click", () => {
        const items = readSublistValue(tbody, fieldDef.subfields);
        const newItem = {};
        for (const sf of fieldDef.subfields) newItem[sf.key] = sf.type === "string" ? "" : 0;
        items.push(newItem);
        renderRows(items);
        onChange();
      });
      break;
    }
  }
  return row;
}

function readFieldValue(fieldEl, fieldDef) {
  switch (fieldDef.type) {
    case "int": return parseInt(fieldEl.querySelector("input").value, 10) || 0;
    case "float": return parseFloat(fieldEl.querySelector("input").value) || 0;
    case "string": return fieldEl.querySelector("input").value;
    case "bool": return fieldEl.querySelector("input").checked;
    case "rect": {
      const rect = {};
      fieldEl.querySelectorAll("[data-rect-key]").forEach((inp) => {
        rect[inp.dataset.rectKey] = parseInt(inp.value, 10) || 0;
      });
      return rect;
    }
    case "intlist": return fieldEl.querySelector("input").value.split(",").map((s) => s.trim()).filter((s) => s !== "").map((s) => parseInt(s, 10) || 0);
    case "strlist": return fieldEl.querySelector("input").value.split(",").map((s) => s.trim()).filter((s) => s !== "");
    case "sublist": return readSublistValue(fieldEl.querySelector("tbody"), fieldDef.subfields);
    default: return null;
  }
}

function readSublistValue(tbody, subfields) {
  const items = [];
  tbody.querySelectorAll("tr").forEach((tr) => {
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
