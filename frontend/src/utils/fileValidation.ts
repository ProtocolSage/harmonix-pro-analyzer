/**
 * Validates the magic bytes (file signature) of a file to ensure it matches
 * expected audio formats, preventing MIME type spoofing (e.g., EXE renamed to MP3).
 *
 * @param file The File object to validate
 * @returns Promise resolving to true if the magic bytes are valid for an audio file, false otherwise
 */
export const validateMagicBytes = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    // Empty files are handled gracefully by the backend
    if (file.size === 0) {
      resolve(true);
      return;
    }

    const reader = new FileReader();

    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) {
        // If we can't read the file, fail safe
        resolve(false);
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer);

      // MP3: ID3 (49 44 33) or 0xFF 0xFB/0xFA/0xF3/0xF2
      if (arr.length >= 3 && arr[0] === 0x49 && arr[1] === 0x44 && arr[2] === 0x33) {
        resolve(true);
        return;
      }
      if (arr.length >= 2 && arr[0] === 0xFF && (arr[1] === 0xFB || arr[1] === 0xFA || arr[1] === 0xF3 || arr[1] === 0xF2)) {
        resolve(true);
        return;
      }

      // WAV: RIFF....WAVE
      if (arr.length >= 12 &&
          arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && // RIFF
          arr[8] === 0x57 && arr[9] === 0x41 && arr[10] === 0x56 && arr[11] === 0x45) { // WAVE
        resolve(true);
        return;
      }

      // FLAC: fLaC (66 4C 61 43)
      if (arr.length >= 4 && arr[0] === 0x66 && arr[1] === 0x4C && arr[2] === 0x61 && arr[3] === 0x43) {
        resolve(true);
        return;
      }

      // OGG: OggS (4F 67 67 53)
      if (arr.length >= 4 && arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67 && arr[3] === 0x53) {
        resolve(true);
        return;
      }

      // M4A/MP4/AAC: ....ftypM4A (ftyp = 66 74 79 70)
      if (arr.length >= 8 && arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
        resolve(true);
        return;
      }

      // AIFF: FORM....AIFF (FORM = 46 4F 52 4D, AIFF = 41 49 46 46)
      if (arr.length >= 12 &&
          arr[0] === 0x46 && arr[1] === 0x4F && arr[2] === 0x52 && arr[3] === 0x4D && // FORM
          arr[8] === 0x41 && arr[9] === 0x49 && arr[10] === 0x46 && arr[11] === 0x46) { // AIFF
        resolve(true);
        return;
      }

      // WebM: 1A 45 DF A3
      if (arr.length >= 4 && arr[0] === 0x1A && arr[1] === 0x45 && arr[2] === 0xDF && arr[3] === 0xA3) {
        resolve(true);
        return;
      }

      // Not a recognized audio format
      resolve(false);
    };

    reader.onerror = () => {
      resolve(false);
    };

    // Read the first 12 bytes
    const blob = file.slice(0, 12);
    reader.readAsArrayBuffer(blob);
  });
};
