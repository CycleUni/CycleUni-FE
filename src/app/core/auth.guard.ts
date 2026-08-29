import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { RegionService } from './region.service';
import { regionUrlTree } from './region-path';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const regionService = inject(RegionService);

  if (auth.isLoggedIn()) {
    return true;
  }

  return regionUrlTree(router, regionService, ['/account'], { queryParams: { returnUrl: state.url } });
};

export const accountIndexGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const regionService = inject(RegionService);
  
  if (auth.isLoggedIn()) {
    return regionUrlTree(router, regionService, ['/account', 'listings']);
  }
  
  return true;
};
