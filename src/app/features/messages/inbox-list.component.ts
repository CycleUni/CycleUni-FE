import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, TPipe } from '../../core/i18n.service';
import { UiRoleBadge } from '../../shared/ui/role-badge.component';

/**
 * Conversation list in the Messages sidebar. Presentational: it renders the
 * conversations it is given and reports clicks; all loading, selection and
 * deletion logic stays in the Messages page.
 *
 * Extracted from that page, which had grown past the `anyComponentStyle`
 * build budget — see also UiImageLightbox and UiReportModal. The `.sidebar`
 * wrapper (and its responsive rules) stays with the parent, since that is
 * layout coordination between the sidebar and the chat area.
 */
@Component({
  selector: 'messages-inbox-list',
  standalone: true,
  imports: [CommonModule, TPipe, UiRoleBadge],
  template: `
    <div class="sidebar-header">
      <h3>{{ 'msg.inbox' | t }}</h3>
    </div>
    <div class="chat-list">
      <div
        class="chat-item"
        *ngFor="let chat of chats"
        [class.active]="activeChatId === chat.id"
        [class.role-buyer]="chat.other_party_role === 'buyer'"
        [class.role-seller]="chat.other_party_role === 'seller'"
        (click)="select.emit(chat)"
      >
        <div class="chat-meta">
          <span class="chat-partner">{{ chat.other_party }}</span>
          <div class="chat-meta-right">
            <ui-role-badge [role]="chat.other_party_role"></ui-role-badge>
            <span class="unread-dot" *ngIf="chat._hubUnread"></span>
            <button class="chat-delete-btn" type="button" [title]="'msg.deleteConversation' | t"
                    (click)="$event.stopPropagation(); remove.emit(chat)">×</button>
          </div>
        </div>
        <div class="chat-subject">{{ 'msg.bookPrefix' | t:{title: chat.listing_title} }}</div>
        <div class="chat-preview">{{ formatPreview(chat.latest_message) }}</div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--line);
    }
    .sidebar-header h3 {
      margin: 0;
      font-size: 18px;
    }
    .chat-list {
      flex: 1;
      overflow-y: auto;
    }
    .chat-item {
      padding: 16px;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
    }
    .chat-item:hover {
      background-color: var(--paper);
    }
    .chat-item.active {
      background-color: var(--paper);
      border-left: 3px solid var(--accent);
    }
    .chat-item.active.role-buyer {
      border-left-color: var(--flag);
    }
    .chat-item.active.role-seller {
      border-left-color: var(--accent);
    }
    .chat-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }
    .chat-partner {
      font-weight: 700;
      color: var(--ink);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chat-meta-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent);
      flex-shrink: 0;
    }
    .chat-delete-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--muted);
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
      flex-shrink: 0;
    }
    .chat-delete-btn:hover {
      color: var(--flag);
    }
    .chat-item:hover .chat-delete-btn {
      display: inline-block;
    }
    .chat-subject {
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 8px;
    }
    .chat-preview {
      font-size: 14px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class MessagesInboxList {
  @Input() chats: any[] = [];
  @Input() activeChatId: string | null = null;
  @Output() select = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();

  private i18n = inject(I18nService);

  /**
   * Resolves a `[SYSTEM:<i18nKey>]` preview (order notifications, image
   * placeholders) to text in the viewer's language. Previews are written
   * server-side and shared by both participants, so they carry a key rather
   * than pre-translated text — see IMAGE_PREVIEW_TOKEN.
   */
  formatPreview(body: string): string {
    // Back-compat: previews written before image placeholders became an i18n
    // token still hold a literal Chinese string.
    if (body === '[圖片]') return this.i18n.t('msg.imagePlaceholder') || body;
    if (!body || !body.startsWith('[SYSTEM:')) return body;
    const match = body.match(/\[SYSTEM:([^\]]+)\]/);
    if (!match) return body;
    return this.i18n.t(match[1]) || body;
  }
}
