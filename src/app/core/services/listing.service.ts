import { Injectable, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { shareReplay, catchError, switchMap, map } from 'rxjs/operators';
import imageCompression from 'browser-image-compression';
import { I18nService } from '../i18n.service';

import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ListingService {
  private http = inject(HttpClient);
  private apiUrl = '/listings/';

  private cache = new Map<string, Observable<any[]>>();
  private i18n = inject(I18nService);

  constructor() {
    effect(() => {
      this.i18n.lang();
      this.clearCache();
    });
  }

  getListings(school?: string, sellerId?: string, page: number = 1): Observable<any> {
    const key = (school || '') + '_' + (sellerId || '') + '_' + page;
    if (!this.cache.has(key)) {
      let params = new HttpParams().set('page', page.toString());
      if (school) {
        params = params.set('school', school);
      }
      if (sellerId) {
        params = params.set('seller_id', sellerId);
      }
      const request = this.http.get<any>('/listings/', { params }).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.cache.set(key, request);
    }
    
    return this.cache.get(key)!;
  }

  getRecentBooks(school?: string, page: number = 1, limit: number = 200): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (school) {
      params = params.set('school', school);
    }
    return this.http.get<any>(`${this.apiUrl}recent_books/`, { params });
  }

  clearCache(school?: string) {
    if (school) {
      this.cache.delete(school);
    } else {
      this.cache.clear();
    }
  }

  getListing(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${id}/`);
  }

  createListing(listingData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, listingData);
  }

  // Compresses client-side, then either uploads straight to R2 via a
  // presigned POST policy (the file never touches our server), or — in
  // local dev without real R2 credentials — falls back to the old
  // proxy-through-Django path. See listings/views.py ListingUploadURLView.
  uploadPhoto(file: File): Observable<{ url: string }> {
    return from(imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    })).pipe(
      switchMap(compressed => this.http.post<any>(`${this.apiUrl}uploads/`, { content_type: compressed.type }).pipe(
        switchMap(presign => {
          if (presign.mode === 'direct') {
            const formData = new FormData();
            formData.append('file', compressed, file.name);
            return this.http.post<{ url: string }>(`${this.apiUrl}uploads/direct/`, formData);
          }

          if (presign.mode === 'presigned_put') {
            // S3/R2 PUT presigned URL: just PUT the raw file body
            return this.http.put(presign.upload_url, compressed, {
              headers: { 'Content-Type': compressed.type }
            }).pipe(
              map(() => ({ url: presign.photo_url }))
            );
          }

          throw new Error('Unknown upload mode');
        })
      ))
    );
  }

  updateListing(id: string | number, listingData: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}${id}/`, listingData);
  }

  deleteListing(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${id}/`);
  }

  reportListing(listingId: string | number, reason: 'fake' | 'scam' | 'other', detail?: string): Observable<any> {
    return this.http.post<any>('/moderation/', { listing: listingId, reason, detail: detail || '' });
  }
}
