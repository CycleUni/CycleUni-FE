import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-search-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-wrapper">
      <input 
        type="text" 
        [placeholder]="placeholder" 
        [value]="value" 
        (input)="onInput($event)" 
        (keyup.enter)="onSearchClick()"
        class="search-input"
      >
      <button class="search-btn" (click)="onSearchClick()" title="Search">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .search-wrapper {
      position: relative;
      width: 100%;
      margin-bottom: 24px;
      display: flex;
    }
    .search-input {
      width: 100%;
      padding: 12px 48px 12px 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      font-size: 16px;
      background: var(--paper-warm);
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .search-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--muted, #6c757d);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
    }
    .search-btn:hover {
      color: var(--accent);
      background-color: rgba(0,0,0,0.05);
    }
  `]
})
export class UiSearchBarComponent {
  @Input() placeholder: string = '';
  @Input() value: string = '';
  @Output() search = new EventEmitter<string>();

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
  }

  onSearchClick() {
    this.search.emit(this.value);
  }
}
