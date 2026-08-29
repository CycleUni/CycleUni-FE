import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RegionService } from '../../core/region.service';

@Component({
  selector: 'app-account-index',
  template: '',
  standalone: true
})
export class AccountIndexComponent implements OnInit {
  private router = inject(Router);
  private regionService = inject(RegionService);

  ngOnInit() {
    // This component is only rendered by the router-outlet in AccountComponent
    // when the user is logged in. So we should redirect to listings.
    const region = this.regionService.region();
    this.router.navigate([`/${region}/account/listings`], { replaceUrl: true });
  }
}
