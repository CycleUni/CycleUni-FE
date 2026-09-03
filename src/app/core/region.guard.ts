import { inject } from '@angular/core';
import { CanActivateFn, PRIMARY_OUTLET, Router, UrlSegment, UrlTree } from '@angular/router';
import { RegionService } from './region.service';

/**
 * Swap the leading path segment, keeping everything else byte-identical.
 *
 * This used to be `state.url.replace('/' + regionParam, '/' + fallback)`, which
 * compares a *decoded* route parameter against an *encoded* URL string. They
 * differ for any segment that needed escaping — `/a%20b/search` yields the
 * parameter `a b`, which does not occur in the URL — so the replace found
 * nothing, the guard returned the URL it was given, and navigating to it ran
 * the guard again: a redirect loop rather than a fallback.
 *
 * Editing the parsed tree sidesteps the comparison entirely, and carries query
 * parameters, matrix parameters and the fragment across untouched.
 */
function withRegion(router: Router, url: string, region: string): UrlTree {
  const tree = router.parseUrl(url);
  const primary = tree.root.children[PRIMARY_OUTLET];
  if (!primary || primary.segments.length === 0) {
    return router.parseUrl(`/${region}`);
  }
  primary.segments[0] = new UrlSegment(region, primary.segments[0].parameters);
  return tree;
}

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
      return withRegion(router, state.url, regs[0].code.toLowerCase());
    }
  } else {
    if (code !== 'tw' && code !== 'hk') {
      return withRegion(router, state.url, 'tw');
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
