import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../core/auth.store';

export const superuserGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.user()?.is_superuser) {
    return true;
  }

  return router.parseUrl('/');
};
