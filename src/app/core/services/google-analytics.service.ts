import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private initialized = false;
  private gaId: string | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const gaId = environment.gaMeasurementId;
    if (!gaId || !isPlatformBrowser(this.platformId) || this.initialized) {
      return;
    }

    this.gaId = gaId;

    // Load Google Analytics script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() {
      // eslint-disable-next-line prefer-rest-params
      (window as any).dataLayer.push(arguments);
    };
    
    const gtag = (window as any).gtag;
    gtag('js', new Date());
    // Disable automatic page view so we can track SPA route changes manually
    gtag('config', gaId, { send_page_view: false });

    this.initialized = true;

    // Track route changes via Angular Router
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      gtag('config', gaId, {
        page_path: event.urlAfterRedirects
      });
    });
  }

  /**
   * Generic GA4 event tracking
   */
  public trackEvent(eventName: string, params: Record<string, any> = {}): void {
    if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
      (window as any).gtag('event', eventName, params);
    }
  }

  /**
   * Track user registration
   */
  public trackSignUp(method: 'Email' | 'Google' = 'Email'): void {
    this.trackEvent('sign_up', { method });
  }

  /**
   * Track user login
   */
  public trackLogin(method: 'Password' | 'Google' = 'Password'): void {
    this.trackEvent('login', { method });
  }

  /**
   * Track search action
   */
  public trackSearch(searchTerm: string, totalResults?: number, school?: string): void {
    this.trackEvent('search', {
      search_term: searchTerm,
      total_results: totalResults,
      school: school || undefined
    });
  }

  /**
   * Track item detail view (GA4 standard view_item)
   * item_id uses book-level identifier (isbn or bookId) so GA4 product reports
   * can aggregate across multiple listings of the same book.
   * listing_id is passed as a custom parameter for traceability.
   */
  public trackViewItem(item: {
    bookId?: string | number | null;
    isbn?: string | null;
    listingId?: string | number | null;
    name?: string;
    category?: string;
    price?: number;
  }): void {
    const itemId = item.isbn || (item.bookId != null ? String(item.bookId) : '');
    this.trackEvent('view_item', {
      currency: 'TWD',
      value: item.price,
      items: [
        {
          item_id: itemId,
          item_name: item.name || '',
          item_category: item.category || '',
          price: item.price,
          ...(item.listingId != null ? { listing_id: String(item.listingId) } : {})
        }
      ]
    });
  }

  /**
   * Track seller item publication
   */
  public trackPublishListing(category?: string, condition?: string, price?: number | null): void {
    this.trackEvent('publish_listing', {
      item_category: category || '',
      item_condition: condition || '',
      price: price ?? 0
    });
  }

  /**
   * Track initiate checkout (GA4 standard begin_checkout)
   * item_id uses book-level identifier (isbn or bookId) for meaningful product aggregation.
   */
  public trackBeginCheckout(opts: {
    listingId?: string | number | null;
    bookId?: string | number | null;
    isbn?: string | null;
    itemName?: string;
    price?: number | null;
  }): void {
    const itemId = opts.isbn || (opts.bookId != null ? String(opts.bookId) : '');
    this.trackEvent('begin_checkout', {
      currency: 'TWD',
      value: opts.price ?? 0,
      items: [{
        item_id: itemId,
        item_name: opts.itemName || '',
        price: opts.price ?? 0,
        ...(opts.listingId != null ? { listing_id: String(opts.listingId) } : {})
      }]
    });
  }

  /**
   * Track completed purchase/order (GA4 standard purchase)
   */
  public trackPurchase(orderId?: string | number | null, value?: number, currency = 'TWD', items: any[] = []): void {
    this.trackEvent('purchase', {
      transaction_id: orderId != null ? String(orderId) : '',
      value: value ?? 0,
      currency,
      items: items.map(item => ({
        item_id: String(item.item_id || item.id || ''),
        item_name: item.item_name || item.name || '',
        price: item.price ?? value ?? 0
      }))
    });
  }

  /**
   * Track buyer contacting seller
   */
  public trackContactSeller(listingId?: string | number | null): void {
    this.trackEvent('contact_seller', {
      item_id: listingId != null ? String(listingId) : ''
    });
  }

  /**
   * Track chat message sent
   */
  public trackSendMessage(conversationId?: string | number | null): void {
    this.trackEvent('send_message', {
      conversation_id: conversationId != null ? String(conversationId) : undefined
    });
  }

  /**
   * Track order cancellation
   */
  public trackCancelOrder(orderId?: string | number | null, reason?: string): void {
    this.trackEvent('cancel_order', {
      order_id: orderId != null ? String(orderId) : '',
      cancel_reason: reason || ''
    });
  }

  /**
   * Track review submission
   */
  public trackSubmitReview(orderId?: string | number, rating?: number): void {
    this.trackEvent('submit_review', {
      order_id: orderId ? String(orderId) : undefined,
      rating: rating ?? 0
    });
  }

  /**
   * Track .edu verification request
   */
  public trackEduVerificationRequest(): void {
    this.trackEvent('verify_edu_request');
  }

  // ─── User Identity & Properties ────────────────────────────────────────────

  /**
   * Set GA4 user_id for cross-device tracking and User Explorer reports.
   * Call after login/profile load; pass null to clear on logout.
   */
  public setUserId(userId: string | number | null): void {
    if (!isPlatformBrowser(this.platformId) || !this.gaId || !(window as any).gtag) return;
    if (userId != null) {
      (window as any).gtag('config', this.gaId, { user_id: String(userId) });
    } else {
      // Clear user_id on logout
      (window as any).gtag('config', this.gaId, { user_id: null });
    }
  }

  /**
   * Set GA4 user properties for audience segmentation.
   * These enhance all built-in reports (Retention, Acquisition, etc.).
   */
  public setUserProperties(props: {
    school?: string | null;
    is_verified?: boolean;
    role?: 'buyer' | 'seller' | 'both' | null;
  }): void {
    if (!isPlatformBrowser(this.platformId) || !(window as any).gtag) return;
    (window as any).gtag('set', 'user_properties', {
      school:      props.school      ?? undefined,
      is_verified: props.is_verified ?? undefined,
      role:        props.role        ?? undefined
    });
  }

  /**
   * Clear GA4 user properties on logout so anonymous browsing is not
   * still attributed to the previous user's segment.
   */
  public clearUserProperties(): void {
    if (!isPlatformBrowser(this.platformId) || !(window as any).gtag) return;
    (window as any).gtag('set', 'user_properties', {
      school: null,
      is_verified: null,
      role: null
    });
  }

  // ─── Scroll Depth ───────────────────────────────────────────────────────────

  /**
   * Track page scroll depth milestones (25 / 50 / 75 / 90 %).
   * GA4 Enhanced Measurement only fires at 90%; this gives finer granularity.
   */
  public trackScrollDepth(percent: 25 | 50 | 75 | 90): void {
    this.trackEvent('scroll', { percent_scrolled: percent });
  }
}
