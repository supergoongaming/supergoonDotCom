import { el } from "../util.js";
import { createField, readFieldValue } from "../fields.js";

export function renderArrayForm(container, filename, def, data, markModified) {
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

export function saveArrayForm(formEl, def) {
  const right = formEl.querySelector(".array-detail-panel");
  const entries = formEl._entries;
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
