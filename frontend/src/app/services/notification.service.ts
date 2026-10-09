import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = '/api/notifications';

  getAll(): Observable<{ success: boolean; data: Notification[] }> {
    return this.http.get<{ success: boolean; data: Notification[] }>(this.baseUrl, {
      headers: { 'X-Background-Request': 'true' }
    });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/read`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
