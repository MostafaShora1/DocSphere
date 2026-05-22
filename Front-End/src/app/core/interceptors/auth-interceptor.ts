import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const token = localStorage.getItem('authToken');
  const lang = localStorage.getItem('lang') || 'en';

  const isAuthRequest = /\/auth\/(login|register|verify-email|forgot-password|reset-password)/.test(
    req.url
  );

  // 🌍 Headers
  let headers = req.headers.set('Accept-Language', lang);

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const request = req.clone({ headers });

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {

        // 🔐 Unauthorized
        if (error.status === 401 && !isAuthRequest) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          router.navigate(['/login']);
        }

        // 🧾 Logging فقط (بدون GlobalErrorHandler)
        console.error('HTTP Error:', {
          status: error.status,
          message: error.message,
          url: error.url
        });

      } else {
        console.error('Unexpected Error:', error);
      }

      return throwError(() => error);
    })
  );
};