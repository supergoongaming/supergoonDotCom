"use strict";

const MAGIC = "sgWad\0";
const MAGIC_SIZE = 6;
const HEADER_SIZE = MAGIC_SIZE + 2 + 2 + 4;
const ENTRY_SIZE = 64 + 4 + 4;

function parseArchive(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder("utf-8");

  const magic = decoder.decode(new Uint8Array(arrayBuffer, 0, MAGIC_SIZE));
  if (magic !== MAGIC) {
    throw new Error("Not a valid .sg archive (bad magic: " + JSON.stringify(magic) + ")");
  }

  const flags = view.getUint16(MAGIC_SIZE, false);
  const numLumps = view.getUint16(MAGIC_SIZE + 2, false);
  const dirOffset = view.getUint32(MAGIC_SIZE + 4, false);

  const entries = [];
  for (let i = 0; i < numLumps; i++) {
    const entryStart = dirOffset + i * ENTRY_SIZE;
    const nameBytes = new Uint8Array(arrayBuffer, entryStart, 64);
    const nullIdx = nameBytes.indexOf(0);
    const name = decoder.decode(nameBytes.slice(0, nullIdx >= 0 ? nullIdx : 64));
    const size = view.getUint32(entryStart + 64, false);
    const offset = view.getUint32(entryStart + 68, false);

    const dataStart = HEADER_SIZE + offset;
    const data = new Uint8Array(arrayBuffer, dataStart, size);
    entries.push({ name, data: data.slice() });
  }

  return { flags, entries };
}

function buildArchive(entries, flags) {
  flags = flags || 0;
  let totalDataSize = 0;
  for (const e of entries) {
    totalDataSize += e.data.byteLength;
  }

  const dirOffset = HEADER_SIZE + totalDataSize;
  const totalSize = dirOffset + entries.length * ENTRY_SIZE;
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const encoder = new TextEncoder();

  const magicBytes = encoder.encode(MAGIC);
  u8.set(magicBytes, 0);
  view.setUint16(MAGIC_SIZE, flags, false);
  view.setUint16(MAGIC_SIZE + 2, entries.length, false);
  view.setUint32(MAGIC_SIZE + 4, dirOffset, false);

  let currentOffset = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    u8.set(new Uint8Array(e.data), HEADER_SIZE + currentOffset);

    const entryStart = dirOffset + i * ENTRY_SIZE;
    const nameBytes = encoder.encode(e.name);
    u8.fill(0, entryStart, entryStart + 64);
    u8.set(nameBytes.slice(0, 63), entryStart);
    view.setUint32(entryStart + 64, e.data.byteLength, false);
    view.setUint32(entryStart + 68, currentOffset, false);

    currentOffset += e.data.byteLength;
  }

  return buf;
}

function entriesToFiles(entries) {
  const decoder = new TextDecoder("utf-8");
  const files = {};
  for (const e of entries) {
    try {
      const text = decoder.decode(e.data);
      files[e.name] = JSON.parse(text);
    } catch {
      files[e.name] = e.data;
    }
  }
  return files;
}

function filesToEntries(files) {
  const encoder = new TextEncoder();
  const entries = [];
  for (const [name, content] of Object.entries(files)) {
    let data;
    if (content instanceof Uint8Array) {
      data = content;
    } else {
      data = encoder.encode(JSON.stringify(content, null, 2) + "\n");
    }
    entries.push({ name, data });
  }
  return entries;
}
