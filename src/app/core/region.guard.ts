import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RegionService } from './region.service';

export const regionGuard: CanActivateFn = (route, state) => {
  const regionService = inject(RegionService);
  const router = inject(Router);
  const regionParam = route.paramMap.get('region');
  
  if (!regionParam) return true;

  const code = regionParam.toLowerCase();
  const regs = regionService.regions();
  
  // if regions not loaded yet, just let it pass and service will handle?
  // no, regions is fetched in constructor, but it might be async.
  // Assuming we have basic known regions or allow anything for now, 
  // then RegionService enforces.
  // Actually, we can just enforce 'tw' or 'hk' or what is in regions().
  
  if (regs.length > 0) {
    if (!regs.some(r => r.code.toLowerCase() === code)) {
      const fallback = regs[0].code.toLowerCase();
      const newUrl = state.url.replace(`/${regionParam}`, `/${fallback}`);
      return router.parseUrl(newUrl);
    }
  } else {
    if (code !== 'tw' && code !== 'hk') {
       const newUrl = state.url.replace(`/${regionParam}`, `/tw`);
       return router.parseUrl(newUrl);
    }
  }
  
  // Also notify RegionService of current region in URL so they stay in sync
  if (regionService.region() !== code) {
    regionService.setRegion(code, true);
  }
  
  return true;
};

export const rootRedirectGuard: CanActivateFn = (route, state) => {
  const regionService = inject(RegionService);
  const router = inject(Router);
  
  const code = regionService.region() || 'tw';

  // state.url is "/" at the root, and naive concatenation turned that into
  // "/tw/" — a trailing slash that matches no route, so the site's own entry
  // point 404'd. Strip it before prefixing; "/search" and friends are
  // unaffected.
  const rest = state.url === '/' ? '' : state.url;
  return router.parseUrl(`/${code}${rest}`);
};
