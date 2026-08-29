import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthStore } from './auth.store';
import { RegionLinkService } from './region-link.service';
import { RegionService } from './region.service';
import { Meta, Title } from '@angular/platform-browser';
import { signal } from '@angular/core';

describe('AuthStore', () => {
  let authStore: AuthStore;
  let mockRegionService: any;

  beforeEach(() => {
    mockRegionService = {
      region: signal('tw')
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        AuthStore,
        RegionLinkService,
        { provide: RegionService, useValue: mockRegionService },
        Title,
        Meta
      ]
    });
    
    authStore = TestBed.inject(AuthStore);
  });

  describe('isVerifiedIn()', () => {
    it('should return true for region match regardless of case (TW vs tw)', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        verifications: [
          { region: 'TW', school: 1, edu_email: 'test@edu.tw', verified_at: '2026-08-28T12:27:44Z' }
        ]
      };
      
      (authStore as any)._user.set(user);

      expect(authStore.isVerifiedIn('tw')).toBe(true);
      expect(authStore.isVerifiedIn('TW')).toBe(true);
    });

    it('should return false if verified_at is null', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        verifications: [
          { region: 'TW', school: 1, edu_email: 'test@edu.tw', verified_at: null }
        ]
      };
      
      (authStore as any)._user.set(user);

      expect(authStore.isVerifiedIn('tw')).toBe(false);
      expect(authStore.isVerifiedIn('TW')).toBe(false);
    });
  });
});
