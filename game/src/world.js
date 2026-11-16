// EMBERFORGE — the rules. Pure state + step functions; no drawing, no
// DOM. main.js owns the screen state machine; this file owns the forge,
// the orders, the rival, the days and the economy.

import {
  BLADE_TYPES, BRAKK_DAY_TARGET, COMBO_MAX, COMBO_WINDOW, DAY_CLOCK,
  DAYS, DRAGONBLADE_BONUS, FAVOUR_BONUS, FINE_MIN_PROGRESS,
  HEAT_COOL_PER_SEC, MATERIALS, MATERIAL_IDS, MASTERWORK_MIN_PROGRESS,
  ORDERS_PER_DAY, REROLL_COST, ROYAL_CLOCK, START_GOLD, START_LIVES,
  STRIKE, WHITE_HIGH, WHITE_LOW,
} from './config.js';
import { makeRng, pick, rangeInt } from './random.js';

export const EVENT_NONE = 0;

function whiteWindow(world) {
  return world.upgrades.has('barrel') ? { lo: 60, hi: 95 } : { lo: WHITE_LOW, hi: WHITE_HIGH };
}

function materialCost(world, materialId) {
  const base = MATERIALS[materialId].cost;
  return world.upgrades.has('stock') ? Math.max(1, Math.round(base * 0.7)) : base;
}

function genOrders(world, day) {
  const rng = world.rng;
  const orders = [];
  if (day === DAYS) {
    orders.push({
      id: 'dragonblade', type: 'DRAGONBLADE', material: 'mithril',
      base: 400, target: 'fine', stages: 3, stage: 0, deadline: ROYAL_CLOCK,
    });
    return orders;
  }
  const count = ORDERS_PER_DAY[day - 1];
  for (let i = 0; i < count; i++) {
    const material = day === 1 ? 'iron'
      : day === 2 ? pick(rng, ['iron', 'iron', 'steel'])
      : pick(rng, MATERIAL_IDS);
    const target = day >= 3 && rng() < 0.33 ? 'masterwork' : 'fine';
    const base = 40 + day * 15 + rangeInt(rng, 0, 25);
    orders.push({
      id: `d${day}o${i}`, type: pick(rng, BLADE_TYPES), material,
      base: target === 'masterwork' ? Math.round(base * 1.5) : base,
      target, stages: 1, stage: 0, deadline: DAY_CLOCK,
    });
  }
  return orders;
}

