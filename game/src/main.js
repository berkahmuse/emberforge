// EMBERFORGE — game entry point: the state machine, the fixed-step loop,
// menus, scoring and the deterministic ?shot= scenes used for screenshots.
import { makeAudio } from './audio.js';
import { DIFFICULTIES, FEATS, START_GOLD, START_LIVES, VIEW_H, VIEW_W } from './config.js';
import { makeFx } from './fx.js';
import { loadBests, loadFeats, loadRuns, saveBest, saveFeats, saveRun } from './feats.js';
import { makeInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { makeWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const selfTest = params.get('selftest') === '1';
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : (Date.now() % 2147483647);

class Game {
  constructor() {
    this.audio = makeAudio();
    this.input = makeInput(canvas);
    this.fx = makeFx();
    this.world = makeWorld(seed, DIFFICULTIES[1]);
    this.screen = 'title';
    this.phase = 'board';
    this.selectedDifficulty = 1;
    this.selectedOrder = -1;
    this.selectedDraft = -1;
    this.lastStrike = null;
    this.lastQuench = null;
    this.daySummary = null;
    this.nextGoal = '';
    this.paused = false;
    this.time = 0;
    this.featsEarned = loadFeats();
    this.bests = loadBests();
    this.runs = loadRuns();
    this.featList = FEATS;
    this.difficulties = DIFFICULTIES;
    this.shotMode = Boolean(shotScene);
    if (this.shotMode) {
      this.audio.muted = true;
      stageShot(this, shotScene);
      this.time = 2.0;
    }
  }

  syncFeats() {
    for (const id of this.world.featsEarned) this.featsEarned.add(id);
    saveFeats(this.featsEarned);
  }

  startGame() {
    this.audio.unlock();
    this.audio.click();
    this.world = makeWorld((Date.now() % 2147483647) || 1, DIFFICULTIES[this.selectedDifficulty]);
    this.screen = 'playing';
    this.phase = 'board';
    this.selectedOrder = -1;
    this.lastStrike = null;
    this.lastQuench = null;
    this.daySummary = null;
    this.fx.clear();
    this.audio.startMusic();
    this.announce(`Day 1. Pick an order from the board.`);
  }

  finishRun(won) {
    this.syncFeats();
    const w = this.world;
    const grade = w.grade();
    const score = w.finalScore();
    saveBest(w.difficulty.id, score);
    this.bests = loadBests();
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    saveRun({
      date: `${months[today.getMonth()]} ${today.getDate()}`,
      difficulty: w.difficulty.id, grade, score, stars: 0,
    });
    this.runs = loadRuns();
    this.nextGoal = grade === 'S' ? 'Win on MASTER — the forge remembers.'
      : grade === 'A' ? 'Reach grade S. Masterwork every blade.'
      : grade === 'B' ? 'Reach grade A. Beat Brakk every day.'
      : 'Reach grade B. Quench white-hot, strike true.';
    this.screen = won ? 'win' : 'gameover';
    this.audio.stopMusic();
    if (won) this.audio.win();
    else this.audio.lose();
    this.announce(won ? `Victory! Final score ${score}, grade ${grade}.` : `The forge goes cold. Score ${score}.`);
  }

  syncScreens() {
    const w = this.world;
    if (this.screen !== 'playing') return;
    if (w.won) { this.finishRun(true); return; }
    if (w.over) { this.finishRun(false); return; }
    if (w.dayIsDone()) {
      if (w.forge && w.dayClock > 0) return; // let them finish the blade
      if (w.forge) w.abandonForge();
      if (w.day >= 5) {
        if (!w.won) { w.over = true; w.overReason = 'The royal deadline passed. The Dragonblade was never delivered.'; this.finishRun(false); }
        return;
      }
      this.daySummary = w.endDay();
      this.syncFeats();
      this.screen = 'dayclear';
      this.audio.levelClear();
      this.announce(`Day ${w.day} clear.`);
    }
  }

  nextDay() {
    const w = this.world;
    w.rollDraft();
    this.selectedDraft = -1;
    this.screen = 'draft';
    this.audio.click();
  }

  chooseDraft(i) {
    const w = this.world;
    const id = w.draft[i];
    if (!id) return;
    w.chooseUpgrade(id);
    this.syncFeats();
    w.startDay(w.day + 1);
    this.screen = 'playing';
    this.phase = 'board';
    this.selectedOrder = -1;
    this.audio.levelClear();
    this.announce(`Day ${w.day}. Pick an order from the board.`);
  }

  pickOrder(i) {
    const w = this.world;
    const order = w.orders[i];
    if (!order) return;
    if (!w.canAfford(order)) {
      this.announce(`Not enough gold for ${order.type.toLowerCase()} ${MATERIAL_NAME(order)}.`);
      return;
    }
    this.selectedOrder = i;
    this.audio.click();
  }

  startForgeSelected() {
    const w = this.world;
    if (this.selectedOrder < 0) return;
    const order = w.orders[this.selectedOrder];
    if (!order || !w.canAfford(order)) return;
    if (w.startForge(order)) {
      this.phase = 'forge';
      this.audio.click();
      this.announce(`Forging ${order.type.toLowerCase()}. Strike in the ember zone.`);
    }
  }

  doStrike() {
    const w = this.world;
    if (!w.forge) return;
    const res = w.strike();
    if (!res) return;
    this.lastStrike = { result: res.result, crit: res.crit, at: this.time };
    this.audio.clang(res.result === 'perfect');
    if (res.result === 'perfect') {
      this.fx.embers(640, 450, res.crit ? 18 : 10);
      this.fx.pulse(640, 440);
    } else {
      this.fx.embers(640, 450, 4);
    }
    if (res.ruined) {
      this.audio.ruin();
      this.fx.addShake(10);
      this.fx.floater(640, 400, 'RUINED', '#ef4444');
      this.phase = 'board';
      this.selectedOrder = -1;
    }
    this.syncFeats();
  }

  doQuench() {
    const w = this.world;
    if (!w.forge) return;
    const res = w.quench();
    if (!res) return;
    this.audio.quench();
    this.fx.steam(1150, 420);
    this.fx.steamRing(1150, 410);
    if (res.rejected) {
      this.fx.floater(640, 400, 'DULL EDGE — AGAIN', '#ef4444');
      this.announce('The edge is dull. Forge this stage again.');
      return;
    }
    this.lastQuench = res;
    if (res.payout > 0) {
      this.audio.coin();
      this.fx.floater(640, 400, `+${res.payout}g`, '#eab308');
    }
    this.phase = 'board';
    this.selectedOrder = -1;
    this.syncFeats();
    if (res.won) this.syncScreens();
  }

  handleKeys() {
    const key = this.input.consumeKey();
    if (!key) return;
    if (key === 'm') {
      this.audio.unlock();
      this.audio.toggleMute();
      return;
    }
    if (key === 'p' || key === 'P') {
      if (this.screen === 'playing') {
        this.paused = !this.paused;
        this.audio.click();
      }
      return;
    }
    if (this.paused) return;
    if (key === 'r' || key === 'R') {
      if (this.screen === 'draft') {
        this.world.rerollDraft();
        this.audio.click();
        return;
      }
      if (this.screen === 'playing' && this.phase === 'board') {
        // Restart the day: fresh orders, clock reset, spent gold stays spent.
        this.world.startDay(this.world.day);
        this.selectedOrder = -1;
        this.audio.click();
        return;
      }
    }
    if (this.screen === 'title') {
      if (key === '1' || key === '2' || key === '3') this.selectedDifficulty = Number(key) - 1;
      else if (key === ' ' || key === 'enter') this.startGame();
    } else if (this.screen === 'playing') {
      if (this.phase === 'board') {
        if (key >= '1' && key <= '5') this.pickOrder(Number(key) - 1);
        else if (key === ' ' || key === 'enter') this.startForgeSelected();
      } else if (key === ' ') {
        this.doStrike();
      } else if (key === 'q') {
        this.doQuench();
      } else if (key === 'b') {
        this.world.abandonForge();
        this.phase = 'board';
        this.selectedOrder = -1;
      }
    } else if (this.screen === 'draft') {
      if (key === '1' || key === '2' || key === '3') this.chooseDraft(Number(key) - 1);
    } else if (this.screen === 'dayclear') {
      if (key === ' ' || key === 'enter') this.nextDay();
    } else if (this.screen === 'win') {
      if (key === ' ') this.startGame();
      else if (key === 't') this.screen = 'title';
    } else if (this.screen === 'gameover') {
      if (key === ' ') this.startGame();
      else if (key === 't') this.screen = 'title';
    }
  }

  inRect(click, x, y, w, h) {
    return click.x >= x && click.x <= x + w && click.y >= y && click.y <= y + h;
  }

  handleClicks() {
    const click = this.input.consumeClick();
    if (!click) return;
    if (this.paused) { this.paused = false; return; }
    if (this.screen === 'title') {
      if (this.inRect(click, 660, 500, 530, 64)) this.startGame();
      else {
        for (let i = 0; i < 3; i++) {
          if (this.inRect(click, 90, 500 + i * 56, 530, 48)) this.selectedDifficulty = i;
        }
      }
    } else if (this.screen === 'playing') {
      const w = this.world;
      if (this.phase === 'board') {
        const n = w.orders.length;
        const tw = 250;
        const gap = 20;
        const totalW = n * tw + (n - 1) * gap;
        let x = (VIEW_W - totalW) / 2;
        for (let i = 0; i < n; i++) {
          if (this.inRect(click, x, 220, tw, 118)) {
            this.pickOrder(i);
            this.startForgeSelected();
            return;
          }
          x += tw + gap;
        }
      } else {
        if (this.inRect(click, 300, 620, 120, 52)) this.doStrike();
        else if (this.inRect(click, 860, 620, 120, 52)) this.doQuench();
        else if (this.inRect(click, 1095, 400, 110, 200)) this.doQuench();
        else if (this.inRect(click, 545, 420, 190, 140)) this.doStrike();
      }
    } else if (this.screen === 'draft') {
      for (let i = 0; i < 3; i++) {
        if (this.inRect(click, 190, 240 + i * 100, 900, 86)) this.chooseDraft(i);
      }
    } else if (this.screen === 'dayclear') {
      if (this.inRect(click, 490, 520, 300, 56)) this.nextDay();
    } else if (this.screen === 'win') {
      if (this.inRect(click, 390, 560, 220, 56)) this.startGame();
      else if (this.inRect(click, 670, 560, 220, 56)) this.screen = 'title';
    } else if (this.screen === 'gameover') {
      if (this.inRect(click, 390, 460, 220, 56)) this.startGame();
      else if (this.inRect(click, 670, 460, 220, 56)) this.screen = 'title';
    }
  }

  update(dt) {
    this.time += dt;
    this.fx.step(dt);
    this.audio.step(dt);
    if (this.shotMode) return;
    if (this.screen === 'playing' && !this.paused) {
      this.world.tick(dt);
    }
    this.handleKeys();
    this.handleClicks();
    this.syncScreens();
  }

  view() {
    return {
      world: this.world,
      screen: this.screen,
      phase: this.phase,
      time: this.shotMode ? 2.0 : this.time,
      fx: this.fx,
      input: this.input,
      selectedDifficulty: this.selectedDifficulty,
      selectedOrder: this.selectedOrder,
      selectedDraft: this.selectedDraft,
      lastStrike: this.lastStrike,
      daySummary: this.daySummary,
      nextGoal: this.nextGoal,
      featsEarned: this.featsEarned,
      featList: this.featList,
      bests: this.bests,
      runs: this.runs,
      difficulties: this.difficulties,
      paused: this.paused,
    };
  }

  render() {
    render(ctx, this.view());
  }

  announce(text) {
    statusEl.textContent = text;
  }
}

function MATERIAL_NAME(order) {
  return order.material;
}

const game = new Game();
window.__emberGame = game;

// Headless self-test (?selftest=1): drives the real game code — start,
// forge, strike, quench, ruin, draft, dragonblade — and reports PASS/FAIL.
function runSelfTest() {
  const out = [];
  const check = (name, ok, detail) => out.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail || ''}`);
  try {
    // 1. Start.
    game.startGame();
    check('start', game.screen === 'playing' && game.phase === 'board' && game.world.day === 1 && game.world.orders.length === 3,
      `screen=${game.screen} orders=${game.world.orders.length}`);
    check('start-gold', game.world.gold === START_GOLD && game.world.lives === START_LIVES, `gold=${game.world.gold}`);
    // 2. Pick + forge order 0 (iron, cost 10).
    game.pickOrder(0);
    game.startForgeSelected();
    check('forge', game.phase === 'forge' && game.world.forge !== null && game.world.gold === START_GOLD - 10,
      `gold=${game.world.gold}`);
    // 3. Perfect strike: park the marker in the zone.
    const f = game.world.forge;
    f.ringAngle = f.zoneCenter;
    const r1 = game.world.strike();
    check('strike-perfect', r1 && r1.result === 'perfect' && f.progress > 0, `result=${r1 && r1.result} progress=${Math.round(f.progress)}`);
    // 4. Clang: park the marker far from the zone.
    f.ringAngle = (f.zoneCenter + 120) % 360;
    const r2 = game.world.strike();
    check('strike-clang', r2 && r2.result === 'clang', `result=${r2 && r2.result}`);
    // 5. Heat cools over time.
    f.heat = 50;
    game.world.tick(1);
    check('heat-cools', f.heat < 50, `heat=${f.heat.toFixed(1)}`);
    // 6. Masterwork quench.
    f.progress = 95;
    f.heat = 80;
    const q1 = game.world.quench();
    check('quench-masterwork', q1 && q1.quality === 'masterwork' && q1.payout > 0, `quality=${q1 && q1.quality} payout=${q1 && q1.payout}`);
    check('delivered-1', game.world.stats.delivered === 1 && game.world.orders.length === 2, `delivered=${game.world.stats.delivered}`);
    check('feat-masterwork', game.world.featsEarned.has('masterwork'), '');
    // 7. Crude quench on the next order.
    game.pickOrder(0);
    game.startForgeSelected();
    const f2 = game.world.forge;
    f2.progress = 30;
    f2.heat = 40;
    const q2 = game.world.quench();
    check('quench-crude', q2 && q2.quality === 'crude', `quality=${q2 && q2.quality}`);
    // 8. Ruin a blade: heat 99 + clang.
    game.pickOrder(0);
    game.startForgeSelected();
    const f3 = game.world.forge;
    f3.heat = 99;
    f3.ringAngle = (f3.zoneCenter + 120) % 360;
    game.doStrike();
    check('ruin', game.world.lives === START_LIVES - 1 && game.world.forge === null, `lives=${game.world.lives}`);
    // 9. Two more ruins end the run.
    game.world.gold = 1000;
    for (let i = 0; i < 2; i++) {
      game.pickOrder(0);
      game.startForgeSelected();
      const fx = game.world.forge;
      fx.heat = 99;
      fx.ringAngle = (fx.zoneCenter + 120) % 360;
      game.doStrike();
    }
    check('lives-zero', game.world.lives === 0 && game.world.over === true, `lives=${game.world.lives} over=${game.world.over}`);
    game.syncScreens();
    check('gameover-screen', game.screen === 'gameover', `screen=${game.screen}`);
    // 10. Draft: fresh run, end day 1, roll + choose.
    game.startGame();
    game.world.orders = [];
    game.syncScreens();
    check('dayclear', game.screen === 'dayclear', `screen=${game.screen}`);
    game.nextDay();
    check('draft-3', game.screen === 'draft' && game.world.draft.length === 3, `draft=${game.world.draft.join(',')}`);
    game.chooseDraft(0);
    check('draft-chosen', game.world.upgrades.size === 1 && game.world.day === 2 && game.screen === 'playing',
      `day=${game.world.day} upgrades=${game.world.upgrades.size}`);
    // 11. Dragonblade: day 5, three stages, win.
    game.world.startDay(5);
    game.world.gold = 1000;
    game.pickOrder(0);
    game.startForgeSelected();
    for (let s = 0; s < 3; s++) {
      const fd = game.world.forge;
      fd.progress = 95;
      fd.heat = 80;
      const qs = game.world.quench();
      check(`dragon-stage-${s + 1}`, qs && (qs.stageDone || qs.won), `quality=${qs && qs.quality} won=${!!(qs && qs.won)}`);
    }
    check('dragon-won', game.world.won === true && game.world.dragonbladeDone === true, `won=${game.world.won}`);
    game.syncScreens();
    check('win-screen', game.screen === 'win', `screen=${game.screen}`);
    check('grade', ['S', 'A', 'B', 'C'].includes(game.world.grade()) && game.world.finalScore() > 0,
      `grade=${game.world.grade()} score=${game.world.finalScore()}`);
    // 12. Determinism: same seed, same orders.
    const a = makeWorld(12345, DIFFICULTIES[1]);
    const b = makeWorld(12345, DIFFICULTIES[1]);
    check('determinism', JSON.stringify(a.orders) === JSON.stringify(b.orders), '');
    // 13. Combo: five perfect strikes in a row.
    game.startGame();
    game.world.gold = 1000;
    game.pickOrder(0);
    game.startForgeSelected();
    const fc = game.world.forge;
    for (let i = 0; i < 5; i++) {
      fc.ringAngle = fc.zoneCenter;
      fc.heat = 10;
      game.world.strike();
    }
    check('combo-five', fc.combo === 5 && game.world.featsEarned.has('combo-five'), `combo=${fc.combo}`);
    // 14. Restart resets the run.
    game.startGame();
    check('restart', game.world.day === 1 && game.world.gold === START_GOLD && game.world.lives === START_LIVES, '');
    // 15. Render smoke: every screen draws without throwing.
    let renderOk = true;
    try {
      game.render();
      game.screen = 'draft';
      game.world.rollDraft();
      game.render();
      game.screen = 'dayclear';
      game.daySummary = { dayGold: 120, brakkDayGold: 90, timeBonus: 40, favour: 50 };
      game.render();
      game.screen = 'win';
      game.render();
      game.screen = 'gameover';
      game.render();
      game.screen = 'title';
      game.render();
    } catch (err) {
      renderOk = false;
      out.push(`FAIL render-smoke ${err.message}`);
    }
    check('render-smoke', renderOk, '');
  } catch (err) {
    out.push(`FAIL exception ${err.message}`);
  }
  const el = document.createElement('pre');
  el.id = 'testout';
  el.textContent = out.join('\n');
  document.body.appendChild(el);
  document.title = out.some((l) => l.startsWith('FAIL')) ? 'SELFTEST FAIL' : 'SELFTEST PASS';
  window.__selfTestDone = true;
}

if (selfTest) {
  runSelfTest();
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!game.shotMode) {
      acc += dt;
      while (acc >= STEP) {
        game.update(STEP);
        acc -= STEP;
      }
    } else {
      game.update(0);
    }
    game.render();
    if (game.shotMode) window.__shotReady = true;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
