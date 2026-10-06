import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(undefined);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.checkAuth();
  }

  checkAuth(): void {
    this.http.get(`${this.baseUrl}/me`).subscribe({
      next: (response: any) => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        } else {
          this.currentUserSubject.next(null);
        }
      },
      error: () => this.currentUserSubject.next(null)
    });
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData).pipe(
      tap((response: any) => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout() {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
      next: () => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }
    });
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null && this.currentUserSubject.value !== undefined;
  }

  isLoading(): boolean {
    return this.currentUserSubject.value === undefined;
  }
}
