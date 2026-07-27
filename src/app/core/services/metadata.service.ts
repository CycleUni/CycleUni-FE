import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_AUTH } from '../auth.interceptor';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private http = inject(HttpClient);

  getMetadata(): Observable<any> {
    // Public endpoint — do not attach Bearer token (SKIP_AUTH).
    // The `lang` query param is appended by ApiUrlInterceptor.
    return this.http.get<any>('/core/metadata/', {
      context: new HttpContext().set(SKIP_AUTH, true)
    });
  }
}
