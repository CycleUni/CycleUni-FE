import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminUser {
  id: string | number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  school: string | number | null;
  school_name: string;
  edu_email: string;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AdminListing {
  id: string;
  book: { id: string; title: string };
  seller: { id: string | number; email: string };
  school: { id: string | number; name: string } | null;
  price: number;
  condition: string;
  status: string;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  buyer: { id: string | number; email: string };
  seller: { id: string | number; email: string };
  listing: { id: string; book_title: string };
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface AdminReport {
  id: string;
  reporter: { id: string | number; email: string };
  listing: { id: string; title?: string };
  reason: string;
  detail?: string;
  status: 'open' | 'actioned' | 'dismissed';
  created_at: string;
}

export interface AdminSchool {
  id: number;
  name: string;
  email_domain: string;
  translations: any;
}

export interface AdminCategory {
  id: number;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  translations: any;
}

export interface AdminChatReport {
  id: string;
  conversation_id: string;
  listing_title: string;
  reporter_email: string;
  reported_party_email: string;
  reason: string;
  detail?: string;
  status: 'open' | 'actioned' | 'dismissed';
  created_at: string;
}

function buildParams(query: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);

  getUsers(opts: { page?: number; q?: string; is_active?: string; school?: string } = {}): Observable<Paginated<AdminUser>> {
    return this.http.get<Paginated<AdminUser>>('/admin/users/', { params: buildParams(opts) });
  }

  getUser(id: string | number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`/admin/users/${id}/`);
  }

  updateUser(id: string | number, changes: { is_active?: boolean; school?: string | number | null; verified?: boolean }): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`/admin/users/${id}/`, changes);
  }

  toggleManager(id: string | number, is_staff: boolean): Observable<AdminUser> {
    return this.http.post<AdminUser>(`/admin/managers/${id}/toggle/`, { is_staff });
  }

  getListings(opts: { page?: number; q?: string; status?: string; condition?: string; school?: string } = {}): Observable<Paginated<AdminListing>> {
    return this.http.get<Paginated<AdminListing>>('/admin/listings/', { params: buildParams(opts) });
  }

  getListing(id: string): Observable<AdminListing> {
    return this.http.get<AdminListing>(`/admin/listings/${id}/`);
  }

  updateListingStatus(id: string, status: string): Observable<AdminListing> {
    return this.http.patch<AdminListing>(`/admin/listings/${id}/`, { status });
  }

  getOrders(opts: { page?: number; q?: string; status?: string } = {}): Observable<Paginated<AdminOrder>> {
    return this.http.get<Paginated<AdminOrder>>('/admin/orders/', { params: buildParams(opts) });
  }

  getOrder(id: string): Observable<AdminOrder> {
    return this.http.get<AdminOrder>(`/admin/orders/${id}/`);
  }

  forceCancelOrder(id: string, reason: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/admin/orders/${id}/force_cancel/`, { reason });
  }

  getReports(status?: string, page?: number): Observable<Paginated<AdminReport>> {
    return this.http.get<Paginated<AdminReport>>('/moderation/all/', { params: buildParams({ status, page }) });
  }

  actionReport(id: string, status: 'actioned' | 'dismissed'): Observable<AdminReport> {
    return this.http.patch<AdminReport>(`/moderation/${id}/`, { status });
  }

  getSchools(opts: { page?: number; q?: string } = {}): Observable<Paginated<AdminSchool>> {
    return this.http.get<Paginated<AdminSchool>>('/admin/schools/', { params: buildParams(opts) });
  }

  getSchool(id: string | number): Observable<AdminSchool> {
    return this.http.get<AdminSchool>(`/admin/schools/${id}/`);
  }

  createSchool(data: Partial<AdminSchool>): Observable<AdminSchool> {
    return this.http.post<AdminSchool>('/admin/schools/', data);
  }

  updateSchool(id: string | number, data: Partial<AdminSchool>): Observable<AdminSchool> {
    return this.http.patch<AdminSchool>(`/admin/schools/${id}/`, data);
  }

  deleteSchool(id: string | number): Observable<void> {
    return this.http.delete<void>(`/admin/schools/${id}/`);
  }

  getCategories(opts: { page?: number } = {}): Observable<Paginated<AdminCategory>> {
    return this.http.get<Paginated<AdminCategory>>('/admin/categories/', { params: buildParams(opts) });
  }

  createCategory(data: Partial<AdminCategory>): Observable<AdminCategory> {
    return this.http.post<AdminCategory>('/admin/categories/', data);
  }

  updateCategory(id: string | number, data: Partial<AdminCategory>): Observable<AdminCategory> {
    return this.http.patch<AdminCategory>(`/admin/categories/${id}/`, data);
  }

  deleteCategory(id: string | number): Observable<void> {
    return this.http.delete<void>(`/admin/categories/${id}/`);
  }

  bulkImport(endpoint: 'schools' | 'categories', action: 'preview' | 'apply', items: any[]): Observable<any> {
    return this.http.post<any>(`/admin/${endpoint}/bulk/`, { action, items });
  }

  getChatReports(status?: string, page?: number): Observable<Paginated<AdminChatReport>> {
    return this.http.get<Paginated<AdminChatReport>>('/admin/chat-reports/', { params: buildParams({ status, page }) });
  }

  actionChatReport(id: string, status: 'actioned' | 'dismissed'): Observable<AdminChatReport> {
    return this.http.patch<AdminChatReport>(`/admin/chat-reports/${id}/`, { status });
  }

  getChatReportToken(id: string): Observable<{ token: string; edge_chat_url: string; room_id: string }> {
    return this.http.get<{ token: string; edge_chat_url: string; room_id: string }>(`/admin/chat-reports/${id}/chat-token/`);
  }
}
