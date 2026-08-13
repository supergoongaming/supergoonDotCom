export default {
  label: "Game Config",
  type: "config",
  layout: [
    { section: "Logos" },
    { key: "logos", label: "Logo Textures", type: "strlist", path: ["logos"] },
    { section: "Audio" },
    { key: "bgmVolume", label: "BGM Volume (0-1)", type: "float", path: ["audio", "bgmVolume"] },
    { key: "sfxVolume", label: "SFX Volume (0-1)", type: "float", path: ["audio", "sfxVolume"] },
    { section: "Window" },
    { key: "winX", label: "Render Width", type: "int", path: ["window", "x"] },
    { key: "winY", label: "Render Height", type: "int", path: ["window", "y"] },
    { key: "xWin", label: "Window Width", type: "int", path: ["window", "xWin"] },
    { key: "yWin", label: "Window Height", type: "int", path: ["window", "yWin"] },
    { key: "title", label: "Window Title", type: "string", path: ["window", "title"] },
    { section: "Scenes" },
    { key: "defaultScene", label: "Default Scene", type: "string", path: ["scene", "defaultScene"] },
    {
      key: "scenes", label: "Scene List", type: "sublist", path: ["scene", "scenes"], subfields: [
        { key: "MapName", label: "Map", type: "string" },
        { key: "UIName", label: "UI", type: "string" },
        { key: "BGMName", label: "BGM", type: "string" },
        { key: "BGMVolume", label: "Vol", type: "float" },
        { key: "DisplayName", label: "Display", type: "string" },
      ],
    },
  ],
};
