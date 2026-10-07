import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WeekPlanning } from '../models/task.model';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly baseUrl = '/api/planning';

  constructor(private http: HttpClient) {}

  getWeek(date?: string): Observable<WeekPlanning> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ApiResponse<WeekPlanning>>(`${this.baseUrl}/week`, { params })
      .pipe(map(r => r.data));
  }
}
