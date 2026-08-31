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
 * Keeps the native `confirm()` on purpose, now that everywhere else has moved
 * to `ConfirmService`: a `CanDeactivate` guard has to answer while the
 * browser's back gesture is still on the stack, and an awaited dialog resolves
 * a tick too late — by then the navigation has already been let through. Do
 * not "finish" the migration here.
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
