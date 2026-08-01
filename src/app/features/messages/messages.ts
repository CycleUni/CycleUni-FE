import { Component, OnInit, inject, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { UiMeetupCard } from '../../shared/ui/meetup-card.component';
import { UiImageLightbox } from '../../shared/ui/image-lightbox.component';
import { UiReportModal } from '../../shared/ui/report-modal.component';
import { UiRoleBadge } from '../../shared/ui/role-badge.component';
import { MessagesInboxList } from './inbox-list.component';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../core/services/message.service';
import { AuthStore } from '../../core/auth.store';
import { OrderService } from '../../core/services/order.service';
import { ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TPipe, I18nService } from '../../core/i18n.service';
import { Subscription } from 'rxjs';
import { formatMessageTime, isMeetupRequest, cleanMeetupBody, IMAGE_PREVIEW_TOKEN } from './message-formatting.util';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiButton, UiInput, UiMeetupCard, TPipe, UiImageLightbox, UiReportModal, UiRoleBadge, MessagesInboxList],
  template: `
      <div class="messages-container" [class.mobile-chat-open]="!!activeChat" *ngIf="loadingChats || chats.length > 0">
        <div class="sidebar">
          <messages-inbox-list
            [chats]="chats"
            [activeChatId]="activeChat?.id ?? null"
            (select)="selectChat($event)"
            (remove)="deleteConversation($event)"
          ></messages-inbox-list>
        </div>

        <div class="chat-area" *ngIf="activeChat">
          <div class="chat-header">
            <button class="back-btn" type="button" (click)="closeChat()">{{ 'msg.back' | t }}</button>
            <div class="partner-info">
              <h4>
                {{ 'msg.conversationWith' | t:{name: activeChat.other_party} }}
                <ui-role-badge [role]="activeChat.other_party_role"></ui-role-badge>
              </h4>
            </div>
            <div class="connection-status" *ngIf="connectionState === 'reconnecting'">
              <span class="reconnecting-badge">{{ 'msg.reconnecting' | t }}</span>
            </div>
            <button class="report-btn" type="button" (click)="showReport = true" [title]="'msg.reportConversation' | t">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>
          </div>
          
          <ui-report-modal
            *ngIf="showReport"
            [conversationId]="activeChat.id"
            [reportedPartyId]="reportedPartyId"
            (close)="showReport = false"
          ></ui-report-modal>

          <ui-image-lightbox [src]="selectedImageUrl" (close)="closeImageModal()"></ui-image-lightbox>

          <div class="listing-banner" *ngIf="activeChat.listing_title">
            <div class="listing-banner-left" (click)="goToListing(activeChat.listing_id)">
              <img *ngIf="activeChat.listing_photo" [src]="activeChat.listing_photo" alt="Cover" class="listing-thumb">
              <div class="placeholder-thumb" *ngIf="!activeChat.listing_photo"></div>
              <div class="listing-details">
                <div class="listing-title">{{ activeChat.listing_title }}</div>
                <div class="listing-meta">
                  <span class="price">NT$ {{ activeChat.listing_price }}</span>
                  <span class="condition badge">{{ ('cond.' + activeChat.listing_condition) | t }}</span>
                  <span class="course" *ngIf="activeChat.listing_course">{{ activeChat.listing_course }}</span>
                </div>
              </div>
            </div>

            <div class="listing-banner-actions">
              <ng-container *ngIf="activeChat.order_id">
                <ui-button variant="ghost" (onClick)="goToOrder()">
                  {{ 'msg.viewOrder' | t }}
                </ui-button>
              </ng-container>

              <ng-container *ngIf="!activeChat.order_id">
                <ng-container *ngIf="activeChat.other_party_role === 'seller'">
                  <ui-button variant="ghost" (onClick)="goToListing(activeChat.listing_id)">
                    {{ 'msg.viewListing' | t }}
                  </ui-button>
                  <ui-button (onClick)="goToCheckout(activeChat.listing_id)">
                    {{ 'msg.buyNow' | t }}
                  </ui-button>
                </ng-container>

                <ng-container *ngIf="activeChat.other_party_role === 'buyer'">
                  <ui-button variant="ghost" (onClick)="goToListing(activeChat.listing_id)">
                    {{ 'msg.viewListing' | t }}
                  </ui-button>
                </ng-container>
              </ng-container>
            </div>
          </div>
          
          <div class="message-history" #scrollMe>
            <div class="msg-bubble" *ngFor="let msg of messages" [class.self]="msg.is_mine" [class.failed]="msg.failed" [class.meetup-card]="isMeetupRequest(msg.body)" [class.image-msg]="msg.message_type === 'image'">
              <ng-container *ngIf="isMeetupRequest(msg.body); else normalMsg">
                <ui-meetup-card
                  [body]="msg.body"
                  [userRole]="activeChat.other_party_role === 'seller' ? 'buyer' : 'seller'"
                  [isPendingApproval]="isPendingApproval(msg)"
                  (onAccept)="handleAcceptMeetup()"
                  (onDecline)="handleDeclineMeetup()"
                  (onCancel)="handleCancelMeetup()"
                ></ui-meetup-card>
              </ng-container>
              <ng-template #normalMsg>
                <ng-container *ngIf="msg.message_type === 'image'; else textMsg">
                  <img 
                    [src]="msg._expired ? expiredImageSrc() : msg.body" 
                    [alt]="'msg.image' | t" 
                    class="chat-image"
                    [class.expired]="msg._expired"
                    (click)="openImageModal(msg.body, $event)"
                    (error)="onImageError(msg)"
                    (load)="scrollToBottom(false)"
                  >
                </ng-container>
                <ng-template #textMsg>
                  <div class="msg-content">
                    {{ msg.body }}
                    <button
                      class="msg-delete-btn"
                      type="button"
                      [title]="'msg.delete' | t"
                      (click)="deleteMessage(msg.id)"
                    >×</button>
                  </div>
                </ng-template>
              </ng-template>
              <div class="msg-status" *ngIf="msg.failed">
                <span class="msg-failed-text">{{ 'msg.sendFailed' | t }}</span>
                <button class="msg-retry-btn" type="button" (click)="retryMessage(msg)">{{ 'msg.retry' | t }}</button>
              </div>
              <div class="msg-time" *ngIf="!msg.failed">{{ formatMessageTime(msg.created_at) }}</div>
            </div>
          </div>

          <div class="message-input-area">
            <div class="input-wrapper">
              <input
                type="file"
                #fileInput
                accept="image/*"
                capture="environment"
                (change)="onFileSelected($event)"
                style="display: none;"
              >
              <button 
                type="button" 
                class="attach-btn" 
                (click)="fileInput.click()"
                [disabled]="uploadingImage || connectionState === 'reconnecting'"
                [title]="'msg.attachImage' | t"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <ui-input
                [placeholder]="'msg.placeholder' | t"
                style="flex: 1;"
                [noMargin]="true"
                [(ngModel)]="newMessage"
                (compositionstart)="imeComposing = true"
                (compositionend)="onCompositionEnd()"
                (keyup.enter)="onEnterKey($event)"
              ></ui-input>
            </div>
            <div *ngIf="uploadingImage" class="upload-progress">
              <div class="progress-bar" [style.width.%]="uploadProgress"></div>
              <span>{{ uploadProgress }}%</span>
            </div>
            <ui-button 
              (onClick)="sendMessage()" 
              [disabled]="connectionState === 'reconnecting' || uploadingImage"
            >{{ 'msg.send' | t }}</ui-button>
          </div>
        </div>

        <div class="chat-area empty-state" *ngIf="!activeChat && !loadingChats">
          <p>{{ 'msg.selectPrompt' | t }}</p>
        </div>
      </div>

      <div class="empty-state empty-inbox full-page" *ngIf="!loadingChats && chats.length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" aria-hidden="true">
          <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
        </svg>
        <h4>{{ 'msg.emptyInboxTitle' | t }}</h4>
        <p>{{ 'msg.emptyInboxDesc' | t }}</p>
        <button class="browse-btn" type="button" routerLink="/search">{{ 'msg.browseBooks' | t }}</button>
      </div>
  `,
  styles: [`
    .messages-container {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      height: calc(100vh - 200px);
      border: 1px solid var(--line);
      margin-top: 32px;
      background-color: var(--paper);
    }
    .empty-state.full-page {
      max-width: 1120px;
      height: calc(100vh - 200px);
      border: 1px solid var(--line);
      margin: 32px auto 0;
    }
    .sidebar {
      width: 320px;
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      background-color: var(--paper-warm);
    }

    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      background-color: var(--paper-warm);
      text-align: center;
      padding: 24px;
    }
    .empty-inbox svg {
      color: var(--line);
      margin-bottom: 16px;
    }
    .empty-inbox h4 {
      margin: 0 0 8px;
      color: var(--ink);
      font-size: 16px;
    }
    .empty-inbox p {
      margin: 0 0 20px;
      max-width: 280px;
      font-size: 14px;
      line-height: 1.5;
    }
    .browse-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      background-color: var(--accent);
      color: white;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
    }
    .browse-btn:hover {
      opacity: 0.9;
    }
    .chat-header {
      padding: 16px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--paper);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .listing-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      background: var(--paper-warm);
      border-bottom: 1px solid var(--line);
    }
    .listing-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }
    .listing-banner-left:hover .listing-title {
      color: var(--accent);
    }
    .listing-banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .listing-thumb {
      width: 48px;
      height: 64px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid var(--line);
    }
    .placeholder-thumb {
      width: 48px;
      height: 64px;
      background: var(--line);
      border-radius: 4px;
    }
    .listing-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .listing-title {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .listing-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .price {
      color: var(--accent);
      font-weight: 700;
    }
    .badge {
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--line);
      color: var(--ink);
      font-size: 11px;
    }
    .course {
      color: var(--muted);
    }
    .back-btn {
      display: none;
      background: none;
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 14px;
      color: var(--ink);
      cursor: pointer;
      flex-shrink: 0;
    }
    .partner-info {
      flex: 1;
    }
    .partner-info h4 {
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .partner-info p {
      margin: 0;
      font-size: 14px;
      color: var(--muted);
    }
    .partner-info a {
      color: var(--accent);
      text-decoration: none;
    }
    .connection-status {
      display: flex;
      align-items: center;
    }
    .reconnecting-badge {
      background-color: #f39c12;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .message-history {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .msg-bubble {
      max-width: 60%;
      align-self: flex-start;
    }
    .msg-bubble.self {
      align-self: flex-end;
    }
    .msg-content {
      position: relative;
      padding: 12px 16px;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
      border-radius: 4px;
      font-size: 15px;
      line-height: 1.5;
    }
    .msg-delete-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      line-height: 18px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 50%;
      background-color: var(--paper);
      color: var(--muted);
      font-size: 14px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .msg-bubble:hover .msg-delete-btn {
      opacity: 1;
    }
    .msg-delete-btn:hover {
      color: var(--ink);
      border-color: var(--muted);
    }
    .msg-bubble.self .msg-content {
      background-color: #f0f7f4;
      border-color: #d1e8de;
    }
    .msg-bubble.failed .msg-content {
      background-color: #fdf1f1;
      border-color: #f0c9c9;
    }
    .msg-bubble.meetup-card {
      max-width: 340px;
    }

    .msg-time {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
      text-align: right;
    }
    .msg-bubble:not(.self) .msg-time {
      text-align: left;
    }
    .msg-status {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
    .msg-failed-text {
      font-size: 11px;
      color: #c0392b;
    }
    .msg-retry-btn {
      background: none;
      border: none;
      padding: 0;
      font-size: 11px;
      color: var(--accent);
      text-decoration: underline;
      cursor: pointer;
    }

    .message-input-area {
      padding: 16px;
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .report-btn {
      background: none;
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      color: var(--muted);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .report-btn:hover {
      color: var(--flag);
      border-color: var(--flag);
    }

    @media (max-width: 768px) {
      .messages-container,
      .empty-state.full-page {
        margin: 16px;
        height: calc(100vh - 160px);
      }
      /* Single-pane pattern: show the inbox list, or the active chat with a back button */
      .sidebar {
        width: 100%;
        border-right: none;
      }
      .chat-area {
        display: none;
      }
      .mobile-chat-open .sidebar {
        display: none;
      }
      .mobile-chat-open .chat-area {
        display: flex;
      }
      .back-btn {
        display: inline-block;
      }
      .chat-header {
        padding: 12px 16px;
      }
      .message-history {
        padding: 16px;
      }
      .msg-bubble {
        max-width: 85%;
      }
    }

    /* Image message styles */
    .msg-bubble.image-msg {
      max-width: 300px;
    }
    .chat-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      cursor: zoom-in;
      object-fit: contain;
      background: var(--paper-warm);
    }
    .msg-bubble.self .chat-image {
      background: #f0f7f4;
    }

    /* Input wrapper for attach button + input */
    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .attach-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--paper);
      color: var(--ink);
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .attach-btn:hover:not(:disabled) {
      background: var(--paper-warm);
      border-color: var(--muted);
      color: var(--accent);
    }
    .attach-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Upload progress */
    .upload-progress {
      position: absolute;
      bottom: 60px;
      left: 16px;
      right: 16px;
      height: 6px;
      background: var(--line);
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 11px;
      color: var(--muted);
    }
    .progress-bar {
      height: 100%;
      background: var(--accent);
      transition: width 0.2s;
    }
    .message-input-area {
      position: relative;
    }

  `]
})
export class Messages implements OnInit, OnDestroy {
  chats: any[] = [];
  activeChat: any = null;
  messages: any[] = [];
  newMessage = '';
  chatToken = '';
  edgeChatUrl = '';
  userId = '';
  connectionState: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';
  imeComposing = false;
  showReport = false;
  // Image upload state
  uploadingImage = false;
  uploadProgress = 0;
  // Lightbox state: the URL alone drives it (empty = closed), so there is
  // no separate open flag that could disagree with it.
  selectedImageUrl = '';
  // Distinguishes "still loading" from "genuinely no conversations" so the
  // empty-inbox state doesn't flash for users who do have conversations,
  // just before loadConversations() resolves.
  loadingChats = true;
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: HTMLInputElement;

