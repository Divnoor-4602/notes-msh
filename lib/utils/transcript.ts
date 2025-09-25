export interface TranscriptChunk {
  text: string;
  timestamp: number;
}

export class TranscriptAccumulator {
  private chunks: TranscriptChunk[] = [];
  private maxChunks: number;
  private maxAgeMs: number;

  constructor(maxChunks: number = 10, maxAgeMs: number = 30000) {
    this.maxChunks = maxChunks;
    this.maxAgeMs = maxAgeMs;
  }

  /**
   * Add a new transcript chunk
   */
  addChunk(text: string, timestamp: number = Date.now()): void {
    if (!text.trim()) return;

    this.chunks.push({ text: text.trim(), timestamp });
    this.cleanup();
  }

  /**
   * Get the current chunk (most recent)
   */
  getCurrentChunk(): string {
    return this.chunks[this.chunks.length - 1]?.text || "";
  }

  /**
   * Get recent context (previous chunks, excluding current)
   */
  getRecentContext(): string {
    if (this.chunks.length <= 1) return "";

    const recentChunks = this.chunks.slice(0, -1);
    return recentChunks.map((chunk) => chunk.text).join(" ");
  }

  /**
   * Get all chunks as a single string
   */
  getAllText(): string {
    return this.chunks.map((chunk) => chunk.text).join(" ");
  }

  /**
   * Clear all accumulated transcripts
   */
  clear(): void {
    this.chunks = [];
  }

  /**
   * Get the number of chunks
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Clean up old chunks based on age and count limits
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove chunks older than maxAgeMs
    this.chunks = this.chunks.filter(
      (chunk) => now - chunk.timestamp <= this.maxAgeMs
    );

    // Keep only the most recent maxChunks
    if (this.chunks.length > this.maxChunks) {
      this.chunks = this.chunks.slice(-this.maxChunks);
    }
  }

  /**
   * Get debug info about the accumulator state
   */
  getDebugInfo(): {
    chunkCount: number;
    totalTextLength: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    return {
      chunkCount: this.chunks.length,
      totalTextLength: this.getAllText().length,
      oldestTimestamp: this.chunks[0]?.timestamp || null,
      newestTimestamp: this.chunks[this.chunks.length - 1]?.timestamp || null,
    };
  }
}
