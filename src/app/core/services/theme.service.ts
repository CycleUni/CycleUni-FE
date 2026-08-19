import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cycleuni_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  mode = signal<ThemeMode>(this.readStored());

  constructor() {
    effect(() => this.apply(this.mode()));
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
    if (typeof localStorage !== 'undefined') {
      try {
        if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Storage may be unavailable (private browsing, disabled cookies) —
        // the in-memory signal still drives the current tab correctly.
      }
    }
  }

  private readStored(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'system';
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }

  private apply(mode: ThemeMode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }
}
