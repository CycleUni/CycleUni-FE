import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private http = inject(HttpClient);

  getMetadata(): Observable<any> {
    // The `lang` query param is appended by ApiUrlInterceptor
    return this.http.get<any>('/core/metadata/');
  }
}