  private messageService = inject(MessageService);
  private authStore = inject(AuthStore);
  private orderService = inject(OrderService);
  readonly i18n = inject(I18nService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private wsSubscription?: Subscription;
  private deletionSubscription?: Subscription;
  private ackSubscription?: Subscription;
  private errorSubscription?: Subscription;
  private connectionSubscription?: Subscription;
  private roomUpdateSubscription?: Subscription;
  private unreadStateSubscription?: Subscription;

  private rawEdgeMsgs: any[] = [];
  // Temp ids of messages sent but not yet confirmed by the server, oldest first
  private pendingTempIds: string[] = [];
  // Enter confirming an IME candidate (e.g. Zhuyin) fires `compositionend`
  // and the Enter `keyup` in the same tick, and by then some browsers have
  // already flipped `isComposing` back to false on that keyup — so a plain
  // `event.isComposing` check alone isn't reliable. This flag stays true
  // through that same tick as a fallback, then clears itself.
  private imeJustEnded = false;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.loadConversations();

    // Live "new activity" events for every conversation this user is part
    // of, from the single per-user hub connection — not just the one that's
    // currently open — so the inbox can show previews/unread badges without
    // a socket per conversation.
    this.roomUpdateSubscription = this.messageService.roomUpdates$.subscribe(update => {
      const chat = this.chats.find(c => c.id === update.room_id);
      if (!chat) return;

      chat.latest_message = update.preview;
      chat.updated_at = new Date(update.timestamp).toISOString();
      this.cdr.markForCheck();
    });

    // Unread state lives in CFEdgeChat's UserHub, not Django. Merge the hub's
    // per-conversation unread map into chat objects so the template can show
    // the dot without relying on the removed `unread` serializer field.
    this.unreadStateSubscription = this.messageService.conversationUnreadState$.subscribe(state => {
      for (const chat of this.chats) {
        const conversationId = String(chat.id);
        (chat as any)._hubUnread = state.get(conversationId) ?? false;
      }
      this.cdr.markForCheck();
    });

    this.wsSubscription = this.messageService.realTimeMessages$.subscribe(msg => {
      if (this.activeChat) {
        const exists = this.messages.some(m => m.id === msg.id || (m.id.startsWith('temp_') && m.body === msg.content && m.is_mine));
        if (!exists) {
          this.messages.push({
            id: msg.id,
            body: msg.content,
            is_mine: String(msg.user_id) === String(this.userId),
            created_at: new Date(msg.timestamp).toISOString(),
            message_type: msg.message_type || 'text'
          });
        }
        // An image message's content is its URL — show the placeholder
        // instead of a raw https://…/chat/….webp in the inbox preview.
        this.activeChat.latest_message =
          (msg.message_type || 'text') === 'image' ? IMAGE_PREVIEW_TOKEN : msg.content;

        // Order-status system messages (meetup requested/approved/rejected/
        // cancelled/delivered) change what `isPendingApproval()` should
        // return for the meetup card's buttons — but `activeChat.order_status`
        // is only ever populated from a REST call, never updated by this
        // socket. Without refetching it here, a live-received status change
        // (e.g. the seller declining) wouldn't be reflected until the page
        // is reloaded.
        if (typeof msg.content === 'string' && msg.content.startsWith('[SYSTEM:') && msg.content.includes('order.notify.')) {
          this.refreshOrderStatus();
        }

        this.cdr.markForCheck();
        setTimeout(() => this.scrollToBottom(), 50);

        // Keep the server-side read pointer moving while this chat is
        // actively open, so it doesn't show as unread elsewhere (nav badge,
        // another device) for messages the user is already looking at live.
        this.messageService.markConversationReadCF(this.activeChat.id, this.chatToken, this.edgeChatUrl, this.userId).subscribe({
          error: () => { }
        });
      }
    });

    this.deletionSubscription = this.messageService.realTimeDeletions$.subscribe(id => {
      this.messages = this.messages.filter(m => m.id !== id);
      this.cdr.markForCheck();
    });

    // Reconcile the optimistic temp bubble with the real server-assigned id
    // (in send order) so deleting a just-sent message targets a real row.
    this.ackSubscription = this.messageService.realTimeAcks$.subscribe(ack => {
      const tempId = this.pendingTempIds.shift();
      const msg = this.messages.find(m => m.id === tempId);
      if (msg) {
        msg.id = ack.id;
      }
    });

    // A send that got this far (past the synchronous "socket open?" check in
    // sendMessage()) but was rejected by the server, or the socket dropped
    // before an ack came back — same send-order correlation as acks, since a
    // given send resolves to exactly one of ack or error, never both.
    this.errorSubscription = this.messageService.sendErrors$.subscribe((errMsg) => {
      const tempId = this.pendingTempIds.shift();
      const msg = this.messages.find(m => m.id === tempId);
      if (msg) {
        msg.failed = true;
        this.cdr.markForCheck();
      }
      // Check for system message forbidden error from CFEdgeChat DO
      if (errMsg && errMsg.includes('FORBIDDEN_SYSTEM_MESSAGE')) {
        alert(this.i18n.t('msg.errSystemMessageForbidden'));
      }
    });

    this.connectionSubscription = this.messageService.connectionState$.subscribe(state => {
      this.connectionState = state;

      if (state === 'connected' && this.activeChat && this.chatToken && this.edgeChatUrl) {
        // Already loaded via selectChat's eager fetch; don't overwrite
        if (this.messages.length > 0) {
          this.cdr.markForCheck();
          return;
        }
        this.messageService.getEdgeMessages(this.activeChat.id, this.chatToken, this.edgeChatUrl).subscribe({
          next: (data) => {
            this.setEdgeMessages(data || []);
          },
          error: () => {
            this.setEdgeMessages([]);
          }
        });
      }

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    // The hub connection is owned by the app shell (ui-layout), not this
    // page, so it stays alive across navigation — only disconnectEdgeChat
    // (the per-room connection for whichever chat was open) belongs here.
    this.messageService.disconnectEdgeChat();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.deletionSubscription) {
      this.deletionSubscription.unsubscribe();
    }
    if (this.ackSubscription) {
      this.ackSubscription.unsubscribe();
    }
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    if (this.roomUpdateSubscription) {
      this.roomUpdateSubscription.unsubscribe();
    }
    if (this.unreadStateSubscription) {
      this.unreadStateSubscription.unsubscribe();
    }
  }

  loadConversations() {
    this.messageService.getConversations().subscribe({
      next: (data) => {
        this.chats = data;
        // Apply current Hub unread state immediately after loading
        // so re-entering the page shows correct dots without waiting
        // for the next Hub event.
        const currentState = this.messageService.conversationUnreadState$.value;
        for (const chat of this.chats) {
          (chat as any)._hubUnread = currentState.get(String(chat.id)) ?? false;
        }
        this.loadingChats = false;

        this.route.queryParams.subscribe(params => {
          if (params['chat']) {
            const chat = this.chats.find(c => c.id === params['chat']);
            if (chat) {
              this.selectChat(chat);
            }
          } else if (params['listing']) {
            const listingId = params['listing'];
            const existingChat = this.chats.find(c => String(c.listing_id) === String(listingId));
            if (existingChat) {
              this.router.navigate([], { queryParams: { chat: existingChat.id }, replaceUrl: true });
            } else {
              this.messageService.startConversation(listingId).subscribe({
                next: (newChat) => {
                  this.chats.unshift(newChat);
                  this.router.navigate([], { queryParams: { chat: newChat.id }, replaceUrl: true });
                },
                error: (err) => {
                  console.error('Failed to start conversation', err);
                  alert(this.i18n.t('msg.chatOpenFailed') || 'Failed to open chat');
                }
              });
            }
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.loadingChats = false;
        this.cdr.markForCheck();
      }
    });
  }

  closeChat() {
    this.activeChat = null;
  }

  selectChat(chat: any) {
    if (this.activeChat?.id === chat.id && this.messages.length > 0) return;
    this.activeChat = chat;
    this.pendingTempIds = [];
    this.messages = [];
    this.rawEdgeMsgs = [];
    chat._hubUnread = false;
    // Mark read is handled via CFEdgeChat after we fetch the room token

    // Fetch a token scoped to this specific room every time a chat is
    // opened — the backend checks the caller is actually a participant of
    // it, so this can't be used to open someone else's conversation.
    this.messageService.getChatToken(chat.id).subscribe({
      next: (res) => {
        this.chatToken = res.token;
        this.edgeChatUrl = res.edge_chat_url;
        try {
          const payload = JSON.parse(atob(res.token.split('.')[1]));
          this.userId = payload.user_id;
        } catch (e) { }

        this.messageService.markConversationReadCF(chat.id, this.chatToken, this.edgeChatUrl, this.userId).subscribe();

        // Fetch message history immediately via REST — don't wait for the
        // WebSocket connection to reach 'connected' (it may be delayed or
        // fail, leaving the message pane blank).
        this.messageService.getEdgeMessages(chat.id, this.chatToken, this.edgeChatUrl).subscribe({
      next: (data) => {
        console.log('[selectChat] getEdgeMessages raw response:', JSON.stringify(data).substring(0, 200));
        this.setEdgeMessages(data || []);
      },
      error: (err) => {
        console.error('[selectChat] getEdgeMessages failed:', err);
        this.setEdgeMessages([]);
      }
    });

        this.messageService.connectEdgeChat(chat.id, this.chatToken, this.userId, this.edgeChatUrl);
      },
      error: (err) => {
        console.error('Failed to fetch chat token', err);
        alert(this.i18n.t('msg.chatOpenFailed'));
        this.activeChat = null;
        this.cdr.markForCheck();
      }
    });
  }

  scrollToBottom(force: boolean = true): void {
    try {
      const el = this.myScrollContainer.nativeElement;
      const threshold = 200;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (force || isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) { }
  }

  formatMessageTime(dateString: string): string {
    const lang = this.i18n.lang() === 'en' ? 'en-US' : 'zh-TW';
    return formatMessageTime(dateString, lang);
  }

  onCompositionEnd() {
    this.imeComposing = false;
    this.imeJustEnded = true;
    setTimeout(() => { this.imeJustEnded = false; });
  }

  onEnterKey(event: Event) {
    if (this.imeComposing || this.imeJustEnded || (event as KeyboardEvent).isComposing) return;
    this.sendMessage();
  }

  sendMessage() {
    if (this.connectionState === 'reconnecting') return;
    if (this.newMessage.trim() && this.activeChat) {
      const text = this.newMessage.trim();
      this.newMessage = '';

      const tempMsg: any = {
        id: 'temp_' + Date.now(),
        body: text,
        is_mine: true,
        created_at: new Date().toISOString()
      };
      this.messages.push(tempMsg);
      this.activeChat.latest_message = text;
      this.cdr.markForCheck();
      setTimeout(() => this.scrollToBottom(), 10);

      this.trySend(tempMsg);
    }
  }

  retryMessage(msg: any) {
    msg.failed = false;
    this.cdr.markForCheck();
    this.trySend(msg);
  }

  private trySend(msg: any) {
    const sent = this.messageService.sendEdgeMessage(msg.body, msg.message_type || 'text', msg.metadata);
    if (sent) {
      // Resolved later by realTimeAcks$ (success) or sendErrors$ (failure).
      this.pendingTempIds.push(msg.id);
    } else {
      // Socket wasn't even open — no point waiting for a response that will
      // never arrive, flag it as failed right away.
      msg.failed = true;
      this.cdr.markForCheck();
    }
  }

  // Image upload handling
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.activeChat) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(this.i18n.t('msg.errInvalidImageType'));
      input.value = '';
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert(this.i18n.t('msg.errImageTooLarge'));
      input.value = '';
      return;
    }

    this.uploadingImage = true;
    this.uploadProgress = 0;
    this.cdr.markForCheck();

    this.messageService.uploadChatPhoto(file, this.activeChat.id).subscribe({
      next: (res) => {
        this.uploadProgress = 100;
        this.cdr.markForCheck();

        // Send the image message
        const tempMsg: any = {
          id: 'temp_' + Date.now(),
          body: res.url,
          message_type: 'image',
          metadata: { filename: file.name },
          is_mine: true,
          created_at: new Date().toISOString()
        };
        this.messages.push(tempMsg);
        this.activeChat.latest_message = IMAGE_PREVIEW_TOKEN;
        this.cdr.markForCheck();
        setTimeout(() => this.scrollToBottom(), 10);

        this.trySend(tempMsg);

        // Reset
        this.uploadingImage = false;
        this.uploadProgress = 0;
        input.value = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingImage = false;
        this.uploadProgress = 0;
        input.value = '';
        this.cdr.markForCheck();
        console.error('Image upload failed', err);
        alert(this.i18n.t('msg.uploadFailed'));
      }
    });
  }

  openImageModal(url: string, event?: Event) {
    if (event) {
      const img = event.target as HTMLImageElement;
      if (img.classList.contains('expired')) {
        return; // Don't open modal if image is expired
      }
    }
    this.selectedImageUrl = url;
  }

  closeImageModal() {
    this.selectedImageUrl = '';
  }

  readonly expiredImageSrc = computed(() => {
    // Read the signal so this computed updates when language changes
    this.i18n.lang(); 
    const fallbackMsg = this.i18n.t('msg.imageLoadFailed') || '';
    const svg = `<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6" rx="8"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${fallbackMsg}</text></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  });

  onImageError(msg: any) {
    msg._expired = true;
    this.cdr.markForCheck();
  }

  deleteMessage(id: string) {
    // Hide it locally right away; realTimeDeletions$ (delete_ack) will
    // confirm the same removal, and it becomes a no-op filter by then.
    this.messages = this.messages.filter(m => m.id !== id);
    this.cdr.markForCheck();
    // A message that never made it past sending has nothing to delete
    // server-side.
    if (!id.startsWith('temp_')) {
      this.messageService.deleteEdgeMessage(id);
    }
  }

  goToListing(listingId?: string) {
    if (listingId) {
      this.router.navigate(['/listing', listingId]);
    }
  }

  goToCheckout(listingId?: string) {
    if (listingId) {
      this.router.navigate(['/checkout', listingId]);
    }
  }

  goToOrder() {
    if (this.activeChat?.order_id) {
      this.router.navigate(['/account/orders'], { queryParams: { orderId: this.activeChat.order_id } });
    } else {
      this.router.navigate(['/account/orders']);
    }
  }

  private extractArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }

  private setEdgeMessages(edgeMsgsInput: any) {
    if (edgeMsgsInput !== undefined) {
      this.rawEdgeMsgs = this.extractArray(edgeMsgsInput);
      console.log('[setEdgeMessages] extracted messages count:', this.rawEdgeMsgs.length,
        'first msg body:', this.rawEdgeMsgs[0]?.content?.substring(0, 80));
    }

    const newMessages = this.rawEdgeMsgs.map(m => {
      const bodyText = m.content || m.body || '';
      const createdDate = m.timestamp ? new Date(m.timestamp).toISOString() : (m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString());
      const isMine = m.user_id
        ? String(m.user_id) === String(this.userId)
        : (m.is_mine !== undefined ? Boolean(m.is_mine) : false);

      return {
        id: m.id || bodyText,
        body: bodyText,
        is_mine: isMine,
        created_at: createdDate,
        message_type: m.message_type || 'text'
      };
    });

      this.messages = newMessages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    this.cdr.markForCheck();
    setTimeout(() => this.scrollToBottom(true), 50);
    setTimeout(() => this.scrollToBottom(true), 500); // Backup for slow rendering
  }

  private isMeetupRequestMsg(msg: any): boolean {
    if (!msg || !msg.body) return false;
    const isSystemMeetupRequest = msg.body.startsWith('[SYSTEM:') && msg.body.includes('order.notify.meetup_requested');
    return isSystemMeetupRequest || msg.body === '[MEETUP_REQUEST]';
  }

  isPendingApproval(msg: any): boolean {
    if (!this.activeChat || !this.isMeetupRequestMsg(msg)) return false;

    const orderIsAwaitingApproval =
      this.activeChat.order_status === 'awaiting_approval' || this.activeChat.order_status === 'pending';
    if (!orderIsAwaitingApproval) return false;

    // A conversation can accumulate more than one meetup-request message
    // over time (e.g. declined, then buyer requests again) — only the most
    // recent one is still actionable; earlier ones must show as processed,
    // regardless of the current order's status.
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.isMeetupRequestMsg(this.messages[i])) {
        return this.messages[i].id === msg.id;
      }
    }
    return false;
  }

  isMeetupRequest(body: string): boolean {
    return isMeetupRequest(body);
  }

  cleanMeetupBody(body: string): string {
    return cleanMeetupBody(body);
  }


  // Re-resolves activeChat.order_id/order_status from the server, always —
  // unlike getOrFetchOrderId, which short-circuits once order_id is cached.
  // Used when a live system message signals the order's status may have
  // just changed underneath the cached value.
  private refreshOrderStatus() {
    if (!this.activeChat?.listing_id) return;
    const chat = this.activeChat;

    this.orderService.getOrders().subscribe({
      next: (orders: any) => {
        const orderList = Array.isArray(orders) ? orders : (orders.results || []);
        const matching = orderList.find((o: any) => {
          const lId = typeof o.listing === 'object' ? o.listing?.id : o.listing;
          return String(lId) === String(chat.listing_id);
        });
        if (matching && this.activeChat === chat) {
          chat.order_id = matching.id;
          chat.order_status = matching.status;
          this.cdr.markForCheck();
        }
      },
      error: () => { /* stale status is recovered on next reload/refresh */ }
    });
  }

  private getOrFetchOrderId(callback: (orderId: string) => void) {
    if (this.activeChat?.order_id) {
      callback(this.activeChat.order_id);
      return;
    }
    if (!this.activeChat?.listing_id) {
      console.warn('Cannot perform action: No activeChat or listing_id');
      return;
    }

    this.orderService.getOrders().subscribe({
      next: (orders: any) => {
        const orderList = Array.isArray(orders) ? orders : (orders.results || []);
        const matching = orderList.find((o: any) => {
          const lId = typeof o.listing === 'object' ? o.listing?.id : o.listing;
          return String(lId) === String(this.activeChat.listing_id);
        });
        if (matching && matching.id) {
          if (this.activeChat) {
            this.activeChat.order_id = matching.id;
            this.activeChat.order_status = matching.status;
          }
          callback(matching.id);
        } else {
          console.error('No matching order found for listing', this.activeChat.listing_id);
        }
      },
      error: (err) => console.error('Failed to fetch orders', err)
    });
  }

  handleAcceptMeetup() {
    this.getOrFetchOrderId((orderId) => {
      this.orderService.updateOrderStatus(orderId, 'accepted').subscribe({
        next: () => {
          if (this.activeChat) this.activeChat.order_status = 'accepted';
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err.error?.detail || err.error?.status || err.message || 'Failed to accept meetup order';
          alert(this.i18n.t('msg.orderActionFailed', { msg }));
          console.error('Failed to accept meetup order', err);
        }
      });
    });
  }

  handleDeclineMeetup() {
    this.getOrFetchOrderId((orderId) => {
      this.orderService.updateOrderStatus(orderId, 'cancelled', 'seller_declined').subscribe({
        next: () => {
          if (this.activeChat) this.activeChat.order_status = 'cancelled';
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err.error?.detail || err.error?.status || err.message || 'Failed to decline meetup order';
          alert(this.i18n.t('msg.orderActionFailed', { msg }));
          console.error('Failed to decline meetup order', err);
        }
      });
    });
  }

  handleCancelMeetup() {
    this.getOrFetchOrderId((orderId) => {
      this.orderService.updateOrderStatus(orderId, 'cancelled', 'buyer_cancelled').subscribe({
        next: () => {
          if (this.activeChat) this.activeChat.order_status = 'cancelled';
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err.error?.detail || err.error?.status || err.message || 'Failed to cancel meetup order';
          alert(this.i18n.t('msg.orderActionFailed', { msg }));
          console.error('Failed to cancel meetup order', err);
        }
      });
    });
  }

  // Initialized in ngOnInit() so i18n.t() calls don't re-fire during
  // *ngFor change detection (causes infinite loop/freeze).
  /** The other participant — whoever in this conversation isn't the viewer. */
  get reportedPartyId(): string | number {
    const userId = this.authStore.user()?.id;
    return String(userId) === String(this.activeChat?.buyer_id)
      ? this.activeChat?.seller_id
      : this.activeChat?.buyer_id;
  }

  deleteConversation(chat: any) {
    if (!confirm(this.i18n.t('msg.confirmDeleteConversation'))) return;
    this.messageService.deleteConversation(chat.id).subscribe({
      next: () => {
        // Remove from sidebar
        this.chats = this.chats.filter(c => c.id !== chat.id);
        if (this.activeChat?.id === chat.id) {
          this.activeChat = null;
          this.messages = [];
        }
        this.cdr.markForCheck();
      }
    });
  }
}
