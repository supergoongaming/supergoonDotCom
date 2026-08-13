export function el(tag, props, ...children) {
  const e = document.createElement(tag);
  if (props) Object.assign(e, props);
  for (const c of children) {
    if (typeof c === "string") e.textContent = c;
    else if (c) e.appendChild(c);
  }
  return e;
}
