/**
 * Astra Controller Haptics Engine
 * Provides dual-rumble vibration patterns across connected gamepads
 * (DualSense, Xbox, Switch Pro, XInput).
 */

export type HapticTexture =
  | 'light-tick'
  | 'confirm'
  | 'back'
  | 'analog-thud'
  | 'digital-buzz'
  | 'cosmic-wave'
  | 'cartridge-clunk'
  | 'blow-dust-ripple'
  | 'warning';

class HapticsService {
  private enabled: boolean = true;
  private isRumbling: boolean = false;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getIsRumbling(): boolean {
    return this.isRumbling;
  }

  /**
   * Universal gamepad vibration dispatcher
   */
  public async vibrate(durationMs: number = 80, weakMagnitude: number = 0.3, strongMagnitude: number = 0.3) {
    if (!this.enabled) return;
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let triggered = false;

      for (const gp of gamepads) {
        if (!gp) continue;

        // 1. Standard Gamepad API vibrationActuator (W3C dual-rumble standard)
        if (gp.vibrationActuator && typeof (gp.vibrationActuator as any).playEffect === 'function') {
          triggered = true;
          (gp.vibrationActuator as any).playEffect('dual-rumble', {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
            strongMagnitude: Math.max(0, Math.min(1, strongMagnitude))
          }).catch(() => {});
        }
        // 2. Legacy / Firefox hapticActuators fallback
        else if ((gp as any).hapticActuators && (gp as any).hapticActuators.length > 0) {
          triggered = true;
          try {
            (gp as any).hapticActuators[0].pulse(strongMagnitude, durationMs);
          } catch {}
        }
      }

      if (triggered) {
        this.isRumbling = true;
        setTimeout(() => {
          this.isRumbling = false;
        }, durationMs);
      }
    } catch {
      // Gamepad vibration not permitted or disconnected
    }
  }

  /**
   * Preset Haptic Textures
   */
  public trigger(texture: HapticTexture) {
    if (!this.enabled) return;

    switch (texture) {
      case 'light-tick':
        // Crisp 25ms micro-tap for D-Pad moves or button hover
        this.vibrate(28, 0.25, 0.05);
        break;

      case 'confirm':
        // Double pulse confirmation burst
        this.vibrate(60, 0.4, 0.5);
        setTimeout(() => this.vibrate(90, 0.6, 0.7), 90);
        break;

      case 'back':
        // Descending double tick
        this.vibrate(40, 0.3, 0.2);
        break;

      case 'analog-thud':
        // Deep textured mechanical thud (heavy wood / vintage collector plastic)
        this.vibrate(95, 0.15, 0.65);
        break;

      case 'digital-buzz':
        // High-frequency cybernetic electric tick
        this.vibrate(60, 0.7, 0.1);
        break;

      case 'cosmic-wave':
        // Deep swelling gravitational sub-bass wave
        this.vibrate(140, 0.35, 0.45);
        break;

      case 'cartridge-clunk':
        // Heavy tactile cartridge insertion seat
        this.vibrate(120, 0.3, 0.8);
        break;

      case 'blow-dust-ripple':
        // Fluttering wind gust ripple across motors
        this.vibrate(45, 0.35, 0.1);
        setTimeout(() => this.vibrate(60, 0.5, 0.15), 55);
        setTimeout(() => this.vibrate(80, 0.3, 0.08), 125);
        break;

      case 'warning':
        this.vibrate(80, 0.5, 0.8);
        setTimeout(() => this.vibrate(120, 0.7, 0.9), 110);
        break;
    }
  }
}

export const hapticsService = new HapticsService();
