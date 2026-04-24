"use client";

const BUZZER_STORAGE_KEY = "nakshatra_buzzer_enabled";

class AudioController {
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;
  private buzzerEnabled = true;

  constructor() {
    // Read persisted preference on init (safe for SSR — only runs client-side)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(BUZZER_STORAGE_KEY);
      // Default true if not set; false only if explicitly disabled
      this.buzzerEnabled = stored !== "false";
    }
  }

  private init() {
    if (typeof window === "undefined") return;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public unlock() {
    this.init();
    if (!this.audioContext || this.isUnlocked) return;

    // Create a silent buffer to unlock the audio context on iOS / Chrome
    const buffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.isUnlocked = true;
  }

  public getBuzzerEnabled(): boolean {
    return this.buzzerEnabled;
  }

  public setBuzzerEnabled(enabled: boolean) {
    this.buzzerEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem(BUZZER_STORAGE_KEY, String(enabled));
    }
  }

  /**
   * Play the arrival notification buzz.
   *
   * Default pattern produces a clean 2-second chime:
   *   - Two short pulses (200ms each) followed by one long confirmation tone (1400ms)
   *   - Total: 200 + 100 + 200 + 100 + 1400 = 2000ms
   *
   * Volume is at 0.15 gain (50% quieter than original 0.30).
   *
   * @param pattern  Array of [buzz, gap, buzz, gap, ...] durations in milliseconds.
   *                 Even indices = buzz, odd indices = silence.
   */
  public playBuzz(pattern = [200, 100, 200, 100, 1400]) {
    if (!this.buzzerEnabled) return;

    this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    let startTime = this.audioContext.currentTime;

    pattern.forEach((duration, index) => {
      const isBuzz = index % 2 === 0;
      if (isBuzz) {
        const osc = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        // Warm, phone-notification-like tone
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, startTime);             // A4 — universally pleasant
        osc.frequency.linearRampToValueAtTime(660, startTime + 0.05); // Quick upward sweep
        osc.frequency.linearRampToValueAtTime(440, startTime + duration / 1000);

        // Gain envelope: fast attack, sustained, smooth fade
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.03); // 50% quieter than original
        gainNode.gain.setValueAtTime(0.15, startTime + (duration / 1000) - 0.08);
        gainNode.gain.linearRampToValueAtTime(0, startTime + (duration / 1000));

        osc.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        osc.start(startTime);
        osc.stop(startTime + duration / 1000);
      }
      startTime += duration / 1000;
    });
  }
}

export const buzzController = new AudioController();
