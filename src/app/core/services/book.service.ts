import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_LANG_PARAM } from '../api-url.interceptor';
import { SKIP_AUTH } from '../auth.interceptor';
import { I18nService } from '../i18n.service';

// Search and book-detail responses carry no localized fields; skip the lang param.
// Both book search and detail are public endpoints — skip auth token too.
const PUBLIC_NO_LANG = new HttpContext().set(SKIP_LANG_PARAM, true).set(SKIP_AUTH, true);
const PUBLIC = new HttpContext().set(SKIP_AUTH, true);

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);

  searchBooks(query: string, category?: string, school?: string, page: number = 1, engine?: string): Observable<any> {
    let url = `/search/books/?q=${encodeURIComponent(query)}&page=${page}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (school) {
      url += `&school=${encodeURIComponent(school)}`;
    }
    if (engine) {
      url += `&engine=${encodeURIComponent(engine)}`;
    }
    return this.http.get<any[]>(url, { context: PUBLIC_NO_LANG });
  }

  getBook(idOrIsbn: string, page: number = 1): Observable<any> {
    const isIsbn = /^\d{10,13}$/.test(idOrIsbn);
    const param = isIsbn ? `?isbn=${idOrIsbn}&page=${page}` : `?id=${idOrIsbn}&page=${page}`;
    return this.http.get<any>(`/books/${param}`, { context: PUBLIC });
  }

  createManualBook(bookData: any): Observable<any> {
    return this.http.post<any>('/books/manual/', bookData);
  }

  subscribe(bookId: string): Observable<any> {
    return this.http.post<any>('/subscriptions/', { book_id: bookId });
  }

  unsubscribe(subscriptionId: string | number): Observable<any> {
    return this.http.delete<any>(`/subscriptions/${subscriptionId}/`);
  }

  getEngineOptions(i18n: I18nService) {
    return [
      { label: i18n.t('search.engineGoogle'), value: 'google' },
      { label: i18n.t('search.engineOpenLibrary'), value: 'openlibrary' }
    ];
  }
}
