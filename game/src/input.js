// Input: keyboard + mouse, in game coordinates. One job: turn browser
// events into the small facts the game loop consumes (keys, clicks, drags).

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // keys pressed since last consume
    click: null, // { x, y } in game coords, consumed by the loop
    mouse: { x: -1, y: -1 },
    dragging: false,
    dragX: 0,
    dragY: 0,
  };

  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.toLowerCase());
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    input.mouse = p;
    input.dragging = true;
    input.dragX = 0;
    input.dragY = 0;
    input.click = p;
  });
  window.addEventListener('mousemove', (e) => {
    input.mouse = toGame(e);
  });
  window.addEventListener('mouseup', () => {
    input.dragging = false;
  });

  input.consumeKey = function consumeKey() {
    if (input.pressed.size === 0) return null;
    const k = input.pressed.values().next().value;
    input.pressed.delete(k);
    return k;
  };
  input.consumeClick = function consumeClick() {
    const c = input.click;
    input.click = null;
    return c;
  };
  input.clear = function clear() {
    input.pressed.clear();
    input.click = null;
  };
  return input;
}
