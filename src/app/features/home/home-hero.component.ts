import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { I18nService, TPipe } from '../../core/i18n.service';
import { BookCoverPipe } from '../../shared/pipes/book-cover.pipe';

/** One book in the hero's tilted cover stack. */
export interface HeroCover {
  id: any;
  isbn?: string;
  title: string;
  coverUrl?: string;
  count?: number;
}

/**
 * The home page's opening band: value proposition, search entry, popular
 * queries, the supply-side call to action, the trust line, and the tilted
 * cover stack.
 *
 * Split out of the home component because it was roughly 40% of that
 * component's stylesheet and carried its own interaction (search submission,
 * per-cover routing and detail-page cache priming) that had nothing to do
 * with the rest of the page. Home still owns the *data* — which books end up
 * in the stack is derived from the waitlist and recent-listings feeds — and
 * passes them in.
 */
@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, TPipe, BookCoverPipe],
  template: `
      <section class="hero-search" aria-labelledby="hero-title">
        <div class="hero-inner container">
          <div class="hero-copy">
            <h1 class="search-title" id="hero-title">{{ 'home.heroTitle' | t }}</h1>
            <p class="hero-subtitle">{{ 'home.heroSubtitle' | t }}</p>

            <div class="search-bar">
              <div class="hero-input-wrap">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5"/>
                  <line x1="20" y1="20" x2="15.4" y2="15.4"/>
                </svg>
                <ui-input
                  [placeholder]="'common.searchPlaceholder' | t"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="onSearch()"
                  class="hero-input"
                  [noMargin]="true"
                ></ui-input>
              </div>
              <ui-button size="lg" (onClick)="onSearch()" class="search-submit"><span class="submit-label sr-only-mobile">{{ 'common.search' | t }}</span><svg class="submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.4" y2="15.4"/></svg></ui-button>
            </div>

            <div class="popular-tags">
              <span class="tag-label">{{ 'home.popularSearches' | t }}</span>
              <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagCalculus')">{{ 'home.tagCalculus' | t }}</button>
              <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagEconomics')">{{ 'home.tagEconomics' | t }}</button>
              <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagAnatomy')">{{ 'home.tagAnatomy' | t }}</button>
            </div>

            <!-- The supply side had exactly one entry point on this page, a
                 ghost button buried under the waitlist card, even though a
                 marketplace this young needs sellers more than buyers. It
                 gets a peer slot to search instead. -->
            <p class="hero-sell">
              <span>{{ 'home.sellPrompt' | t }}</span>
              <a routerLink="/sell" class="hero-sell-link">{{ 'home.sellCtaHero' | t }}<span aria-hidden="true"> &#8594;</span></a>
            </p>

            <ul class="hero-trust">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--accent);flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {{ 'home.trustVerified' | t }}
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" width="16" height="16" style="color:var(--accent);flex-shrink:0"><path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.6l6.1-.9z"/></svg>
                {{ 'home.trustReviews' | t }}
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--accent);flex-shrink:0"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                {{ 'home.trustFree' | t }}
              </li>
            </ul>
          </div>

          <div class="hero-stack" *ngIf="covers.length">
            <a
              class="cover-card"
              *ngFor="let cover of covers; let i = index"
              [style.z-index]="covers.length - i"
              [style.--r]="heroCoverRotations(i)"
              [style.--x]="heroCoverOffsets(i)"
              [style.--hx]="heroCoverHoverOffsets(i)"
              [routerLink]="['/book']"
              [queryParams]="heroBookParams(cover)"
              (click)="cacheHeroBook(cover)"
            >
              <img *ngIf="cover.coverUrl" [src]="cover.coverUrl | bookCover: 3" [alt]="cover.title" />
              <span class="placeholder book-placeholder" *ngIf="!cover.coverUrl" aria-hidden="true">
                <span class="bp-title">{{ cover.title }}</span>
                <span class="bp-isbn" *ngIf="cover.isbn">{{ cover.isbn }}</span>
              </span>
              <span class="demand-tag stamp-tag" *ngIf="cover.count">{{ 'home.waitingCount' | t:{n: cover.count} }}</span>
            </a>
          </div>
        </div>
      </section>  `,
  styles: [`
    /* An extracted component's host defaults to display:inline, which stops
       it establishing a block box — child margins then collapse through it
       and the band loses height. */
    :host { display: block; }

    /* ---- hero ------------------------------------------------------- */
    .hero-search {
      padding-block: var(--space-8);
      background-color: var(--paper-warm);
      border-bottom: 1px solid var(--line);
      /* One step tighter than the --space-7 that separates ordinary sections:
         the band's own --space-8 padding already supplies most of the break,
         so the full section gap on top of it read as a gap in the page. Not
         zero, though — at zero the next section's heading sits directly on
         the band's border with no breathing room at all. */
      margin-bottom: var(--space-6);
    }
    /* Grid, not space-between. With the copy capped at ~480px and the cover
       stack only 220px wide, 'justify-content: space-between' pushed the two
       to opposite edges and left a 420px hole between them that read as
       missing content rather than as white space. */
    .hero-inner {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
      align-items: center;
      gap: var(--space-7);
    }
    .hero-copy { text-align: left; min-width: 0; width: 100%; }
    .search-title {
      font-family: 'Noto Serif TC', serif;
      font-size: var(--text-hero);
      font-weight: 700;
      line-height: 1.25;
      /* No negative tracking. The -0.01em here was a Latin optical correction
         applied to a string that is almost entirely full-width CJK, where it
         just crushes the glyphs together; Han type needs its natural advance
         width, and the Latin brand name gets its own rule in the header. */
      letter-spacing: normal;
      margin: 0 0 var(--space-4);
      max-width: 16em;
      text-wrap: balance;
    }
    .hero-subtitle {
      margin: 0 0 var(--space-6);
      font-size: var(--text-lg);
      line-height: 1.6;
      color: var(--ink-soft);
      max-width: 32em;
    }
    .search-bar {
      display: flex;
      align-items: stretch;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
      max-width: 560px;
    }
    .hero-input-wrap { position: relative; flex: 1; min-width: 0; }
    .hero-input-wrap .search-icon {
      position: absolute;
      left: 2px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      pointer-events: none;
    }
    .hero-input { display: block; width: 100%; height: 100%; }
    /* The icon only stands in for the label below the breakpoint. */
    .search-submit .submit-icon { display: none; }
    /* Underline treatment for the hero search field only: ui-input hardcodes
       its own boxed border with no variant hook, so this is scoped narrowly
       via ::ng-deep to .hero-input rather than touched globally. The left
       padding makes room for .search-icon sitting inside the field. */
    .hero-input ::ng-deep .input-wrapper, .hero-input ::ng-deep input { height: 100%; }
    .hero-input ::ng-deep input {
      min-height: 48px;
      border: none;
      border-bottom: 2px solid var(--ink);
      border-radius: 0;
      background: none;
      padding: var(--space-2) var(--space-1) var(--space-2) var(--space-6);
      font-size: var(--text-lg);
    }
    .hero-input ::ng-deep input:focus-visible {
      border-bottom-color: var(--accent);
    }

    .popular-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--muted);
      margin-bottom: var(--space-5);
    }
    /* Real chips with a real hit area. These were 42x20px text links with a
       hairline underline — under half the minimum touch target, and visually
       indistinguishable from body copy. */
    .tag-btn {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: var(--space-1) var(--space-3);
      background: var(--paper);
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      color: var(--ink-soft);
      cursor: pointer;
      font-size: var(--text-sm);
      font-family: inherit;
      transition: background-color 0.2s, color 0.2s, border-color 0.2s;
    }
    @media (pointer: coarse) {
      .tag-btn { min-height: var(--tap-min); padding-inline: var(--space-4); }
    }
    .tag-btn:hover {
      background: var(--accent-soft);
    }

    .hero-sell, .hero-trust {
      display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4);
      font-size: var(--text-base); color: var(--ink-soft);
    }
    .hero-sell { gap: var(--space-2); margin: 0 0 var(--space-4); }
    .hero-sell-link {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
      border-bottom: 2px solid transparent;
    }
    .hero-sell-link:hover { border-bottom-color: var(--accent); }
    @media (pointer: coarse) {
      .hero-sell-link { min-height: var(--tap-min); }
    }

    /* "No commission" and "verified campus email" are the two reasons to pick
       this over a Facebook group, and they were buried in step 3's body copy
       at 14px. One line, in the hero, above the fold. */
    .hero-trust {
      margin: var(--space-4) 0 0; padding: 0; list-style: none;
      font-weight: 500;
    }
    .hero-trust li { display: flex; align-items: center; gap: 6px; }

    /* ---- hero cover stack -------------------------------------------- */
    .hero-stack {
      position: relative;
      width: 100%;
      max-width: 420px;
      aspect-ratio: 1 / 1;
      justify-self: end;
      margin-inline: auto;
    }
    .cover-card {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 240px;
      height: 336px;
      margin: -168px 0 0 -120px;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-card-lg);
      background-color: var(--paper);
      border: 1px solid var(--line-strong);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      transform: translateX(var(--x)) rotate(var(--r));
    }
    /* This lived in home.ts, merged into a shared '.wcover img, .cover-card img'
       selector to save bytes. That coupled the waitlist thumbnail to the hero
       cover; when the hero moved into this component the rule stayed behind,
       where view encapsulation could no longer reach the image — so it fell
       back to object-fit:fill at its intrinsic 128x178 inside a 240x336 card.
       Keep it here, and keep it un-merged. */
    .cover-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-card img, .cover-card .placeholder { border-radius: inherit; }
    /* type scale comes from the global .book-placeholder container queries */
    /* shape comes from the global .stamp-tag */
    .demand-tag {
      left: -8px; bottom: -8px; color: var(--flag);
      transition: opacity 0.2s ease;
    }
    .cover-card:not(:first-child) .demand-tag {
      opacity: 0;
      pointer-events: none;
    }
    
    /* Hover/Focus expanded state */
    .hero-stack:hover .cover-card,
    .hero-stack:focus-within .cover-card {
      transform: translateX(var(--hx)) scale(0.75);
    }
    .hero-stack:hover .cover-card:not(:first-child) .demand-tag,
    .hero-stack:focus-within .cover-card:not(:first-child) .demand-tag {
      opacity: 1;
      pointer-events: auto;
    }
    /* Single card hover effect while expanded */
    .hero-stack:hover .cover-card:hover,
    .hero-stack:focus-within .cover-card:hover,
    .hero-stack:focus-within .cover-card:focus-visible {
      transform: translateX(var(--hx)) scale(0.75) translateY(-6px) !important;
    }

    @media (hover: none) {
      .cover-card {
        transform: translateX(var(--hx)) scale(0.75);
      }
      .cover-card:not(:first-child) .demand-tag {
        opacity: 1;
        pointer-events: auto;
      }
      .cover-card:hover {
        transform: translateX(var(--hx)) scale(0.75) !important;
      }
    }

    @media (max-width: 768px) {
      .hero-search { padding-block: var(--space-5); margin-bottom: var(--space-5); }
      /* align-items must not be 'center' here: in a column flow that makes
         .hero-copy shrink-to-fit, which is why the search field ended up
         240px wide on a 375px screen while every other control on the page
         was 343px. */
      .hero-inner { grid-template-columns: minmax(0, 1fr); align-items: stretch; gap: var(--space-4); }
      /* Hide cover stack on mobile to save vertical space. The first screen
         needs to show real content below the fold. */
      .hero-stack { display: none; }
      /* No font-size override. The old '22px' here fought --text-hero's clamp
         and produced a 34px -> 22px cliff across a single pixel of viewport
         width, landing the hero title 2px away from .section-heading. The
         clamp's own lower bound handles small screens. */
      .search-title { line-height: 1.3; max-width: 100%; overflow-wrap: anywhere; }
      .hero-subtitle { font-size: var(--text-base); margin-bottom: var(--space-5); }
      /* Stays a row. Stacking put a 343x48 filled button under the field —
         the largest control on the screen for an action the field's own
         Enter key already performs. It collapses to a square icon instead,
         which is the shape ui-search-bar already uses elsewhere. */
      .search-bar { max-width: none; }
      .hero-input-wrap { flex: 1; min-width: 0; }
      /* Two magnifiers side by side would be the alternative, so the
         decorative one inside the field steps aside for the real control. */
      .hero-input-wrap .search-icon { display: none; }
      .hero-input ::ng-deep input { padding-left: var(--space-3); }
      /* Width goes on the host: .ui-btn is width:100%, so it inherits whatever
         the host is. The padding override has to out-specify .ui-btn.lg —
         matching its specificity only ties, and the tie goes to whichever
         component stylesheet the bundler emits last. */
      .search-submit { flex: 0 0 48px; align-self: stretch; }
      .search-submit ::ng-deep .ui-btn.lg { padding-inline: 0; }
      .search-submit .submit-icon { display: block; }

      /* The three blocks below the search field cost 230px here — 38% of the
         hero and 28% of the viewport, more than the title and subtitle put
         together — which left the first book starting 743px down an 812px
         screen, i.e. barely a sliver of it on the first screen. */

      /* Redundant on this breakpoint twice over: the page carries a dedicated
         seller band above "How it works", and the bottom tab bar keeps a Sell
         entry fixed on screen at all times. Desktop keeps it — there is no tab
         bar there. */
      .hero-sell { display: none; }

      /* Dropping the "Popular:" label frees roughly the width it occupied, and
         the three chips then settle on one row instead of wrapping to two.
         Preferred over making the row scroll horizontally: that would hide
         part of the set behind a gesture to save the same 52px. */
      .tag-label { display: none; }
      .popular-tags { margin-bottom: var(--space-4); }

      /* Kept at --text-base with the accent icons intact. What the earlier
         review objected to was the *hierarchy* — 13px --muted text sitting
         under a hairline rule, which read as a copyright notice — not the
         number of rows. Tightening the gaps lets the Chinese strings settle
         on one line (they are far shorter than the English); English still
         wraps, to two rows rather than three. */
      .hero-trust { gap: var(--space-1) var(--space-3); margin-top: var(--space-3); }
      .hero-trust li { gap: var(--space-1); }
    }
  `]
})
export class HomeHero {
  /** Books to show in the stack; the page decides which ones. */
  @Input() covers: HeroCover[] = [];

