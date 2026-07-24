import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { UiMeetupCard } from '../../shared/ui/meetup-card.component';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../core/services/message.service';
import { AuthStore } from '../../core/auth.store';
import { OrderService } from '../../core/services/order.service';
import { ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TPipe, I18nService } from '../../core/i18n.service';
import { Subscription } from 'rxjs';
import { formatMessageTime, isMeetupRequest, cleanMeetupBody } from './message-formatting.util';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiButton, UiInput, UiMeetupCard, TPipe],
  template: `
      <div class="messages-container" [class.mobile-chat-open]="!!activeChat" *ngIf="loadingChats || chats.length > 0">
        <div class="sidebar">
          <div class="sidebar-header">
            <h3>{{ 'msg.inbox' | t }}</h3>
          </div>
          <div class="chat-list">
            <div
              class="chat-item"
              *ngFor="let chat of chats"
              [class.active]="activeChat?.id === chat.id"
              [class.role-buyer]="chat.other_party_role === 'buyer'"
              [class.role-seller]="chat.other_party_role === 'seller'"
              (click)="selectChat(chat)"
            >
              <div class="chat-meta">
                <span class="chat-partner">{{ chat.other_party }}</span>
                <div class="chat-meta-right">
                  <span class="role-badge" [class.seller]="chat.other_party_role === 'seller'">
                    {{ ('msg.role_' + chat.other_party_role) | t }}
                  </span>
                  <span class="unread-dot" *ngIf="chat.unread"></span>
                  <button class="chat-delete-btn" type="button" [title]="'msg.deleteConversation' | t" (click)="$event.stopPropagation(); deleteConversation(chat)">×</button>
                </div>
              </div>
              <div class="chat-subject">{{ 'msg.bookPrefix' | t:{title: chat.listing_title} }}</div>
              <div class="chat-preview">{{ formatSystemMessageForPreview(chat.latest_message) }}</div>
            </div>
          </div>
        </div>

        <div class="chat-area" *ngIf="activeChat">
          <div class="chat-header">
            <button class="back-btn" type="button" (click)="closeChat()">{{ 'msg.back' | t }}</button>
            <div class="partner-info">
              <h4>
                {{ 'msg.conversationWith' | t:{name: activeChat.other_party} }}
                <span class="role-badge" [class.seller]="activeChat.other_party_role === 'seller'">
                  {{ ('msg.role_' + activeChat.other_party_role) | t }}
                </span>
              </h4>
            </div>
            <div class="connection-status" *ngIf="connectionState === 'reconnecting'">
              <span class="reconnecting-badge">{{ 'msg.reconnecting' | t }}</span>
            </div>
          </div>
          
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
            <div class="msg-bubble" *ngFor="let msg of messages" [class.self]="msg.is_mine" [class.failed]="msg.failed" [class.meetup-card]="isMeetupRequest(msg.body)">
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
              <div class="msg-status" *ngIf="msg.failed">
                <span class="msg-failed-text">{{ 'msg.sendFailed' | t }}</span>
                <button class="msg-retry-btn" type="button" (click)="retryMessage(msg)">{{ 'msg.retry' | t }}</button>
              </div>
              <div class="msg-time" *ngIf="!msg.failed">{{ formatMessageTime(msg.created_at) }}</div>
            </div>
          </div>

          <div class="message-input-area">
            <ui-input
              [placeholder]="'msg.placeholder' | t"
              style="flex: 1;"
              [(ngModel)]="newMessage"
              (compositionstart)="imeComposing = true"
              (compositionend)="onCompositionEnd()"
              (keyup.enter)="onEnterKey($event)"
            ></ui-input>
            <ui-button 
              (onClick)="sendMessage()" 
              [disabled]="connectionState === 'reconnecting'"
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
    .chat-time {
      font-size: 12px;
      color: var(--muted);
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
    .role-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      background-color: var(--flag);
      color: white;
    }
    .role-badge.seller {
      background-color: var(--accent);
    }
    .chat-preview {
      font-size: 14px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
    .role-badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--flag);
      color: white;
      font-weight: normal;
    }
    .role-badge.seller {
      background: var(--accent);
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
    .listing-price {
      font-size: 24px;
      font-weight: 700;
      color: var(--accent);
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
    .msg-bubble.meetup-card .meetup-card-content {
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }
    .meetup-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .meetup-icon {
      font-size: 16px;
    }
    .meetup-title {
      color: var(--accent);
      font-weight: 700;
      font-size: 13px;
    }
    .meetup-card-body {
      font-size: 13px;
      color: var(--ink);
      margin: 0;
      line-height: 1.4;
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
      gap: 8px;
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
  // Distinguishes "still loading" from "genuinely no conversations" so the
  // empty-inbox state doesn't flash for users who do have conversations,
  // just before loadConversations() resolves.
  loadingChats = true;
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  private messageService = inject(MessageService);
  private authStore = inject(AuthStore);
  private orderService = inject(OrderService);
  readonly i18n = inject(I18nService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private wsSubscription?: Subscription;
  private deletionSubscription?: Subscription;
  private ackSubscription?: Subscription;
  private errorSubscription?: Subscription;
  private connectionSubscription?: Subscription;
  private roomUpdateSubscription?: Subscription;

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
      if (update.sender_id !== this.userId && this.activeChat?.id !== update.room_id) {
        chat.unread = true;
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
            created_at: new Date(msg.timestamp).toISOString()
          });
        }
        this.activeChat.latest_message = msg.content;

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
  }

  loadConversations() {
    this.messageService.getConversations().subscribe({
      next: (data) => {
        // `unread` comes straight from the server (Conversation.{buyer,seller}_last_read_at
        // vs updated_at) — the source of truth, not something computed here.
        this.chats = data;
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
    chat.unread = false;
    // Mark read is now handled via CFEdgeChat after we fetch the room token

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

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
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
    const sent = this.messageService.sendEdgeMessage(msg.body);
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
        created_at: createdDate
      };
    });

      this.messages = newMessages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    this.cdr.markForCheck();
    setTimeout(() => this.scrollToBottom(), 50);
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

  formatSystemMessageForPreview(body: string): string {
    if (!body || !body.startsWith('[SYSTEM:')) return body;
    const match = body.match(/\[SYSTEM:([^\]]+)\]/);
    if (!match) return body;
    const i18nKey = match[1];
    return this.i18n.t(i18nKey) || body;
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
