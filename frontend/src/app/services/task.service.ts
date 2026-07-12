import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task, TaskCreate, TaskUpdate, TaskStats, TaskFilters } from '../models/task.model';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = '/api/tasks';

  constructor(private http: HttpClient) {}

  getAll(filters?: Partial<TaskFilters>): Observable<Task[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== '') params = params.set(k, v);
      });
    }
    return this.http.get<ApiResponse<Task[]>>(this.baseUrl, { params })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Task> {
    return this.http.get<ApiResponse<Task>>(`${this.baseUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(task: TaskCreate): Observable<Task> {
    return this.http.post<ApiResponse<Task>>(this.baseUrl, task)
      .pipe(map(r => r.data));
  }

  update(id: number, task: TaskUpdate): Observable<Task> {
    return this.http.put<ApiResponse<Task>>(`${this.baseUrl}/${id}`, task)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  markDone(id: number): Observable<Task> {
    return this.http.patch<ApiResponse<Task>>(`${this.baseUrl}/${id}/done`, {})
      .pipe(map(r => r.data));
  }

  markInProgress(id: number): Observable<Task> {
    return this.http.patch<ApiResponse<Task>>(`${this.baseUrl}/${id}/progress`, {})
      .pipe(map(r => r.data));
  }

  getStats(): Observable<TaskStats> {
    return this.http.get<ApiResponse<TaskStats>>(`${this.baseUrl}/stats`)
      .pipe(map(r => r.data));
  }
}
