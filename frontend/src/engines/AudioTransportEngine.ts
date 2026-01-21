import { ErrorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler';
import { PerformanceMonitor, PerformanceCategory } from '../utils/PerformanceMonitor';
import { VisualAdaptiveManager } from '../utils/VisualAdaptiveManager';
import { ReactiveBloom } from '../utils/ReactiveBloom';

export class AudioTransportEngine {
  private context: AudioContext;
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private analyser: AnalyserNode;
  
  private startTime = 0;
  private offset = 0;
  private isPlaying = false;
  private fadeTime = 0.01; // 10ms fade
  
  // Visual Support
  private bloom: ReactiveBloom;
  private adaptiveManager: VisualAdaptiveManager;
  private rmsData = new Float32Array(1024);

  // Looping
  private loopStart = 0;
  private loopEnd = 0;
  private isLooping = false;
  private readonly loopEpsilon = 0.001; // 1ms epsilon

  // Sync Bridge
  private animationId: number | null = null;
  private tickListeners: Set<(time: number) => void> = new Set();
  private heavySeekListeners: Set<(time: number, signal: AbortSignal) => void> = new Set();
  private syncBuffer: SharedArrayBuffer | null = null;

  // Throttling
  private seekThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHeavySeekTime = 0;
  private readonly HEAVY_SEEK_THROTTLE_MS = 100;
  private abortController: AbortController | null = null;

  // Sync Bridge Properties
  private syncView: Float32Array | null = null;
  private useSAB: boolean = false;
  private messageChannel: MessageChannel | null = null;

  constructor(context: AudioContext) {
    this.context = context;
    this.gainNode = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    
    this.bloom = new ReactiveBloom();
    this.adaptiveManager = VisualAdaptiveManager.getInstance();
    
    this.setupSyncBridge();
    this.setupContextListeners();
  }

  public onTick(callback: (time: number) => void): () => void {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  public onHeavySeek(callback: (time: number, signal: AbortSignal) => void): () => void {
    this.heavySeekListeners.add(callback);
    return () => this.heavySeekListeners.delete(callback);
  }

  private setupSyncBridge(): void {
    if (typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated) {
      this.syncBuffer = new SharedArrayBuffer(4); // 4 bytes for one float32
      this.syncView = new Float32Array(this.syncBuffer);
      this.useSAB = true;
      console.log('🔗 Transport: Sync bridge using SharedArrayBuffer');
    } else {
      this.messageChannel = new MessageChannel();
      this.useSAB = false;
      console.log('🔗 Transport: Sync bridge using MessageChannel (fallback)');
    }
  }

  private setupContextListeners(): void {
    this.context.onstatechange = () => {
      console.log(`🔌 Transport: Context state changed to ${this.context.state}`);
      if (this.context.state === 'running' && this.isPlaying) {
        this.startSyncLoop();
      }
    };
  }

  public getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  public getOutputNode(): AudioNode {
    return this.gainNode;
  }

  public getSyncBridge(): { type: 'sab'; buffer: SharedArrayBuffer } | { type: 'channel'; port: MessagePort } {
    if (this.useSAB && this.syncBuffer) {
      return { type: 'sab', buffer: this.syncBuffer };
    }
    return { type: 'channel', port: this.messageChannel!.port2 };
  }

  public setBuffer(buffer: AudioBuffer): void {
    this.stopImmediate();
    this.buffer = buffer;
    this.offset = 0;
    console.log(`🎵 Transport: Buffer set. Duration: ${buffer.duration.toFixed(2)}s, SR: ${buffer.sampleRate}Hz`);
  }

  public play(offset?: number): void {
    if (!this.buffer) {
      console.warn('⚠️ Transport: Cannot play - no buffer set');
      return;
    }

    try {
      if (this.isPlaying) {
        this.stopImmediate();
      }

      if (offset !== undefined) {
        this.offset = Math.max(0, Math.min(offset, this.buffer.duration));
      }

      this.sourceNode = this.context.createBufferSource();
      this.sourceNode.buffer = this.buffer;
      this.sourceNode.connect(this.gainNode);

      // Handle loop end completion
      this.sourceNode.onended = () => {
        if (this.sourceNode) {
          this.isPlaying = false;
          this.sourceNode = null;
          this.stopSyncLoop();
        }
      };

      // Fade in to prevent clicks
      this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1, this.context.currentTime + this.fadeTime);

      this.startTime = this.context.currentTime - this.offset;
      this.sourceNode.start(0, this.offset);
      this.isPlaying = true;
      
      this.startSyncLoop();
      console.log(`▶️ Transport: Playing from ${this.offset.toFixed(2)}s`);
    } catch (error) {
      ErrorHandler.handleError({
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to start audio playback',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: {
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: 'session-' + Date.now(), // Fallback
          component: 'AudioTransportEngine',
          action: 'play'
        },
        recoverable: true,
        suggestions: ['Refresh the page', 'Check audio device']
      });
    }
  }

  public setLoop(start: number, end: number): void {
    this.loopStart = Math.max(0, start);
    this.loopEnd = Math.min(end, this.getDuration());
    console.log(`🔁 Transport: Loop set [${this.loopStart.toFixed(2)}s - ${this.loopEnd.toFixed(2)}s]`);
  }

  public setLooping(enabled: boolean): void {
    this.isLooping = enabled;
    console.log(`🔁 Transport: Looping ${enabled ? 'enabled' : 'disabled'}`);
  }

  private startSyncLoop = () => {
    if (this.animationId !== null) return;
    
    const loop = () => {
      const frameStart = performance.now();
      
      if (!this.isPlaying) {
        this.animationId = null;
        return;
      }

      const currentTime = this.getCurrentTime();

      // Check loop boundary
      if (this.isLooping && currentTime >= this.loopEnd - this.loopEpsilon) {
        console.log('🔁 Transport: Loop boundary reached, restarting...');
        this.play(this.loopStart);
        return;
      }
      
      // Update bridge
      if (this.useSAB && this.syncView) {
        this.syncView[0] = currentTime;
      } else if (this.messageChannel) {
        this.messageChannel.port1.postMessage({ type: 'SYNC_TIME', time: currentTime });
      }

      performance.mark('transport-tick-start');
      this.tickListeners.forEach(listener => {
        try {
          listener(currentTime);
        } catch (e) {
          console.error('⚠️ Transport: Tick listener error:', e);
        }
      });
      performance.mark('transport-tick-end');
      performance.measure('transport-tick', 'transport-tick-start', 'transport-tick-end');
      
      const measure = performance.getEntriesByName('transport-tick').pop();
      if (measure && measure.duration > 3) {
        console.warn(`⚠️ Transport: Main-thread budget violated! Tick took ${measure.duration.toFixed(2)}ms`);
      }

      // Update Adaptive Visuals
      this.analyser.getFloatTimeDomainData(this.rmsData);
      let sum = 0;
      let maxAbs = 0;
      for (let i = 0; i < this.rmsData.length; i++) {
        const absVal = Math.abs(this.rmsData[i]);
        sum += absVal * absVal;
        if (absVal > maxAbs) maxAbs = absVal;
      }
      const rms = Math.sqrt(sum / this.rmsData.length);
      this.bloom.update(rms);
      
      // Peak detection (> -3dB = 0.707)
      this.adaptiveManager.reportPeak(maxAbs > 0.707);

      const frameDuration = performance.now() - frameStart;
      this.adaptiveManager.reportFrameDuration(frameDuration);

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  };

  private stopSyncLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.offset = this.getCurrentTime();
    this.stop();
    console.log(`⏸️ Transport: Paused at ${this.offset.toFixed(2)}s`);
  }

  public stop(): void {
    this.stopSyncLoop();
    if (this.sourceNode) {
      try {
        const nodeToStop = this.sourceNode;
        this.sourceNode = null;

        // Fade out to prevent clicks
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.context.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + this.fadeTime);
        
        // Wait for fade to complete before stopping the node
        setTimeout(() => {
          try {
            nodeToStop.stop();
            nodeToStop.disconnect();
          } catch (e) {
            // Node might have already stopped
          }
        }, this.fadeTime * 1000 + 5);
      } catch (e) {
        console.warn('⚠️ Transport: Error during stop:', e);
      }
    }
    this.isPlaying = false;
  }

  /**
   * Stops immediately without fade, used when re-scheduling quickly
   */
  private stopImmediate(): void {
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        console.warn('⚠️ Transport: Stop immediate failed (likely already stopped)', e);
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  public seek(time: number): void {
    const wasPlaying = this.isPlaying;
    this.stopImmediate();
    this.offset = Math.max(0, Math.min(time, this.getDuration()));
    
    // Light Path: Immediate UI feedback
    this.tickListeners.forEach(listener => listener(this.offset));

    // Heavy Path: Throttled worker reset
    const now = performance.now();
    if (now - this.lastHeavySeekTime >= this.HEAVY_SEEK_THROTTLE_MS) {
      this.triggerHeavySeek(this.offset);
      this.lastHeavySeekTime = now;
    }

    // Settle Debounce: Ensure final position is captured
    if (this.seekThrottleTimer) clearTimeout(this.seekThrottleTimer);
    this.seekThrottleTimer = setTimeout(() => {
      this.triggerHeavySeek(this.offset);
    }, this.HEAVY_SEEK_THROTTLE_MS);

    if (wasPlaying) {
      this.play(this.offset);
    }
    console.log(`🔍 Transport: Seeked to ${this.offset.toFixed(2)}s`);
  }

  private triggerHeavySeek(time: number): void {
    // Abort previous if pending
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const signal = this.abortController.signal;
    
    performance.mark('heavy-seek-start');
    this.heavySeekListeners.forEach(listener => {
      try {
        listener(time, signal);
      } catch (e) {
        console.error('⚠️ Transport: Heavy seek listener error:', e);
      }
    });
    performance.mark('heavy-seek-end');
    performance.measure('heavy-seek', 'heavy-seek-start', 'heavy-seek-end');
  }

  public getCurrentTime(): number {
    if (!this.isPlaying) return this.offset;
    const time = this.context.currentTime - this.startTime;
    // Wrap around if it exceeds duration (though onended should catch it)
    return Math.min(time, this.getDuration());
  }

  public getDuration(): number {
    return this.buffer?.duration || 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
