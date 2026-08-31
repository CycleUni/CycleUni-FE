import { CanDeactivateFn } from '@angular/router';

/**
 * Implemented by any component that holds work-in-progress the user would
 * lose on navigation (e.g. the multi-step listing form in `features/sell`).
 *
 * The component owns both halves of the decision — whether there is anything
 * worth warning about, and what the warning says — so this guard stays free
 * of any feature-specific state or i18n key.
 */
export interface HasUnsavedChanges {
  /** True only when the user has entered something that is not yet submitted. */
  hasUnsavedChanges(): boolean;
  /** Already-translated text for the leave confirmation. */
  unsavedChangesMessage(): string;
}

/**
 * Blocks route changes while a component reports unsaved changes.
 *
 * Uses the native `confirm()` on purpose: it is what the rest of the app uses
 * today, and a router guard has to answer synchronously (or with a promise
 * resolved by a dialog this guard does not own). Swapping every native
 * confirm for a custom modal is tracked separately — when that lands, this is
 * the single place the sell flow needs changing.
 *
 * Tab close / reload is a different mechanism entirely and cannot be covered
 * here; components pair this with their own `beforeunload` listener.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component || typeof component.hasUnsavedChanges !== 'function') {
    return true;
  }
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    // No way to ask — never trap the user inside the route.
    return true;
  }
  return window.confirm(component.unsavedChangesMessage());
};
