import { el } from "../util.js";

export function renderListForm(container, filename, data, mode, markModified) {
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

export function saveListForm(formEl, mode) {
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
