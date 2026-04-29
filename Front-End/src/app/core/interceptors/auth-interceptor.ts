import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { GlobalErrorHandler } from '../services/error-handler';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(GlobalErrorHandler);
  const router = inject(Router);
  const token = localStorage.getItem('authToken');
  const isAuthRequest = /\/auth\/(login|register|verify-email|forgot-password|reset-password)/.test(
    req.url
  );

  const request = token
    ? req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !isAuthRequest) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          router.navigate(['/login']);
          errorHandler.handleHttpError(error);
        } else if (error.status !== 401 || !isAuthRequest) {
          errorHandler.handleHttpError(error);
        }
      } else {
        errorHandler.handleError(error);
      }

      return throwError(() => error);
    })
  );
};
