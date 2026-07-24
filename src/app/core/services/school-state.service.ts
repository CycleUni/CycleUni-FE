import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export const MANUAL_SCHOOL_KEY = 'cycleuni_manual_school';

@Injectable({
  providedIn: 'root'
})
export class SchoolStateService {
  private selectedSchoolSubject = new BehaviorSubject<string>('');
  hasInitialized = false;
  selectedSchool$ = this.selectedSchoolSubject.asObservable();

  setSchool(school: string) {
    if (school !== this.selectedSchoolSubject.value) {
      this.selectedSchoolSubject.next(school);
    }
  }

  setManualSchool(school: string) {
    this.setSchool(school);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(MANUAL_SCHOOL_KEY, school);
      } catch (err) {
        console.error('Failed to save manual school selection', err);
      }
    }
  }

  getManualSchool(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      try {
        return sessionStorage.getItem(MANUAL_SCHOOL_KEY);
      } catch (err) {
        console.error('Failed to read manual school selection', err);
      }
    }
    return null;
  }

  clearManualSchool() {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(MANUAL_SCHOOL_KEY);
      } catch (err) {
        console.error('Failed to clear manual school selection', err);
      }
    }
  }

  get currentSchool(): string {
    return this.selectedSchoolSubject.value;
  }
}