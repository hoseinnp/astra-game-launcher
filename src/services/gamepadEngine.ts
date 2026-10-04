import type { ControllerDetails } from '../utils/deviceDetector';

function parseGamepadDetails(rawId: string): ControllerDetails {
  const cleanId = rawId || '';
  const lower = cleanId.toLowerCase();

  const vendorMatch = cleanId.match(/vendor:?\s*([0-9a-f]{4})/i) || cleanId.match(/([0-9a-f]{4})-([0-9a-f]{4})/i);
  const productMatch = cleanId.match(/product:?\s*([0-9a-f]{4})/i);

  const vendorId = vendorMatch ? (vendorMatch[1] || vendorMatch[0]).toLowerCase() : '';
  const productId = productMatch
    ? productMatch[1].toLowerCase()
    : vendorMatch && vendorMatch[2]
      ? vendorMatch[2].toLowerCase()
      : '';

  if (vendorId === '2dc8' || lower.includes('8bitdo')) {
    let modelName = '8BitDo Wireless Controller';
    let shortName = '8BitDo';

    if (lower.includes('2c') || productId === '3105') {
      modelName = '8BitDo Ultimate 2C (Mint)';
      shortName = '8BitDo 2C';
    } else if (lower.includes('pro 2') || productId === '2000' || productId === '2001') {
      modelName = '8BitDo Pro 2 Controller';
      shortName = '8BitDo Pro 2';
    } else if (lower.includes('sn30') || productId.startsWith('600')) {
      modelName = '8BitDo SN30 Pro';
      shortName = '8BitDo SN30';
    } else if (lower.includes('lite') || productId === '2860') {
      modelName = '8BitDo Lite Controller';
      shortName = '8BitDo Lite';
    } else if (lower.includes('ultimate') || productId === '3000' || productId === '3100' || productId === '3106') {
      modelName = '8BitDo Ultimate Controller';
      shortName = '8BitDo Ultimate';
    } else if (lower.includes('m30')) {
      modelName = '8BitDo M30 (Fight Pad)';
      shortName = '8BitDo M30';
    }

    return {
      brand: '8bitdo',
      modelName,
      shortName,
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (
    vendorId === '054c' ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    (lower.includes('wireless controller') && !lower.includes('xbox'))
  ) {
    let modelName = 'Sony PlayStation Controller';
    let shortName = 'PlayStation';

    if (lower.includes('dualsense') || productId === '0ce6' || productId === '0df2') {
      modelName = productId === '0df2' ? 'Sony DualSense Edge (PS5)' : 'Sony DualSense (PS5)';
      shortName = 'DualSense PS5';
    } else if (lower.includes('dualshock 4') || productId === '05c4' || productId === '09cc' || lower.includes('ps4')) {
      modelName = 'Sony DualShock 4 (PS4)';
      shortName = 'DualShock 4';
    } else if (lower.includes('dualshock 3') || productId === '0268' || lower.includes('ps3')) {
      modelName = 'Sony DualShock 3 (PS3)';
      shortName = 'DualShock 3';
    }

    return {
      brand: 'playstation',
      modelName,
      shortName,
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (vendorId === '057e' || lower.includes('joy-con') || (lower.includes('pro controller') && !lower.includes('xbox'))) {
    let modelName = 'Nintendo Switch Pro Controller';
    let shortName = 'Switch Pro';

    if (lower.includes('joy-con (l)')) {
      modelName = 'Nintendo Joy-Con (Left)';
      shortName = 'Joy-Con (L)';
    } else if (lower.includes('joy-con (r)')) {
      modelName = 'Nintendo Joy-Con (Right)';
      shortName = 'Joy-Con (R)';
    } else if (lower.includes('joy-con')) {
      modelName = 'Nintendo Joy-Con Pair';
      shortName = 'Joy-Cons';
    }

    return {
      brand: 'nintendo',
      modelName,
      shortName,
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (vendorId === '28de' || lower.includes('steam controller') || lower.includes('steam virtual') || lower.includes('steam deck')) {
    const isDeck = lower.includes('deck') || productId === '1205';
    return {
      brand: 'steam',
      modelName: isDeck ? 'Steam Deck Controller' : 'Steam Controller',
      shortName: isDeck ? 'Steam Deck' : 'Steam Controller',
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (vendorId === '045e' || lower.includes('xbox') || lower.includes('xinput')) {
    let modelName = 'Xbox Wireless Controller';
    let shortName = 'Xbox Controller';

    if (lower.includes('series') || productId === '0b12' || productId === '0b13' || productId === '0b20') {
      modelName = 'Xbox Series X|S Controller';
      shortName = 'Xbox Series';
    } else if (lower.includes('elite') || productId === '02e3' || productId === '0b00') {
      modelName = 'Xbox Elite Wireless Controller';
      shortName = 'Xbox Elite';
    } else if (lower.includes('360') || productId === '028e' || productId === '028f' || productId === '0719') {
      modelName = 'Xbox 360 Controller';
      shortName = 'Xbox 360';
    } else if (lower.includes('one') || productId === '02d1' || productId === '02dd' || productId === '02ea') {
      modelName = 'Xbox One Controller';
      shortName = 'Xbox One';
    }

    return {
      brand: 'xbox',
      modelName,
      shortName,
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (vendorId === '046d' || lower.includes('logitech')) {
    return {
      brand: 'logitech',
      modelName: lower.includes('f710') ? 'Logitech F710 Wireless' : lower.includes('f310') ? 'Logitech F310' : 'Logitech Gamepad',
      shortName: 'Logitech',
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  if (vendorId === '1532' || lower.includes('razer')) {
    return {
      brand: 'razer',
      modelName: lower.includes('wolverine') ? 'Razer Wolverine' : lower.includes('kishi') ? 'Razer Kishi' : 'Razer Gamepad',
      shortName: 'Razer Pad',
      vendorId,
      productId,
      rawId: cleanId
    };
  }

  const cleanName = cleanId.replace(/\(standard gamepad.*?\)/i, '').trim();
  return {
    brand: 'generic',
    modelName: cleanName || 'Standard Gamepad',
    shortName: cleanName.slice(0, 14) || 'Gamepad',
    vendorId,
    productId,
    rawId: cleanId
  };
}

export type GamepadAction =
  | 'LEFT'
  | 'RIGHT'
  | 'UP'
  | 'DOWN'
  | 'CONFIRM'
  | 'BACK'
  | 'DETAILS'
  | 'NOTES'
  | 'FAVORITE'
  | 'BUMPER_LEFT'
  | 'BUMPER_RIGHT'
  | 'START'
  | 'SELECT';

class GamepadEngine {
  private listener: ((action: GamepadAction) => void) | null = null;
  private activityListener: (() => void) | null = null;
  private animFrameId: number | null = null;
  private lastActionTime: number = 0;
  private repeatDelay: number = 220; // ms debounce between stick/dpad moves
  private isConnected: boolean = false;
  private gamepadName: string = '';
  private controllerDetails: ControllerDetails | null = null;
  private onConnectionChange: ((connected: boolean, name: string, details: ControllerDetails | null) => void) | null = null;

  constructor() {
    window.addEventListener('gamepadconnected', (e) => {
      this.isConnected = true;
      const parsed = parseGamepadDetails(e.gamepad.id);
      this.controllerDetails = parsed;
      this.gamepadName = parsed.modelName;
      if (this.onConnectionChange) this.onConnectionChange(true, this.gamepadName, this.controllerDetails);
      this.startLoop();
    });

    window.addEventListener('gamepaddisconnected', () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const anyActive = Array.from(gamepads).some((g) => g !== null);
      if (!anyActive) {
        this.isConnected = false;
        this.gamepadName = '';
        this.controllerDetails = null;
        if (this.onConnectionChange) this.onConnectionChange(false, '', null);
        this.stopLoop();
      }
    });
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getControllerDetails(): ControllerDetails | null {
    return this.controllerDetails;
  }

  public setConnectionCallback(cb: (connected: boolean, name: string, details: ControllerDetails | null) => void) {
    this.onConnectionChange = cb;
    // Check initial connection
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of gamepads) {
      if (g) {
        this.isConnected = true;
        const parsed = parseGamepadDetails(g.id);
        this.controllerDetails = parsed;
        this.gamepadName = parsed.modelName;
        cb(true, this.gamepadName, this.controllerDetails);
        this.startLoop();
        break;
      }
    }
  }

  public setActivityListener(cb: () => void) {
    this.activityListener = cb;
  }

  public setListener(fn: (action: GamepadAction) => void) {
    this.listener = fn;
    this.startLoop();
  }

  private startLoop() {
    if (this.animFrameId !== null) return;

    const loop = () => {
      this.poll();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private poll() {
    if (!this.listener) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find((g) => g !== null);
    if (!gp) return;

    const now = performance.now();
    if (now - this.lastActionTime < this.repeatDelay) return;

    // Left stick / D-Pad navigation
    const stickX = gp.axes[0] || 0;
    const stickY = gp.axes[1] || 0;
    const dpadUp = gp.buttons[12]?.pressed;
    const dpadDown = gp.buttons[13]?.pressed;
    const dpadLeft = gp.buttons[14]?.pressed;
    const dpadRight = gp.buttons[15]?.pressed;

    if (stickX > 0.55 || dpadRight) {
      this.trigger('RIGHT', now);
      return;
    }
    if (stickX < -0.55 || dpadLeft) {
      this.trigger('LEFT', now);
      return;
    }
    if (stickY > 0.55 || dpadDown) {
      this.trigger('DOWN', now);
      return;
    }
    if (stickY < -0.55 || dpadUp) {
      this.trigger('UP', now);
      return;
    }

    // Action Buttons
    if (gp.buttons[0]?.pressed) { // A (South) - Confirm/Play
      this.trigger('CONFIRM', now + 150);
      return;
    }
    if (gp.buttons[1]?.pressed) { // B (East) - Back
      this.trigger('BACK', now + 150);
      return;
    }
    if (gp.buttons[2]?.pressed) { // X / Square (West) - Game Hub & Details
      this.trigger('DETAILS', now + 200);
      return;
    }
    if (gp.buttons[3]?.pressed) { // Y / Triangle (North) - Field Notes
      this.trigger('NOTES', now + 200);
      return;
    }

    // Bumpers
    if (gp.buttons[4]?.pressed) { // LB
      this.trigger('BUMPER_LEFT', now + 150);
      return;
    }
    if (gp.buttons[5]?.pressed) { // RB
      this.trigger('BUMPER_RIGHT', now + 150);
      return;
    }

    // Start / Select
    if (gp.buttons[8]?.pressed) { // Select / Back -> Search
      this.trigger('SELECT', now + 250);
      return;
    }
    if (gp.buttons[9]?.pressed) { // Start -> Settings
      this.trigger('START', now + 250);
      return;
    }
  }

  private trigger(action: GamepadAction, now: number) {
    this.lastActionTime = now;
    if (this.activityListener) {
      this.activityListener();
    }
    if (this.listener) {
      this.listener(action);
    }
  }
}

export const gamepadEngine = new GamepadEngine();
