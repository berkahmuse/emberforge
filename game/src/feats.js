// Feats, best scores and run history. One job: persistence in
// localStorage, keyed per difficulty. The world earns feats; this file
// remembers them across runs.

import { FEATS } from './config.js';

const FEAT_KEY = 'emberforge-feats';
const BEST_KEY = 'emberforge-best';
const RUNS_KEY = 'emberforge-runs';

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: bests are a nicety, never fatal.
  }
}

export function loadFeats() {
  const list = readJson(FEAT_KEY, []);
  return new Set(Array.isArray(list) ? list : []);
}

export function saveFeats(featSet) {
  writeJson(FEAT_KEY, [...featSet]);
}

export function featList() {
  return FEATS;
}

export function loadBests() {
  return readJson(BEST_KEY, {});
}

export function saveBest(difficultyId, score) {
  const bests = loadBests();
  if (!bests[difficultyId] || score > bests[difficultyId]) {
    bests[difficultyId] = score;
    writeJson(BEST_KEY, bests);
  }
  return bests[difficultyId];
}

export function loadRuns() {
  const runs = readJson(RUNS_KEY, []);
  return Array.isArray(runs) ? runs.slice(0, 3) : [];
}

export function saveRun(run) {
  const runs = loadRuns();
  runs.unshift({
    date: run.date,
    difficulty: run.difficulty,
    grade: run.grade,
    score: run.score,
    stars: run.stars,
  });
  writeJson(RUNS_KEY, runs.slice(0, 3));
}