export function makeWorld(seed, difficulty) {
  const world = {
    seed,
    rng: makeRng(seed),
    difficulty,
    day: 1,
    dayClock: DAY_CLOCK,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    goldEarned: 0,
    orders: [],
    order: null, // order currently being forged
    forge: null, // { progress, heat, ringAngle, zoneCenter, ringSpeed, combo, comboTimer, strikes, perfects, stageProgress }
    upgrades: new Set(),
    draft: [], // 3 upgrade ids offered between days
    draftRerolls: 0,
    stats: {
      delivered: 0, ruined: 0, masterworks: 0, fines: 0, crudes: 0,
      bestCombo: 0, strikes: 0, perfects: 0,
    },
    featsEarned: new Set(),
    brakkGold: 0,
    brakkDayGold: 0,
    brakkTimer: 0,
    brakkNextGain: 20,
    dayGold: 0,
    dayRuined: 0,
    dragonbladeDone: false,
    brakkDragonDone: false,
    brakkDragonAt: 150, // seconds into day 5 when Brakk finishes
    over: false,
    won: false,
    overReason: '',
  };

  world.startDay = function startDay(day) {
    world.day = day;
    world.dayClock = day === DAYS ? ROYAL_CLOCK : DAY_CLOCK;
    world.orders = genOrders(world, day);
    world.order = null;
    world.forge = null;
    world.dayGold = 0;
    world.dayRuined = 0;
    world.brakkDayGold = 0;
    world.brakkTimer = 0;
    world.brakkNextGain = 20 + world.rng() * 10;
    if (day === DAYS) world.brakkDragonAt = 140 + world.rng() * 20;
  };

  world.orderCost = function orderCost(order) {
    return materialCost(world, order.material);
  };

  world.canAfford = function canAfford(order) {
    return world.gold >= world.orderCost(order);
  };

  world.startForge = function startForge(order) {
    const cost = world.orderCost(order);
    if (world.gold < cost) return false;
    world.gold -= cost;
    world.order = order;
    world.forge = {
      progress: 0, heat: 10, ringAngle: 0,
      zoneCenter: world.rng() * 360,
      ringSpeed: 150 * world.difficulty.ringRate,
      combo: 0, comboTimer: 0, strikes: 0, perfects: 0,
    };
    return true;
  };

  world.abandonForge = function abandonForge() {
    world.order = null;
    world.forge = null;
  };

  function angDiff(a, b) {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  world.strike = function strike() {
    const f = world.forge;
    if (!f) return null;
    const mat = MATERIALS[world.order.material];
    const d = angDiff(f.ringAngle, f.zoneCenter);
    let result = 'clang';
    if (d <= mat.perfect / 2) result = 'perfect';
    else if (d <= mat.good / 2) result = 'good';
    const crit = world.upgrades.has('lucky') && world.rng() < 0.15;
    let progressGain = STRIKE[result].progress;
    if (world.upgrades.has('anvil')) progressGain += 2;
    if (result === 'perfect') {
      f.combo = Math.min(COMBO_MAX, f.combo + 1);
      f.comboTimer = world.upgrades.has('charm') ? 4 : COMBO_WINDOW;
      progressGain += f.combo - 1;
      f.perfects += 1;
      world.stats.perfects += 1;
      if (f.combo > world.stats.bestCombo) world.stats.bestCombo = f.combo;
      if (f.combo >= COMBO_MAX) world.featsEarned.add('combo-five');
    } else {
      f.combo = 0;
      f.comboTimer = 0;
    }
    if (crit) progressGain *= 2;
    let heatGain = STRIKE[result].heat * mat.heatRate * world.difficulty.heatRate;
    if (world.upgrades.has('stove')) heatGain *= 0.75;
    f.progress = Math.min(100, f.progress + progressGain);
    f.heat = Math.min(100, f.heat + heatGain);
    f.strikes += 1;
    world.stats.strikes += 1;
    // The gold zone jumps after every strike; the ring quickens.
    f.zoneCenter = world.rng() * 360;
    f.ringSpeed *= 1.03;
    const ruined = f.heat >= 100;
    if (ruined) world.ruinBlade();
    return { result, crit, progressGain, heatGain, combo: f.combo, ruined };
  };

  world.quench = function quench() {
    const f = world.forge;
    if (!f) return null;
    const win = whiteWindow(world);
    let quality = 'crude';
    if (f.progress >= MASTERWORK_MIN_PROGRESS && f.heat >= win.lo && f.heat <= win.hi) quality = 'masterwork';
    else if (f.progress >= FINE_MIN_PROGRESS) quality = 'fine';
    const order = world.order;
    if (order.type === 'DRAGONBLADE') {
      return world.quenchDragonStage(quality);
    }
    const mat = MATERIALS[order.material];
    const mult = quality === 'masterwork' ? 1.8 : quality === 'fine' ? 1.0 : 0.6;
    let payout = Math.round(order.base * mat.payout * mult);
    if (quality === order.target) payout += 15;
    world.gold += payout;
    world.goldEarned += payout;
    world.dayGold += payout;
    world.score += payout;
    if (quality === 'masterwork') { world.stats.masterworks += 1; world.score += 150; world.featsEarned.add('masterwork'); }
    else if (quality === 'fine') { world.stats.fines += 1; world.score += 50; }
    else world.stats.crudes += 1;
    world.stats.delivered += 1;
    world.featsEarned.add('first-blade');
    if (world.gold >= 300) world.featsEarned.add('rich-smith');
    world.orders = world.orders.filter((o) => o !== order);
    world.order = null;
    world.forge = null;
    return { quality, payout, order };
  };

  world.quenchDragonStage = function quenchDragonStage(quality) {
    const order = world.order;
    if (quality === 'crude') {
      // The edge is dull — forge this stage again. No life lost, time lost.
      world.forge.progress = 0;
      world.forge.heat = 10;
      return { quality, payout: 0, order, rejected: true };
    }
    order.stage += 1;
    world.stats.delivered += 1;
    if (quality === 'masterwork') { world.stats.masterworks += 1; world.score += 150; world.featsEarned.add('masterwork'); }
    else world.stats.fines += 1;
    if (order.stage >= order.stages) {
      const first = world.dayClock > ROYAL_CLOCK - world.brakkDragonAt;
      const bonus = first ? DRAGONBLADE_BONUS : 0;
      const payout = Math.round(order.base * MATERIALS.mithril.payout) + bonus;
      world.gold += payout;
      world.goldEarned += payout;
      world.dayGold += payout;
      world.score += payout + 500;
      world.dragonbladeDone = true;
      world.won = true;
      world.featsEarned.add('dragonslayer');
      world.orders = world.orders.filter((o) => o !== order);
      world.order = null;
      world.forge = null;
      return { quality, payout, order, won: true, first };
    }
    world.forge.progress = 0;
    world.forge.heat = 10;
    return { quality, payout: 0, order, stageDone: true };
  };

  world.ruinBlade = function ruinBlade() {
    world.lives -= 1;
    world.stats.ruined += 1;
    world.dayRuined += 1;
    world.order = null;
    world.forge = null;
    if (world.lives <= 0) {
      world.over = true;
      world.overReason = 'Three blades ruined. The forge goes cold.';
    }
  };

  world.rollDraft = function rollDraft() {
    const pool = [
      'bellows', 'anvil', 'barrel', 'lucky', 'stove', 'stock', 'apprentice', 'charm',
    ].filter((id) => !world.upgrades.has(id));
    const out = [];
    const rng = world.rng;
    while (out.length < 3 && pool.length > 0) {
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    world.draft = out;
    return out;
  };

  world.chooseUpgrade = function chooseUpgrade(id) {
    if (!world.draft.includes(id)) return false;
    world.upgrades.add(id);
    world.draft = [];
    return true;
  };

  world.rerollDraft = function rerollDraft() {
    if (world.gold < REROLL_COST) return false;
    world.gold -= REROLL_COST;
    world.draftRerolls += 1;
    return world.rollDraft().length > 0;
  };

  world.endDay = function endDay() {
    const timeBonus = Math.round(world.dayClock) * 2;
    world.score += timeBonus;
    let favour = 0;
    if (world.dayGold >= BRAKK_DAY_TARGET[world.day - 1]) {
      favour = FAVOUR_BONUS;
      world.gold += favour;
      world.score += favour;
    }
    if (world.dayRuined === 0) world.featsEarned.add('flawless-day');
    world.brakkGold += world.brakkDayGold;
    return { timeBonus, favour, dayGold: world.dayGold, brakkDayGold: world.brakkDayGold };
  };

  world.tick = function tick(dt) {
    if (world.over || world.won) return;
    world.dayClock = Math.max(0, world.dayClock - dt);
    const f = world.forge;
    if (f) {
      f.ringAngle = (f.ringAngle + f.ringSpeed * dt) % 360;
      let cool = HEAT_COOL_PER_SEC * MATERIALS[world.order.material].coolRate;
      if (world.upgrades.has('bellows')) cool *= 1.4;
      f.heat = Math.max(0, f.heat - cool * dt);
      if (f.comboTimer > 0) {
        f.comboTimer -= dt;
        if (f.comboTimer <= 0) f.combo = 0;
      }
      if (world.upgrades.has('apprentice')) {
        f.progress = Math.min(100, f.progress + 1 * dt);
      }
    }
    // Brakk earns gold in chunks through the day.
    world.brakkTimer += dt;
    if (world.day < DAYS && world.brakkTimer >= world.brakkNextGain) {
      world.brakkTimer = 0;
      world.brakkNextGain = 20 + world.rng() * 10;
      const gain = 12 + Math.floor(world.rng() * 11);
      world.brakkDayGold += gain;
    }
    if (world.day === DAYS && world.dayClock <= ROYAL_CLOCK - world.brakkDragonAt) {
      world.brakkDragonDone = true;
    }
    if (world.dayClock <= 0) {
      if (world.day === DAYS && !world.dragonbladeDone) {
        world.over = true;
        world.overReason = 'The royal deadline passed. The Dragonblade was never delivered.';
      }
      // Days 1-4: the clock ending just ends the day (main.js advances).
    }
  };

  world.dayIsDone = function dayIsDone() {
    return world.orders.length === 0 || world.dayClock <= 0;
  };

  world.finalScore = function finalScore() {
    return Math.round(world.score * world.difficulty.scoreMult);
  };

  world.grade = function grade() {
    const s = world.finalScore();
    if (s >= 1400) return 'S';
    if (s >= 1000) return 'A';
    if (s >= 650) return 'B';
    return 'C';
  };

  world.startDay(1);
  return world;
}
