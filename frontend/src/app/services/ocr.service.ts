import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GoalCreate } from '../models/task.model';

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private readonly baseUrl = '/api/ocr';

  constructor(private http: HttpClient) {}

  analyzeDocument(file: File): Observable<OcrResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ApiResponse<OcrResult>>(`${this.baseUrl}/analyze`, formData)
      .pipe(map(r => r.data));
  }
}
