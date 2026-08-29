import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { ApiUrlInterceptor } from './api-url.interceptor';
import { I18nService } from './i18n.service';
import { RegionService } from './region.service';

describe('ApiUrlInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let mockI18n: any;
  let mockRegionService: any;

  beforeEach(() => {
    mockI18n = { lang: vi.fn().mockReturnValue('zh-TW') };
    mockRegionService = { region: vi.fn().mockReturnValue('tw') };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: I18nService, useValue: mockI18n },
        { provide: RegionService, useValue: mockRegionService },
        { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should append current lang and region if not provided', () => {
    httpClient.get('/api/test').subscribe();
    
    const req = httpMock.expectOne(request => request.url.includes('/api/test'));
    expect(req.request.params.get('region')).toBe('tw');
    expect(req.request.params.get('lang')).toBe('zh-TW');
    expect(req.request.headers.get('X-Region')).toBe('tw');
    expect(req.request.headers.get('Accept-Language')).toBe('zh-TW');
    req.flush({});
  });

  it('should respect caller provided region parameter and X-Region header', () => {
    httpClient.get('/api/test', { params: { region: 'hk' } }).subscribe();
    
    const req = httpMock.expectOne(request => request.url.includes('/api/test'));
    expect(req.request.params.get('region')).toBe('hk'); // Should NOT be overwritten to 'tw'
    expect(req.request.headers.get('X-Region')).toBe('hk'); 
    req.flush({});
  });

  it('should respect caller provided lang parameter and Accept-Language header', () => {
    httpClient.get('/api/test', { params: { lang: 'en' } }).subscribe();
    
    const req = httpMock.expectOne(request => request.url.includes('/api/test'));
    expect(req.request.params.get('lang')).toBe('en'); // Should NOT be overwritten
    expect(req.request.headers.get('Accept-Language')).toBe('en'); 
    req.flush({});
  });
});
