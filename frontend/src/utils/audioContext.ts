let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    sharedContext = new AudioContextCtor();
  }
  return sharedContext;
}

export async function resumeAudioContext(): Promise<void> {
  const context = getAudioContext();
  if (context.state === 'suspended') {
    await context.resume();
  }
}
