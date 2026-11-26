// Keyboard input for a stick-and-throttle flight game. Held keys give continuous
// deflections (pitch, roll, yaw, throttle); one-shot presses (confirm, pause, camera,
// mute, restart) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;

const PITCH_UP = new Set(['KeyW', 'ArrowUp']);
const PITCH_DOWN = new Set(['KeyS', 'ArrowDown']);
const ROLL_LEFT = new Set(['KeyA', 'ArrowLeft']);
const ROLL_RIGHT = new Set(['KeyD', 'ArrowRight']);
const YAW_LEFT = new Set(['KeyQ']);
const YAW_RIGHT = new Set(['KeyE']);
const THROTTLE_UP = new Set(['ShiftLeft', 'ShiftRight', 'Equal', 'NumpadAdd']);
const THROTTLE_DOWN = new Set(['ControlLeft', 'ControlRight', 'Minus', 'NumpadSubtract']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CAMERA = new Set(['KeyC']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      // Repeats still steer, but never re-fire a one-shot action.
      if (THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)) held.add(event.code);
      return;
    }
    held.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (CAMERA.has(event.code)) actions |= ACTION_CAMERA;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (RESTART.has(event.code)) actions |= ACTION_RESTART;
    else if (!PITCH_UP.has(event.code) && !PITCH_DOWN.has(event.code)
      && !ROLL_LEFT.has(event.code) && !ROLL_RIGHT.has(event.code)
      && !YAW_LEFT.has(event.code) && !YAW_RIGHT.has(event.code)
      && !THROTTLE_UP.has(event.code) && !THROTTLE_DOWN.has(event.code)) return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything.
  window.addEventListener('blur', () => held.clear());
  // A click or tap confirms, like Space: it starts the game and dismisses panels.
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  function any(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    // v15: W pulls UP, S pushes DOWN — the v14 mapping was backwards
    // (W sent -1 and the model dives on -1, so W dived and S climbed,
    // against both the key-cap label and this comment). The swap is
    // here only, in the player's key mapping: flight.js and the
    // autopilot are untouched, so the flight model and the sim scores
    // do not move.
    /** +1 to pull up, -1 to push down; 0 when neither or both. */
    pitch() {
      return (any(PITCH_UP) ? 1 : 0) - (any(PITCH_DOWN) ? 1 : 0);
    },
    /** -1 for left, +1 for right; 0 when neither or both. */
    roll() {
      return (any(ROLL_RIGHT) ? 1 : 0) - (any(ROLL_LEFT) ? 1 : 0);
    },
    /** -1 for left rudder, +1 for right rudder. */
    yaw() {
      return (any(YAW_RIGHT) ? 1 : 0) - (any(YAW_LEFT) ? 1 : 0);
    },
    /** -1 to close the throttle, +1 to open it. */
    throttle() {
      return (any(THROTTLE_UP) ? 1 : 0) - (any(THROTTLE_DOWN) ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
