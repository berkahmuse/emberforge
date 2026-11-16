// Deterministic scenes for screenshots. One job: stage a fixed game
// state per shot name, with a fixed clock, so every render of a scene
// looks the same. No input, no wall-clock randomness.

export function stageShot(g, name) {
  const w = g.world;
  if (name === 'title') {
    g.screen = 'title';
    g.selectedDifficulty = 1;
    g.featsEarned = new Set(['first-blade', 'masterwork', 'combo-five']);
    g.bests = { apprentice: 5120, journeyman: 6840, master: 0 };
    g.runs = [
      { date: 'Nov 15', difficulty: 'journeyman', grade: 'B', score: 6840, stars: 0 },
      { date: 'Nov 15', difficulty: 'apprentice', grade: 'C', score: 5120, stars: 0 },
    ];
    return;
  }
  if (name === 'board') {
    g.screen = 'playing';
    g.phase = 'board';
    w.day = 1;
    w.gold = 50;
    w.dayGold = 0;
    w.brakkDayGold = 0;
    return;
  }
  if (name === 'play') {
    g.screen = 'playing';
    g.phase = 'forge';
    w.day = 3;
    w.dayClock = 187;
    w.gold = 245;
    w.goldEarned = 412;
    w.score = 640;
    w.stats.delivered = 2;
    w.stats.masterworks = 1;
    w.stats.bestCombo = 4;
    w.stats.strikes = 31;
    w.stats.perfects = 18;
    w.brakkGold = 330;
    w.brakkDayGold = 48;
    w.dayGold = 145;
    w.orders = [
      { id: 'd3o2', type: 'AXE', material: 'steel', base: 95, target: 'fine', stages: 1, stage: 0, deadline: 240 },
      { id: 'd3o3', type: 'DAGGER', material: 'mithril', base: 130, target: 'masterwork', stages: 1, stage: 0, deadline: 240 },
    ];
    w.order = w.orders[0];
    w.forge = {
      progress: 64, heat: 72, ringAngle: 40, zoneCenter: 12,
      ringSpeed: 150, combo: 3, comboTimer: 1.8, strikes: 12, perfects: 7,
    };
    w.upgrades = new Set(['anvil', 'barrel']);
    g.lastStrike = { result: 'perfect', crit: false, at: 1.6 };
    // Fixed ember positions + a mid-expansion pulse ring: the cover shot
    // must render byte-identical every time, so no Math.random() here.
    for (let i = 0; i < 12; i++) {
      g.fx.particles.push({
        kind: 'ember',
        x: 600 + i * 8, y: 430 - (i % 4) * 12,
        vx: 0, vy: -30, sway: i * 0.7,
        life: 1.6, age: 0.5 + (i % 3) * 0.2,
        color: i % 2 ? '#fde68a' : '#f97316',
        size: 2 + (i % 3),
      });
    }
    g.fx.pulse(640, 440);
    g.fx.particles[g.fx.particles.length - 1].age = 0.35;
    g.fx.floater(700, 400, '+95g', '#eab308');
    return;
  }
  if (name === 'draft') {
    g.screen = 'draft';
    w.day = 1;
    w.gold = 180;
    w.dayGold = 120;
    w.brakkDayGold = 90;
    w.draft = ['bellows', 'lucky', 'stock'];
    w.upgrades = new Set(['anvil']);
    g.selectedDraft = 1;
    return;
  }
  if (name === 'win') {
    g.screen = 'win';
    w.day = 5;
    w.gold = 612;
    w.goldEarned = 980;
    w.score = 1480;
    w.stats.delivered = 14;
    w.stats.masterworks = 4;
    w.stats.fines = 8;
    w.stats.crudes = 2;
    w.stats.bestCombo = 5;
    w.stats.strikes = 214;
    w.stats.perfects = 121;
    w.stats.ruined = 1;
    w.upgrades = new Set(['anvil', 'barrel', 'lucky', 'bellows']);
    g.featsEarned = new Set(['first-blade', 'flawless-day', 'masterwork', 'combo-five', 'rich-smith', 'dragonslayer']);
    g.nextGoal = 'Win on MASTER — the forge remembers.';
    return;
  }
}
