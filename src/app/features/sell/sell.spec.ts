import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sell, cleanAndValidateIsbn, clean_and_validate_isbn, isValidIsbnChecksum } from './sell';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { I18nService } from '../../core/i18n.service';
import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';
import { BookService } from '../../core/services/book.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { of } from 'rxjs';

describe('isValidIsbnChecksum', () => {
  it('accepts real ISBN-13 and ISBN-10 check digits', () => {
    expect(isValidIsbnChecksum('9786264140720')).toBe(true);
    expect(isValidIsbnChecksum('0306406152')).toBe(true);
    expect(isValidIsbnChecksum('000000006X')).toBe(true);
  });

  it('rejects a same-length, all-digit misread with the wrong check digit', () => {
    // Right shape (13 digits), wrong content — e.g. a garbled camera scan.
    expect(isValidIsbnChecksum('9786264140721')).toBe(false);
    expect(isValidIsbnChecksum('0123456788')).toBe(false);
  });
});

describe('cleanAndValidateIsbn', () => {
  it('should accept valid 13-digit ISBNs', () => {
    expect(cleanAndValidateIsbn('9786264140720')).toBe('9786264140720');
    expect(cleanAndValidateIsbn('978-626-414-072-0')).toBe('9786264140720');
    expect(cleanAndValidateIsbn(' 978 626 414 072 0 ')).toBe('9786264140720');
    expect(cleanAndValidateIsbn('9791234567890')).toBe('9791234567890');
  });

  it('should accept valid 10-digit ISBNs including trailing X check digit', () => {
    expect(cleanAndValidateIsbn('0306406152')).toBe('0306406152');
    expect(cleanAndValidateIsbn('0-306-40615-2')).toBe('0306406152');
    expect(cleanAndValidateIsbn('012345678X')).toBe('012345678X');
    expect(cleanAndValidateIsbn('0-1234-5678-x')).toBe('012345678X');
    expect(cleanAndValidateIsbn(' 012345678X ')).toBe('012345678X');
  });

  it('should reject invalid QR codes and URLs', () => {
    expect(cleanAndValidateIsbn('https://example.com/some-qr-payload')).toBeNull();
    expect(cleanAndValidateIsbn('WIFI:S:MyNetwork;T:WPA;P:password;;')).toBeNull();
    expect(cleanAndValidateIsbn('invalid barcode')).toBeNull();
  });

  it('should reject strings with invalid lengths', () => {
    expect(cleanAndValidateIsbn('123')).toBeNull();
    expect(cleanAndValidateIsbn('123456789')).toBeNull();
    expect(cleanAndValidateIsbn('12345678901')).toBeNull(); // 11 digits
    expect(cleanAndValidateIsbn('123456789012')).toBeNull(); // 12 digits
    expect(cleanAndValidateIsbn('12345678901234')).toBeNull(); // 14 digits
  });

  it('should reject strings with non-digits in invalid positions', () => {
    expect(cleanAndValidateIsbn('97862641407XX')).toBeNull();
    expect(cleanAndValidateIsbn('978626A140720')).toBeNull();
    expect(cleanAndValidateIsbn('978-0-1234-5678-X')).toBeNull(); // ISBN-13 with X is invalid
    expect(cleanAndValidateIsbn('X123456789')).toBeNull(); // X at start of 10-char
    expect(cleanAndValidateIsbn('01234567X9')).toBeNull(); // X in middle of 10-char
  });

  it('should reject empty or null inputs', () => {
    expect(cleanAndValidateIsbn('')).toBeNull();
    expect(cleanAndValidateIsbn(null)).toBeNull();
    expect(cleanAndValidateIsbn(undefined)).toBeNull();
  });

  it('should expose clean_and_validate_isbn alias matching backend naming', () => {
    expect(clean_and_validate_isbn('9786264140720')).toBe('9786264140720');
  });
});

