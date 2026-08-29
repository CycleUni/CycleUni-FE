import { Injectable, Injector, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from './i18n.service';
import { RegionService } from './region.service';

/** Skip the `lang` query param for endpoints whose response has no localized fields. */
export const SKIP_LANG_PARAM = new HttpContextToken<boolean>(() => false);

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  private i18n = inject(I18nService);
  // Resolved lazily, not with inject() at field level. RegionService injects
  // HttpClient (it fetches /core/regions/), and HttpClient construction needs
  // HTTP_INTERCEPTORS — so injecting it here closed a DI cycle and Angular
  // failed the whole interceptor chain with NG0200, taking every API call
  // down with it. By the time intercept() runs the injector is fully built.
  private injector = inject(Injector);
  private _regionService?: RegionService;

  private get regionService(): RegionService {
    if (!this._regionService) {
      this._regionService = this.injector.get(RegionService);
    }
    return this._regionService;
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!request.url.startsWith('http')) {
      const currentLang = this.i18n.lang();
      const currentRegion = this.regionService.region();

      const setParams: { [key: string]: string } = {};
      if (!request.params.has('region')) {
        setParams['region'] = currentRegion;
      }
      if (!request.context.get(SKIP_LANG_PARAM) && !request.params.has('lang')) {
        setParams['lang'] = currentLang;
      }

      let headers = request.headers.set('ngsw-bypass', 'true');
      if (!headers.has('Accept-Language')) {
        headers = headers.set('Accept-Language', request.params.get('lang') || currentLang);
      }
      if (!headers.has('X-Region')) {
        headers = headers.set('X-Region', request.params.get('region') || currentRegion);
      }

      request = request.clone({
        url: `${environment.backendUrl}${request.url}`,
        headers,
        ...(Object.keys(setParams).length > 0 ? { setParams } : {})
      });
    }
    return next.handle(request);
  }
}
