export default {
  label: "Battle Zones",
  type: "array",
  displayName: (e) => `Zone ${e.id ?? "?"}`,
  fields: [
    { key: "id", label: "ID", type: "int" },
    { key: "encounterTime", label: "Encounter Time (s)", type: "float" },
    { key: "groups", label: "Group IDs", type: "intlist" },
    { key: "maps", label: "Map Names", type: "strlist" },
  ],
  defaultEntry: (data) => ({
    id: Math.max(-1, ...data.map((e) => e.id || 0)) + 1,
    encounterTime: 2.0,
    groups: [],
    maps: [],
  }),
};