describe('Sell Component Barcode Scanner Validation', () => {
  let fixture: ComponentFixture<Sell>;
  let component: Sell;
  let mockBookService: any;
  let mockI18n: any;

  beforeEach(async () => {
    mockBookService = {
      getEngineOptions: vi.fn().mockReturnValue([
        { label: 'Google Books', value: 'googlebooks' },
        { label: 'Open Library', value: 'openlibrary' }
      ]),
      searchBooks: vi.fn().mockReturnValue(of({ results: [] })),
      createManualBook: vi.fn().mockReturnValue(of({ id: 'book-1' }))
    };

    mockI18n = {
      t: vi.fn((key: string) => {
        const translations: Record<string, string> = {
          'sell.invalidBarcodeScanned': "Scanned code doesn't look like a valid ISBN, try again.",
          'sell.cameraPermission': 'Cannot access camera. Please check your permissions.'
        };
        return translations[key] || key;
      }),
      lang: () => 'en'
    };

    await TestBed.configureTestingModule({
      imports: [Sell, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: BookService, useValue: mockBookService },
        { provide: I18nService, useValue: mockI18n },
        {
          provide: AuthStore,
          useValue: {
            isLoggedIn: () => true,
            user: () => ({ id: 'user-1' })
          }
        },
        {
          provide: AccountService,
          useValue: {
            getMyProfile: vi.fn().mockReturnValue(of({ verified_at: '2026-01-01' }))
          }
        },
        {
          provide: ListingService,
          useValue: {
            uploadPhoto: vi.fn(),
            deletePhoto: vi.fn(),
            createListing: vi.fn()
          }
        },
        {
          provide: MetadataService,
          useValue: {
            getMetadata: vi.fn().mockReturnValue(of({ categories: [] }))
          }
        },
        {
          provide: GoogleAnalyticsService,
          useValue: {
            trackEvent: vi.fn(),
            trackPublishListing: vi.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Sell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should delegate cleanAndValidateIsbn method to validation function', () => {
    expect(component.cleanAndValidateIsbn('9786264140720')).toBe('9786264140720');
    expect(component.cleanAndValidateIsbn('invalid')).toBeNull();
  });

  it('should accept valid ISBN-13 scan, assign searchQuery, stop scanner, and search', async () => {
    const stopScannerSpy = vi.spyOn(component, 'stopScanner').mockResolvedValue();
    const searchBookSpy = vi.spyOn(component, 'searchBook').mockImplementation(() => {});
    const onSearchQueryChangeSpy = vi.spyOn(component, 'onSearchQueryChange');

    component.cameraError = "Scanned code doesn't look like a valid ISBN, try again.";

    const result = component.handleScanResult('978-626-414-072-0');

    expect(result).toBe(true);
    expect(component.searchQuery).toBe('9786264140720');
    expect(component.cameraError).toBe('');
    expect(onSearchQueryChangeSpy).toHaveBeenCalled();
    expect(stopScannerSpy).toHaveBeenCalled();

    // Await promise microtask for searchBook invocation
    await Promise.resolve();
    expect(searchBookSpy).toHaveBeenCalled();
  });

  it('should accept valid ISBN-10 scan with check digit X', async () => {
    const stopScannerSpy = vi.spyOn(component, 'stopScanner').mockResolvedValue();
    const searchBookSpy = vi.spyOn(component, 'searchBook').mockImplementation(() => {});

    const result = component.handleScanResult('0-0000-0006-x');

    expect(result).toBe(true);
    expect(component.searchQuery).toBe('000000006X');
    expect(component.cameraError).toBe('');
    expect(stopScannerSpy).toHaveBeenCalled();

    await Promise.resolve();
    expect(searchBookSpy).toHaveBeenCalled();
  });

  it('should reject a correctly-shaped but checksum-invalid scan (garbled misread)', () => {
    const stopScannerSpy = vi.spyOn(component, 'stopScanner');
    const searchBookSpy = vi.spyOn(component, 'searchBook');

    component.searchQuery = '';

    // 13 digits, passes the format check, but the check digit is wrong —
    // the shape a camera misread often produces.
    const result = component.handleScanResult('9786264140721');

    expect(result).toBe(false);
    expect(component.searchQuery).toBe('');
    expect(stopScannerSpy).not.toHaveBeenCalled();
    expect(searchBookSpy).not.toHaveBeenCalled();
    expect(component.cameraError).toBe("Scanned code doesn't look like a valid ISBN, try again.");
  });

  it('should reject non-ISBN scan, keep scanner running, and set cameraError', () => {
    const stopScannerSpy = vi.spyOn(component, 'stopScanner');
    const searchBookSpy = vi.spyOn(component, 'searchBook');

    component.searchQuery = '';
    component.isScanning = true;

    const result = component.handleScanResult('https://example.com/qr-code');

    expect(result).toBe(false);
    expect(component.searchQuery).toBe('');
    expect(stopScannerSpy).not.toHaveBeenCalled();
    expect(searchBookSpy).not.toHaveBeenCalled();
    expect(component.cameraError).toBe("Scanned code doesn't look like a valid ISBN, try again.");
    expect(mockI18n.t).toHaveBeenCalledWith('sell.invalidBarcodeScanned');
  });

  it('should not repeatedly trigger change detection on consecutive identical invalid scans', () => {
    const cdrSpy = vi.spyOn((component as any).cdr, 'markForCheck');

    component.handleScanResult('https://example.com/qr-code');
    const firstCallCount = cdrSpy.mock.calls.length;

    // Second invalid scan with same resulting error message
    component.handleScanResult('123');
    const secondCallCount = cdrSpy.mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount);
  });

  it('should clear invalidBarcodeScanned cameraError when stopScanner is called', async () => {
    component.cameraError = "Scanned code doesn't look like a valid ISBN, try again.";
    component.isScanning = true;

    await component.stopScanner();

    expect(component.cameraError).toBe('');
    expect(component.isScanning).toBe(false);
  });

  it('should clear cameraError when succeeding after a previous invalid scan', async () => {
    vi.spyOn(component, 'stopScanner').mockResolvedValue();
    vi.spyOn(component, 'searchBook').mockImplementation(() => {});

    // First scan is invalid
    component.handleScanResult('invalid-qr');
    expect(component.cameraError).toBe("Scanned code doesn't look like a valid ISBN, try again.");

    // Second scan is valid
    component.handleScanResult('9786264140720');
    expect(component.cameraError).toBe('');
    expect(component.searchQuery).toBe('9786264140720');
  });
});
