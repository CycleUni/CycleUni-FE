import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { I18nService } from './i18n.service';

/** Skip the `lang` query param for endpoints whose response has no localized fields. */
export const SKIP_LANG_PARAM = new HttpContextToken<boolean>(() => false);

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  private i18n = inject(I18nService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Prepend the API base URL to relative request URLs and tag every API
    // request with the UI language so responses come back localized
    if (!request.url.startsWith('http')) {
      const currentLang = this.i18n.lang();
      // Map 'zh-TW' (frontend) to 'zh-hant' (Django expected), otherwise use as is
      const acceptLanguage = currentLang === 'zh-TW' ? 'zh-hant' : currentLang;
      
      request = request.clone({
        url: `${environment.backendUrl}${request.url}`,
        headers: request.headers
          .set('Accept-Language', acceptLanguage)
          .set('ngsw-bypass', 'true'),
        ...(request.context.get(SKIP_LANG_PARAM)
          ? {}
          : { setParams: { lang: currentLang } })
      });
    }
    return next.handle(request);
  }
}
