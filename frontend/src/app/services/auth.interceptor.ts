import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IdleService } from './idle.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private idleService = inject(IdleService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    request = request.clone({
      withCredentials: true
    });
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/api/auth/login')) {
          this.idleService.performLogout(false);
        }
        return throwError(() => error);
      })
    );
  }
}

