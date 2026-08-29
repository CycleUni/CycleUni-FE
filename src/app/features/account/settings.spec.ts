import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings';
import { RegionService } from '../../core/region.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        RegionService,
        AuthStore,
        AccountService
      ]
    });
    
    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  describe('autoVerifyRegion', () => {
    it('should return region if verified_at is null', () => {
      // Mock regions and verifications
      const mockRegion = { code: 'TW', edu_email_suffix: 'edu.tw' };
      (component as any).regionService = {
        currentRegionObj: () => mockRegion
      };
      
      component.email = 'test@test.edu.tw';
      component.verifications = [
        { region: 'TW', school: 1, edu_email: 'test@edu.tw', verified_at: null }
      ];

      const result = component.autoVerifyRegion;
      expect(result).toBe(mockRegion as any);
    });

    it('should return null if region is verified', () => {
      const mockRegion = { code: 'TW', edu_email_suffix: 'edu.tw' };
      (component as any).regionService = {
        currentRegionObj: () => mockRegion
      };
      
      component.email = 'test@test.edu.tw';
      component.verifications = [
        { region: 'TW', school: 1, edu_email: 'test@edu.tw', verified_at: '2026-08-28T12:27:44Z' }
      ];

      const result = component.autoVerifyRegion;
      expect(result).toBeNull();
    });
    
    it('should handle region codes ignoring case', () => {
      const mockRegion = { code: 'TW', edu_email_suffix: 'edu.tw' };
      (component as any).regionService = {
        currentRegionObj: () => mockRegion
      };
      
      component.email = 'test@test.edu.tw';
      component.verifications = [
        { region: 'tw', school: 1, edu_email: 'test@edu.tw', verified_at: '2026-08-28T12:27:44Z' }
      ];

      const result = component.autoVerifyRegion;
      expect(result).toBeNull();
    });
  });
});
