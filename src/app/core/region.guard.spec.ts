import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, convertToParamMap } from '@angular/router';
import { regionGuard, rootRedirectGuard } from './region.guard';
import { RegionService } from './region.service';

/** The guard reads only the `region` path parameter off the snapshot. */
const routeWith = (region: string | null) =>
  ({ paramMap: convertToParamMap(region === null ? {} : { region }) }) as any;

const stateWith = (url: string) => ({ url }) as any;

describe('regionGuard', () => {
  let mockRegionService: any;
  let router: Router;

  const run = (region: string | null, url: string) =>
    TestBed.runInInjectionContext(() => regionGuard(routeWith(region), stateWith(url)));

  beforeEach(() => {
    mockRegionService = {
      regions: vi.fn(() => [{ code: 'TW' }, { code: 'HK' }]),
      region: vi.fn(() => 'tw'),
      setRegion: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: RegionService, useValue: mockRegionService }],
    });
    router = TestBed.inject(Router);
  });

  it('lets a known region through and syncs the service', () => {
    mockRegionService.region.mockReturnValue('hk');
    expect(run('tw', '/tw/search')).toBe(true);
    expect(mockRegionService.setRegion).toHaveBeenCalledWith('tw', true);
  });

  it('rewrites an unknown region to the first configured one', () => {
    const result = run('xx', '/xx/search') as UrlTree;
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/tw/search');
  });

  it('falls back to tw before the region list has loaded', () => {
    mockRegionService.regions.mockReturnValue([]);
    expect((run('xx', '/xx/search') as UrlTree).toString()).toBe('/tw/search');
  });

  it('keeps query parameters and the fragment across the rewrite', () => {
    const result = run('xx', '/xx/search?q=physics&page=2#results') as UrlTree;
    const s = result.toString();
    expect(s).toContain('/tw/search');
    expect(s).toContain('q=physics');
    expect(s).toContain('page=2');
    expect(s).toContain('#results');
  });

  it('does not corrupt a query value that repeats the region segment', () => {
    // A plain string replace of '/xx' would have hit whichever came first.
    const result = run('xx', '/xx/search?next=%2Fxx%2Fbook') as UrlTree;
    const s = result.toString();
    expect(s.startsWith('/tw/search')).toBe(true);
    expect(s).toContain('%2Fxx%2Fbook');
  });

  it('rewrites a segment that had to be percent-encoded, rather than looping', () => {
    // paramMap decodes ('a b'); state.url does not ('/a%20b/search'). The old
    // string replace compared the two, matched nothing, and returned the URL
    // unchanged — navigating to it re-entered this guard forever.
    const result = run('a b', '/a%20b/search') as UrlTree;
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/tw/search');
  });

  it('rewrites a bare region with no child path', () => {
    expect((run('xx', '/xx') as UrlTree).toString()).toBe('/tw');
  });

  it('passes through when there is no region parameter at all', () => {
    expect(run(null, '/')).toBe(true);
  });
});

describe('rootRedirectGuard', () => {
  let mockRegionService: any;

  const run = (url: string) =>
    TestBed.runInInjectionContext(() => rootRedirectGuard({} as any, stateWith(url))) as UrlTree;

  beforeEach(() => {
    mockRegionService = { region: vi.fn(() => 'hk') };
    TestBed.configureTestingModule({
      providers: [{ provide: RegionService, useValue: mockRegionService }],
    });
    TestBed.inject(Router);
  });

  it('prefixes the current region onto a bare path', () => {
    expect(run('/search').toString()).toBe('/hk/search');
  });

  it('does not leave a trailing slash at the root', () => {
    expect(run('/').toString()).toBe('/hk');
  });

  it('defaults to tw when the service has no region yet', () => {
    mockRegionService.region.mockReturnValue('');
    expect(run('/search').toString()).toBe('/tw/search');
  });
});
