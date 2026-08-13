import { el } from "./util.js";

const FIELD_TYPES = {
  int: {
    render(value, onChange, fieldDef) {
      const input = el("input", {
        type: "number",
        step: "1",
        value: value ?? 0,
      });
      if (fieldDef.min !== undefined) input.min = fieldDef.min;
      input.addEventListener("input", onChange);
      return input;
    },
    read(fieldEl) {
      return parseInt(fieldEl.querySelector("input").value, 10) || 0;
    },
  },

  float: {
    render(value, onChange) {
      const input = el("input", {
        type: "number",
        step: "0.01",
        value: value ?? 0,
      });
      input.addEventListener("input", onChange);
      return input;
    },
    read(fieldEl) {
      return parseFloat(fieldEl.querySelector("input").value) || 0;
    },
  },

  string: {
    render(value, onChange) {
      const input = el("input", { type: "text", value: value ?? "" });
      input.addEventListener("input", onChange);
      return input;
    },
    read(fieldEl) {
      return fieldEl.querySelector("input").value;
    },
  },

  bool: {
    render(value, onChange) {
      const input = el("input", { type: "checkbox", checked: !!value });
      input.addEventListener("change", onChange);
      return input;
    },
    read(fieldEl) {
      return fieldEl.querySelector("input").checked;
    },
  },

  rect: {
    render(value, onChange) {
      const rect = value || { x: 0, y: 0, w: 0, h: 0 };
      const container = el("div", { className: "rect-fields" });
      for (const k of ["x", "y", "w", "h"]) {
        const inp = el("input", { type: "number", step: "1", value: rect[k] ?? 0 });
        inp.dataset.rectKey = k;
        inp.addEventListener("input", onChange);
        container.append(el("span", null, k + ":"), inp);
      }
      return container;
    },
    read(fieldEl) {
      const rect = {};
      fieldEl.querySelectorAll("[data-rect-key]").forEach((inp) => {
        rect[inp.dataset.rectKey] = parseInt(inp.value, 10) || 0;
      });
      return rect;
    },
  },

  intlist: {
    render(value, onChange) {
      const input = el("input", {
        type: "text",
        value: (value || []).join(", "),
        placeholder: "comma-separated integers",
      });
      input.addEventListener("input", onChange);
      return input;
    },
    read(fieldEl) {
      return fieldEl.querySelector("input").value
        .split(",").map((s) => s.trim()).filter((s) => s !== "").map((s) => parseInt(s, 10) || 0);
    },
  },

  strlist: {
    render(value, onChange) {
      const input = el("input", {
        type: "text",
        value: (value || []).join(", "),
        placeholder: "comma-separated strings",
      });
      input.addEventListener("input", onChange);
      return input;
    },
    read(fieldEl) {
      return fieldEl.querySelector("input").value
        .split(",").map((s) => s.trim()).filter((s) => s !== "");
    },
  },

  sublist: {
    render(value, onChange, fieldDef) {
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

      return container;
    },
    read(fieldEl) {
      const tbody = fieldEl.querySelector("tbody");
      const subfields = [];
      fieldEl.querySelectorAll("thead th").forEach((th) => {
        if (th.textContent) subfields.push(th.textContent);
      });
      // We need the fieldDef for subfields, use data attribute
      return null; // handled by readFieldValue
    },
  },
};

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

export function createField(fieldDef, value, onChange) {
  const row = el("div", { className: "field-row" });
  if (fieldDef.key) row.dataset.fieldKey = fieldDef.key;
  row.appendChild(el("label", null, fieldDef.label));

  const handler = FIELD_TYPES[fieldDef.type];
  if (handler) {
    row.appendChild(handler.render(value, onChange, fieldDef));
  }
  return row;
}

export function readFieldValue(fieldEl, fieldDef) {
  if (fieldDef.type === "sublist") {
    const tbody = fieldEl.querySelector("tbody");
    return tbody ? readSublistValue(tbody, fieldDef.subfields) : [];
  }
  const handler = FIELD_TYPES[fieldDef.type];
  if (handler) return handler.read(fieldEl);
  return null;
}
