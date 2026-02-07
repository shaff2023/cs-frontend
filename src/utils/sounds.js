// Sound utility for chat notifications
class SoundManager {
  constructor() {
    this.sendSound = null;
    this.receiveSound = null;
    this.volume = 0.5; // Default volume (0-1)
    this.enabled = true;
    this.initSounds();
  }

  initSounds() {
    // Create send sound (short beep)
    this.sendSound = this.createBeepSound(800, 0.1); // 800Hz, 0.1s
    
    // Create receive sound (notification sound)
    this.receiveSound = this.createBeepSound(600, 0.2); // 600Hz, 0.2s
  }

  createBeepSound(frequency, duration) {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };
  }

  playSendSound() {
    if (this.sendSound) {
      this.sendSound();
    }
  }

  playReceiveSound() {
    if (this.receiveSound) {
      this.receiveSound();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
