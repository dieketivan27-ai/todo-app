import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Goal, GoalCreate, GoalDashboard, GoalStep, Task, ActionVariableCreate } from '../models/task.model';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly baseUrl = '/api/goals';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Goal[]> {
    return this.http.get<ApiResponse<Goal[]>>(this.baseUrl)
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Goal> {
    return this.http.get<ApiResponse<Goal>>(`${this.baseUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(goal: GoalCreate): Observable<Goal> {
    return this.http.post<ApiResponse<Goal>>(this.baseUrl, goal)
      .pipe(map(r => r.data));
  }

  update(id: number, goal: Partial<GoalCreate>): Observable<Goal> {
    return this.http.put<ApiResponse<Goal>>(`${this.baseUrl}/${id}`, goal)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getDashboard(year?: number): Observable<GoalDashboard> {
    const params = year ? `?year=${year}` : '';
    return this.http.get<ApiResponse<GoalDashboard>>(`${this.baseUrl}/dashboard${params}`)
      .pipe(map(r => r.data));
  }

  getSteps(id: number): Observable<GoalStep[]> {
    return this.http.get<ApiResponse<GoalStep[]>>(`${this.baseUrl}/${id}/steps`)
      .pipe(map(r => r.data));
  }

  getActionVariables(goalId: number): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.baseUrl}/${goalId}/action-variables`)
      .pipe(map(r => r.data));
  }

  createActionVariable(goalId: number, payload: ActionVariableCreate): Observable<Task> {
    return this.http.post<ApiResponse<Task>>(`${this.baseUrl}/${goalId}/action-variables`, payload)
      .pipe(map(r => r.data));
  }

  deleteActionVariable(goalId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${goalId}/action-variables/${taskId}`);
  }
}
