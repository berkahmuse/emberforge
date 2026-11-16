// Game feel: embers, steam, expanding rings, floating score text, a small
// jolt on a ruined blade. One job: the juice. The motion language is the
// forge's own: embers rise slowly and flicker instead of bursting outward,
// steam expands in soft rings, a perfect strike sends a pulse ring out
// from the anvil. Easing curves are quart / sine / expo — no cubic, back
// or bounce here, so the feel reads as heat and weight, not spring.

export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function makeFx() {
  const fx = {
    particles: [],
    floaters: [],
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };

  // Slow-rising embers: they drift up, sway side to side and flicker out.
  // kind 'ember' | 'steam' | 'ring'.
  fx.embers = function embers(x, y, count) {
    for (let i = 0; i < count; i++) {
      fx.particles.push({
        kind: 'ember',
        x: x + (Math.random() - 0.5) * 90,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 14,
        vy: -18 - Math.random() * 42,
        sway: Math.random() * Math.PI * 2,
        life: 1.2 + Math.random() * 0.8,
        age: 0,
        color: Math.random() < 0.5 ? '#fde68a' : '#f97316',
        size: 2 + Math.random() * 3,
      });
    }
  };

  fx.steam = function steam(x, y) {
    for (let i = 0; i < 12; i++) {
      fx.particles.push({
        kind: 'steam',
        x: x + (Math.random() - 0.5) * 50,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: -26 - Math.random() * 30,
        sway: 0,
        life: 1.0 + Math.random() * 0.7,
        age: 0,
        color: '#e7e5e4',
        size: 6 + Math.random() * 8,
      });
    }
  };

  // An expanding ring: a pulse from the anvil on a perfect strike, or a
  // steam ring over the barrel on a quench. Radius grows quart, alpha fades.
  fx.ring = function ring(x, y, color, maxR) {
    fx.particles.push({
      kind: 'ring',
      x, y, vx: 0, vy: 0, sway: 0,
      life: 0.7, age: 0, color, size: maxR || 90,
    });
  };

  fx.pulse = function pulse(x, y) {
    fx.ring(x, y, '#f97316', 110);
  };

  fx.steamRing = function steamRing(x, y) {
    fx.ring(x, y, '#e7e5e4', 70);
  };

  fx.floater = function floater(x, y, text, color) {
    fx.floaters.push({ x, y, text, color, age: 0, life: 1.1 });
  };

  fx.addShake = function addShake(amount) {
    fx.shake = Math.min(6, fx.shake + amount);
  };

  fx.step = function step(dt) {
    fx.shake = Math.max(0, fx.shake - dt * 40);
    fx.shakeX = (Math.random() - 0.5) * fx.shake;
    fx.shakeY = (Math.random() - 0.5) * fx.shake;
    for (const p of fx.particles) {
      p.age += dt;
      p.x += (p.vx + Math.sin(p.age * 3 + p.sway) * 8) * dt;
      p.y += p.vy * dt;
      if (p.kind === 'ember') p.vy -= 6 * dt; // embers lift, they do not fall
      if (p.kind === 'steam') p.vy -= 4 * dt;
    }
    fx.particles = fx.particles.filter((p) => p.age < p.life);
    for (const f of fx.floaters) f.age += dt;
    fx.floaters = fx.floaters.filter((f) => f.age < f.life);
  };

  fx.clear = function clear() {
    fx.particles = [];
    fx.floaters = [];
    fx.shake = 0;
  };

  return fx;
}
