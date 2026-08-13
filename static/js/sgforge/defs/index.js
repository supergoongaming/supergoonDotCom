import abilities from "./abilities.js";
import battleDB from "./battleDB.js";
import battleZones from "./battleZones.js";
import playerCharacters from "./playerCharacters.js";
import battleGroups from "./battleGroups.js";
import gameConfig from "./gameConfig.js";

export const FORM_DEFS = {
  "abilities.json": abilities,
  "battleDB.json": battleDB,
  "battleZones.json": battleZones,
  "playerCharacters.json": playerCharacters,
  "battleGroups.json": battleGroups,
  "gameConfig.json": gameConfig,
};

export function isDialogFile(name) {
  return name.endsWith("D.json") && !FORM_DEFS[name];
}
