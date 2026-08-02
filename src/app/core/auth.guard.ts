import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/account'], { queryParams: { returnUrl: state.url } });
};

export const accountIndexGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  
  if (auth.isLoggedIn()) {
    return router.parseUrl('/account/listings');
  }
  
  return true;
};
