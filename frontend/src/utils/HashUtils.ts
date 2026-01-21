/**
 * HashUtils.ts
 * 
 * Provides fast, robust file hashing for deduplication.
 * Uses Web Crypto API (SHA-256) on the first 1MB of the file + metadata
 * to avoid reading the entire file for large audio tracks.
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB

export const HashUtils = {
  /**
   * Calculates a unique fingerprint for a file.
   * Combination of: SHA-256(First 1MB) + File Size + File Name.
   */
  async computeFingerprint(file: File): Promise<string> {
    const chunk = file.slice(0, CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    
    // Hash the first chunk
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const chunkHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Combine with size and name to ensure uniqueness even if first 1MB is silence/identical
    // (Unlikely for audio, but safe)
    const fingerprint = `${chunkHash}-${file.size}-${file.name}`;
    
    return fingerprint;
  }
};
