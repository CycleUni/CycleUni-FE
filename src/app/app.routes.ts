import { Routes } from '@angular/router';
import { authGuard, accountIndexGuard } from './core/auth.guard';
import { adminGuard } from './features/admin/admin.guard';

// CSR only (PWA) — all routes are lazy-loaded.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: 'book',
    loadComponent: () => import('./features/book/book').then((m) => m.Book),
  },
  {
    path: 'sell',
    loadComponent: () => import('./features/sell/sell').then((m) => m.Sell),
  },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
    children: [
      { path: '', canActivate: [accountIndexGuard], children: [] },
      { path: 'listings', canActivate: [authGuard], loadComponent: () => import('./features/account/listings').then(m => m.ListingsComponent) },
      { path: 'subscriptions', canActivate: [authGuard], loadComponent: () => import('./features/account/subscriptions').then(m => m.SubscriptionsComponent) },
      { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/account/orders').then(m => m.OrdersComponent) },
      { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./features/account/settings').then(m => m.SettingsComponent) }
    ]
  },
  { path: 'checkout/success', loadComponent: () => import('./features/checkout/success').then(m => m.OrderSuccessComponent) },
  { path: 'checkout/:id', loadComponent: () => import('./features/checkout/checkout').then(m => m.CheckoutComponent) },
  { path: 'listing/:id', loadComponent: () => import('./features/listing-detail/listing-detail').then(m => m.ListingDetail) },
  { path: 'seller/:id', loadComponent: () => import('./features/seller/seller').then(m => m.SellerPageComponent) },
  {
    path: 'messages',
    canActivate: [authGuard],
    loadComponent: () => import('./features/messages/messages').then((m) => m.Messages),
  },
  {
    path: 'verify',
    loadComponent: () => import('./features/auth/verify').then((m) => m.VerifyEmail),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      { path: 'users', loadComponent: () => import('./features/admin/users-list.component').then(m => m.AdminUsersListComponent) },
      { path: 'users/:id', loadComponent: () => import('./features/admin/user-detail.component').then(m => m.AdminUserDetailComponent) },
      { path: 'schools', loadComponent: () => import('./features/admin/schools-list.component').then(m => m.AdminSchoolsListComponent) },
      { path: 'categories', loadComponent: () => import('./features/admin/categories-list.component').then(m => m.AdminCategoriesListComponent) },
      { path: 'schools/:id', loadComponent: () => import('./features/admin/school-detail.component').then(m => m.AdminSchoolDetailComponent) },
      { path: 'listings', loadComponent: () => import('./features/admin/listings-list.component').then(m => m.AdminListingsListComponent) },
      { path: 'listings/:id', loadComponent: () => import('./features/admin/listing-detail-admin.component').then(m => m.AdminListingDetailComponent) },
      { path: 'orders', loadComponent: () => import('./features/admin/orders-list.component').then(m => m.AdminOrdersListComponent) },
      { path: 'orders/:id', loadComponent: () => import('./features/admin/order-detail-admin.component').then(m => m.AdminOrderDetailComponent) },
      { path: 'reports', loadComponent: () => import('./features/admin/reports-list.component').then(m => m.AdminReportsListComponent) },
      { path: 'chat-reports', loadComponent: () => import('./features/admin/chat-reports-list.component').then(m => m.AdminChatReportsListComponent) },
      { path: 'managers', loadComponent: () => import('./features/admin/managers-list.component').then(m => m.AdminManagersListComponent) },
      { path: 'advertisers', loadComponent: () => import('./features/admin/advertisers-list.component').then(m => m.AdminAdvertisersListComponent) },
      { path: 'ads', loadComponent: () => import('./features/admin/ads-list.component').then(m => m.AdminAdsListComponent) },
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then(m => m.NotFoundComponent),
  }
];
