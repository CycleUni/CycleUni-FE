import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ListingsComponent } from './listings';
import { en } from '../../core/i18n/en';

describe('ListingsComponent.submitEdit', () => {
  let component: ListingsComponent;
  let updateListing: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  const manualListing = {
    id: 'l1',
    book_source: 'manual',
    book_title: 'Linear Algebra',
    book_authors: 'Strang',
    isbn: '9780980232714',
    price: 300,
    condition: 'good',
    description: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ListingsComponent, HttpClientTestingModule, RouterTestingModule],
    });
    component = TestBed.createComponent(ListingsComponent).componentInstance;

    updateListing = vi.fn().mockReturnValue(of({}));
    toastError = vi.fn();
    (component as any).listingService = { updateListing };
    (component as any).toast = { error: toastError, success: vi.fn() };
    (component as any).accountService = { clearProfileCache: vi.fn() };
    component.loadMyListings = vi.fn();

    component.editingListing = { ...manualListing };
    component.editForm = {
      price: 300,
      condition: 'good',
      category: '',
      course_name: '',
      professor_name: '',
      private_note: '',
      description: '',
      photos: [],
      book_title: manualListing.book_title,
      book_authors: manualListing.book_authors,
      isbn: manualListing.isbn,
    } as any;
  });

  it('leaves the book fields out when the seller only touched the listing', () => {
    // A Book row is shared by every listing of that title, so the backend
    // refuses book-field edits once a second seller lists the same manual
    // book. Sending the unchanged title/authors/ISBN with a price edit made
    // that refusal apply to edits that changed no book field at all.
    component.editForm.price = 250;
    component.submitEdit();

    const payload = updateListing.mock.calls[0][1];
    expect(payload.price).toBe(250);
    expect('book_title' in payload).toBe(false);
    expect('book_authors' in payload).toBe(false);
    expect('isbn' in payload).toBe(false);
  });

  it('still sends the book fields the seller actually changed', () => {
    component.editForm.book_title = 'Linear Algebra, 5th ed.';
    component.submitEdit();

    const payload = updateListing.mock.calls[0][1];
    expect(payload.book_title).toBe('Linear Algebra, 5th ed.');
    expect('book_authors' in payload).toBe(false);
    expect('isbn' in payload).toBe(false);
  });

  it('treats null and empty-string as the same ISBN', () => {
    component.editingListing = { ...manualListing, isbn: null };
    component.editForm.isbn = '';
    component.submitEdit();

    expect('isbn' in updateListing.mock.calls[0][1]).toBe(false);
  });

  it('shows the reason the backend gave instead of a blanket failure', () => {
    updateListing.mockReturnValue(throwError(() => ({
      status: 403,
      error: { error: { code: 'listing.errBookShared' } },
    })));

    component.submitEdit();

    expect(toastError).toHaveBeenCalledWith(en['listing.errBookShared']);
  });
});
