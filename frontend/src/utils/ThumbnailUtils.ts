export const ThumbnailUtils = {
  /**
   * Generates a 200x60 PNG blob representing the audio waveform.
   * Efficiently downsamples the buffer.
   */
  async generateWaveformThumbnail(audioBuffer: AudioBuffer, width = 200, height = 60, color = '#60a5fa'): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Draw Background
    ctx.fillStyle = '#0f172a'; // Slate-900 (matches theme)
    ctx.fillRect(0, 0, width, height);

    const channelData = audioBuffer.getChannelData(0); // Use mono
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      // Get min/max for this chunk (visual integration)
      for (let j = 0; j < step; j++) {
        const datum = channelData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }
};
