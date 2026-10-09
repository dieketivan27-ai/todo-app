import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, map, throwError } from 'rxjs';

export interface OcrGoalData {
  title: string;
  description?: string;
  category: string;
  annual_target: number;
  color: string;
  actions: string[];
}

export interface OcrResult {
  goals: OcrGoalData[];
  documentType: string;
  year: number;
  rawText: string;
}

export interface OcrTaskResponse {
  success: boolean;
  taskId: string;
  status: 'pending';
}

export interface OcrStatusResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  data?: OcrResult;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private readonly baseUrl = '/api/ocr';
  /** Poll interval in ms */
  private readonly POLL_INTERVAL = 3000;
  /** Max total polling duration (2.5 min) */
  private readonly MAX_POLL_MS = 150000;

  constructor(private http: HttpClient) {}

  /**
   * Step 1: submit the image and get a taskId immediately.
   */
  submitDocument(file: File): Observable<OcrTaskResponse> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<OcrTaskResponse>(`${this.baseUrl}/analyze`, formData);
  }

  /**
   * Step 2: poll /status/:taskId every POLL_INTERVAL ms until completed or failed.
   * Emits the final OcrResult on success, throws on failure or timeout.
   */
  pollStatus(taskId: string): Observable<OcrResult> {
    const startTime = Date.now();

    return timer(0, this.POLL_INTERVAL).pipe(
      switchMap(() => this.http.get<OcrStatusResponse>(`${this.baseUrl}/status/${taskId}`, {
        headers: { 'X-Background-Request': 'true' }
      })),
      // Stop polling once we have a terminal state OR we've exceeded max time
      takeWhile((res, index) => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= this.MAX_POLL_MS) {
          throw new Error('Le traitement a pris trop de temps (2,5 minutes). Réessayez avec une image plus légère.');
        }
        return res.status === 'pending';
      }, true /* emit the last value that caused takeWhile to stop */),
      // Map terminal responses to result or error
      switchMap(res => {
        if (res.status === 'completed' && res.data) {
          return [res.data];
        }
        if (res.status === 'failed') {
          return throwError(() => new Error(res.message || 'Analyse échouée.'));
        }
        // Still pending — switchMap returns nothing meaningful; timer will re-emit
        return [null as any];
      }),
      // Filter out the null intermediate emissions
      takeWhile(v => v !== null),
    );
  }
}
