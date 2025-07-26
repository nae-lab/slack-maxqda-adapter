import { ProgressUpdate, ProgressCallback } from "./types";

/**
 * Progress Manager Class
 * 
 * Manages export progress to ensure:
 * - Progress never goes backwards
 * - Consistent stage transitions
 * - Proper progress calculation for different phases
 */
export class ProgressManager {
  private currentProgress: number = 0;
  private currentStage: ProgressUpdate['stage'] = 'fetching';
  private onProgress?: ProgressCallback;
  
  // Progress ranges for each stage
  private readonly stageRanges = {
    fetching: { start: 0, end: 10 },      // 10% weight
    processing: { start: 10, end: 30 },   // 20% weight  
    downloading: { start: 30, end: 80 },  // 50% weight
    writing: { start: 80, end: 90 },      // 10% weight
    complete: { start: 100, end: 100 }    // Final
  };

  constructor(onProgress?: ProgressCallback) {
    this.onProgress = onProgress;
  }

  /**
   * Report progress for a specific stage
   */
  reportProgress(
    stage: ProgressUpdate['stage'],
    stageProgress: number, // 0-100 within the stage
    message: string,
    current?: number,
    total?: number,
    details?: ProgressUpdate['details']
  ) {
    const range = this.stageRanges[stage];
    let calculatedProgress: number;

    if (stage === 'complete') {
      calculatedProgress = 100;
    } else {
      // Calculate progress within the stage range
      const normalizedStageProgress = Math.max(0, Math.min(100, stageProgress));
      calculatedProgress = range.start + (normalizedStageProgress / 100) * (range.end - range.start);
    }

    // Ensure progress never goes backwards
    if (calculatedProgress < this.currentProgress && stage !== 'complete') {
      console.log(`Progress manager: Preventing regression from ${this.currentProgress}% to ${calculatedProgress}% (stage: ${stage})`);
      calculatedProgress = this.currentProgress;
    }

    // Update current state
    this.currentProgress = calculatedProgress;
    this.currentStage = stage;

    // Send progress update
    if (this.onProgress) {
      this.onProgress({
        stage,
        progress: Math.round(calculatedProgress),
        message,
        current,
        total,
        details
      });
    }
  }

  /**
   * Report file download progress
   */
  reportFileDownloadProgress(
    currentFile: number,
    totalFiles: number,
    fileName?: string
  ) {
    if (totalFiles === 0) return;

    const stageProgress = (currentFile / totalFiles) * 100;
    const filesCompleted = currentFile;
    
    this.reportProgress(
      'downloading',
      stageProgress,
      `Downloading file ${currentFile + 1}/${totalFiles}`,
      currentFile,
      totalFiles,
      {
        currentFile: fileName,
        filesCompleted,
        totalFiles
      }
    );
  }

  /**
   * Get current progress
   */
  getCurrentProgress(): number {
    return this.currentProgress;
  }

  /**
   * Get current stage
   */
  getCurrentStage(): ProgressUpdate['stage'] {
    return this.currentStage;
  }

  /**
   * Reset progress
   */
  reset() {
    this.currentProgress = 0;
    this.currentStage = 'fetching';
  }
}