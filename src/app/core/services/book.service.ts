import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_LANG_PARAM } from '../api-url.interceptor';
import { SKIP_AUTH } from '../auth.interceptor';
import { I18nService } from '../i18n.service';

// Search and book-detail responses carry no localized fields; skip the lang param.
// Both book search and detail are public endpoints — skip auth token too.
const PUBLIC_NO_LANG = new HttpContext().set(SKIP_LANG_PARAM, true).set(SKIP_AUTH, true);
const OPTIONAL_AUTH_NO_LANG = new HttpContext().set(SKIP_LANG_PARAM, true);

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);

  searchBooks(query: string, category?: string, course?: string, school?: string, page: number = 1, engine?: string): Observable<any> {
    let url = `/search/books/?q=${encodeURIComponent(query)}&page=${page}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (course) {
      url += `&course=${encodeURIComponent(course)}`;
    }
    if (school) {
      url += `&school=${encodeURIComponent(school)}`;
    }
    if (engine) {
      url += `&engine=${encodeURIComponent(engine)}`;
    }
    return this.http.get<any[]>(url, { context: OPTIONAL_AUTH_NO_LANG });
  }

  getBook(idOrIsbn: string, page: number = 1, school?: string, engine?: string): Observable<any> {
    const isIsbn = /^\d{10,13}$/.test(idOrIsbn);
    let param = isIsbn ? `?isbn=${idOrIsbn}&page=${page}` : `?id=${idOrIsbn}&page=${page}`;
    if (school) {
      param += `&school=${encodeURIComponent(school)}`;
    }
    if (engine) {
      param += `&engine=${encodeURIComponent(engine)}`;
    }
    return this.http.get<any>(`/books/${param}`);
  }

  createManualBook(bookData: any): Observable<any> {
    return this.http.post<any>('/books/manual/', bookData);
  }


  getTopCourses(school?: string, category?: string): Observable<string[]> {
    let url = `/search/courses/?`;
    const params = new URLSearchParams();
    if (school) params.set('school', school);
    if (category) params.set('category', category);
    return this.http.get<string[]>(url + params.toString(), { context: PUBLIC_NO_LANG });
  }

  subscribe(bookId: string): Observable<any> {
    return this.http.post<any>('/subscriptions/', { book_id: bookId });
  }

  unsubscribe(subscriptionId: string | number): Observable<any> {
    return this.http.delete<any>(`/subscriptions/${subscriptionId}/`);
  }

  getEngineOptions(i18n: I18nService) {
    return [
      { label: i18n.t('search.engineGoogle'), value: 'googlebooks' },
      { label: i18n.t('search.engineOpenLibrary'), value: 'openlibrary' }
    ];
  }
}
