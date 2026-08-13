import { el } from "../util.js";
import { createField, readFieldValue } from "../fields.js";

export function renderConfigForm(container, filename, def, data, markModified) {
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

export function saveConfigForm(formEl, def) {
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
