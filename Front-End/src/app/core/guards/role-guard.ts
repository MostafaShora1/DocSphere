import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const requiredRole = route.data?.['role'];

  if (user && user.role === requiredRole) {
    return true;
  } else {
    router.navigate(['/auth/login']);
    return false;
  }
};
