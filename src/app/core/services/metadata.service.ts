import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_AUTH } from '../auth.interceptor';

export interface PublicAd {
  id: number;
  title: string;
  image_url: string;
  target_url: string;
  headline?: string;
  subheadline?: string;
  advertiser_name?: string;
  slot_index: number;
  labels?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private http = inject(HttpClient);

  getMetadata(schoolId?: string | number): Observable<any> {
    // Public endpoint — do not attach Bearer token (SKIP_AUTH).
    // The `lang` query param is appended by ApiUrlInterceptor.
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('school', String(schoolId));
    }
    return this.http.get<any>('/core/metadata/', {
      context: new HttpContext().set(SKIP_AUTH, true),
      params
    });
  }

  getActiveAds(position: string = 'home_banner', schoolId?: string | number): Observable<any> {
    let params = new HttpParams().set('position', position);
    if (schoolId) {
      params = params.set('school', String(schoolId));
    }
    // Endpoint renamed from '/ads/active/' to '/promotions/active/' to evade adblockers
    return this.http.get<any>('/promotions/active/', {
      context: new HttpContext().set(SKIP_AUTH, true),
      params
    });
  }

  recordAdView(id: number): Observable<any> {
    return this.http.post<any>(`/promotions/${id}/view/`, {}, {
      context: new HttpContext().set(SKIP_AUTH, true)
    });
  }

  recordAdClick(id: number): Observable<any> {
    return this.http.post<any>(`/promotions/${id}/click/`, {}, {
      context: new HttpContext().set(SKIP_AUTH, true)
    });
  }
}
