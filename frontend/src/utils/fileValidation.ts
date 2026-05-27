export async function validateMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer);
      if (arr.length === 0) return resolve(true);
      if (arr.length < 4) {
        resolve(false);
        return;
      }

      // MP3: ID3 tag
      if (arr[0] === 0x49 && arr[1] === 0x44 && arr[2] === 0x33) return resolve(true);
      // MP3/AAC: Frame sync (0xFF followed by 3 bits set, e.g. 0xFB, 0xF3, 0xF1)
      if (arr[0] === 0xFF && (arr[1] & 0xE0) === 0xE0) return resolve(true);

      // WAV: RIFF
      if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) return resolve(true);

      // FLAC: fLaC
      if (arr[0] === 0x66 && arr[1] === 0x4C && arr[2] === 0x61 && arr[3] === 0x43) return resolve(true);

      // OGG: OggS
      if (arr[0] === 0x4F && arr[1] === 0x67 && arr[2] === 0x67 && arr[3] === 0x53) return resolve(true);

      // AIFF: FORM
      if (arr[0] === 0x46 && arr[1] === 0x4F && arr[2] === 0x52 && arr[3] === 0x4D) return resolve(true);

      // WebM: 1A 45 DF A3
      if (arr[0] === 0x1A && arr[1] === 0x45 && arr[2] === 0xDF && arr[3] === 0xA3) return resolve(true);

      // MP4/M4A: ftyp at offset 4
      if (arr.length >= 8 && arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) return resolve(true);

      resolve(false);
    };
    reader.onerror = () => {
      resolve(false);
    };
    // Read the first 12 bytes
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}
