import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiListingRow } from './listing-row.component';
import { I18nService } from '../../core/i18n.service';
import { By } from '@angular/platform-browser';

describe('UiListingRow', () => {
  let component: UiListingRow;
  let fixture: ComponentFixture<UiListingRow>;
  let mockI18n: any;

  beforeEach(() => {
    mockI18n = {
      t: (key: string) => `Translated: ${key}`
    };

    TestBed.configureTestingModule({
      imports: [UiListingRow],
      providers: [
        { provide: I18nService, useValue: mockI18n }
      ]
    });
    fixture = TestBed.createComponent(UiListingRow);
    component = fixture.componentInstance;
  });

  it('should render translated conditionText correctly', () => {
    component.condition = 'new';
    component.ngOnChanges({
      condition: {
        currentValue: 'new',
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();
    expect(component.conditionText).toBe('Translated: cond.new');
  });

  it('should apply fallback alt text if title is missing', () => {
    component.coverUrl = 'test.jpg';
    fixture.detectChanges();
    const img = fixture.debugElement.query(By.css('img')).nativeElement;
    expect(img.alt).toBe('Translated: home.unknownBook');
  });

  it('should apply title as alt text', () => {
    component.coverUrl = 'test.jpg';
    component.title = 'My Awesome Book';
    fixture.detectChanges();
    const img = fixture.debugElement.query(By.css('img')).nativeElement;
    expect(img.alt).toBe('My Awesome Book');
  });

  it('should hide price if null', () => {
    // default price is undefined, which should hide it
    fixture.detectChanges();
    const priceDiv = fixture.debugElement.query(By.css('.price'));
    expect(priceDiv).toBeNull();
    
    fixture.componentRef.setInput('price', 0);
    fixture.detectChanges();
    const zeroPriceDiv = fixture.debugElement.query(By.css('.price'));
    expect(zeroPriceDiv).toBeTruthy();
  });
});
