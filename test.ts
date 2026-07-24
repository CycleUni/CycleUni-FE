import { signal } from '@angular/core';
const isAuthenticated = signal(false).asReadonly();
function isLoggedIn() {
  return isAuthenticated();
}
console.log(typeof isLoggedIn());