  searchQuery = '';

  private router = inject(Router);
  private i18n = inject(I18nService);

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() },
        replaceUrl: true
      });
    }
  }

  setSearchQuery(tag: string) { this.searchQuery = tag; this.onSearch(); }

  setSearchQueryFromKey(key: string) {
    const translated = this.i18n.t(key);
    if (translated && translated !== key) {
      this.setSearchQuery(translated);
    }
  }

  heroCoverRotations(i: number): string {
    const rotations = [-6, 4, -10];
    return `${rotations[i % rotations.length]}deg`;
  }

  heroCoverOffsets(i: number): string {
    const offsets = [0, 32, -24];
    return `${offsets[i % offsets.length]}px`;
  }

  heroCoverHoverOffsets(i: number): string {
    const hoverOffsets = [114, 0, -114];
    return `${hoverOffsets[i % hoverOffsets.length]}px`;
  }

  /** Route params for a hero cover; the anchor's href does the navigating. */
  heroBookParams(cover: HeroCover): Record<string, any> {
    const params: Record<string, any> = { local_cache: 'true' };
    if (cover.isbn) params['isbn'] = cover.isbn;
    else params['id'] = cover.id;
    return params;
  }

  /** Primes the detail-page cache on the way out; navigation is the link's job. */
  cacheHeroBook(cover: HeroCover) {
    if (typeof sessionStorage === 'undefined') return;
    const cached = {
      id: cover.id,
      title: cover.title,
      author: '',
      isbn: cover.isbn,
      coverUrl: cover.coverUrl,
      activeListings: 1
    };
    sessionStorage.setItem(`cachedBook_${cover.isbn || cover.id}`, JSON.stringify(cached));
  }

}
