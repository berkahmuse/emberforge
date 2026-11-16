// Draft upgrades. One job: the catalog the draft screen shows and the
// one-line effect text each upgrade carries. The rules live in world.js;
// this file only names and describes.

import { UPGRADES } from './config.js';

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}

export function upgradeBlurb(id) {
  const u = upgradeById(id);
  return u ? u.blurb : '';
}

export function upgradeName(id) {
  const u = upgradeById(id);
  return u ? u.name : id;
}

// Short effect chips for the loadout row on the win screen.
export function ownedChips(ownedIds) {
  return ownedIds.map((id) => upgradeName(id));
}
