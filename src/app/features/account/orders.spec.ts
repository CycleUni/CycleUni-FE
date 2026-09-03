import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { OrdersComponent } from './orders';
import { en } from '../../core/i18n/en';

describe('OrdersComponent.updateStatus', () => {
  let component: OrdersComponent;
  let updateOrderStatus: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  const pendingOrder = { id: 'o1', listing: 'l1', status: 'pending', buyer: 'u2', seller: 'u1' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrdersComponent, HttpClientTestingModule, RouterTestingModule],
    });
    component = TestBed.createComponent(OrdersComponent).componentInstance;

    updateOrderStatus = vi.fn().mockReturnValue(of({ ...pendingOrder, status: 'accepted' }));
    toastError = vi.fn();
    (component as any).orderService = { updateOrderStatus };
    (component as any).toast = { error: toastError, success: vi.fn() };
    component.loadOrders = vi.fn();
    component.soldOrders = [{ ...pendingOrder }];
    component.activeTab = 'selling';
  });

  it('merges the updated order in on success', () => {
    component.updateStatus(component.soldOrders[0], 'accepted');

    expect(component.soldOrders[0].status).toBe('accepted');
    expect(toastError).not.toHaveBeenCalled();
    expect(component.loadOrders).not.toHaveBeenCalled();
  });

  it('explains a refused accept and re-reads the stale list', () => {
    // The backend takes a row lock and refuses an accept whose listing is no
    // longer active — another buyer got there first, or the seller has since
    // marked it sold. There was no error branch here at all, so the seller
    // pressed Accept and nothing whatsoever happened.
    updateOrderStatus.mockReturnValue(throwError(() => ({
      status: 400,
      error: { status: ['checkout.errListingUnavailable'] },
    })));

    component.updateStatus(component.soldOrders[0], 'accepted');

    expect(toastError).toHaveBeenCalledWith(en['checkout.errListingUnavailable']);
    expect(component.loadOrders).toHaveBeenCalled();
    expect(component.soldOrders[0].status).toBe('pending');
  });

  it('leaves an expired session to the interceptor', () => {
    updateOrderStatus.mockReturnValue(throwError(() => ({ status: 401, error: null })));

    component.updateStatus(component.soldOrders[0], 'accepted');

    expect(component.loadOrders).not.toHaveBeenCalled();
  });

  it('does not re-read the list when the request never reached the server', () => {
    // A dropped connection says nothing about whether this row is stale, and
    // reloading on it would just fail again.
    updateOrderStatus.mockReturnValue(throwError(() => ({ status: 0, error: null })));

    component.updateStatus(component.soldOrders[0], 'accepted');

    expect(toastError).toHaveBeenCalledWith(en['acct.updateFailed']);
    expect(component.loadOrders).not.toHaveBeenCalled();
  });
});
