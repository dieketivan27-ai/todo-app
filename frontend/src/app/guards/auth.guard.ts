import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    // Attendre que le statut ne soit plus "undefined" (chargement en cours)
    filter(user => user !== undefined),
    take(1),
    map(user => {
      if (user !== null) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
