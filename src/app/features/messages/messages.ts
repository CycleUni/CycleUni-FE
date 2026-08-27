import { Component, OnInit, AfterViewChecked, inject, ViewChild, ElementRef, computed } from '@angular/core';
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
import { UiVerificationPrompt } from '../../shared/ui/verification-prompt.component';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../core/services/message.service';
import { AuthStore } from '../../core/auth.store';
import { OrderService } from '../../core/services/order.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TPipe, I18nService } from '../../core/i18n.service';
import { Subscription } from 'rxjs';
import { MobileLayoutService } from '../../core/services/mobile-layout.service';
import { formatMessageTime, isMeetupRequest, cleanMeetupBody, IMAGE_PREVIEW_TOKEN } from './message-formatting.util';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiButton, UiInput, UiMeetupCard, TPipe, UiImageLightbox, UiReportModal, UiRoleBadge, MessagesInboxList, PricePipe, UiVerificationPrompt],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class Messages implements OnInit, AfterViewChecked, OnDestroy {
  chats: any[] = [];
  activeChat: any = null;
  messages: any[] = [];
  newMessage = '';
  showUnverifiedPrompt = false;
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
  @ViewChild('inputArea') private inputArea?: ElementRef<HTMLElement>;

  private inputAreaResizeObserver?: ResizeObserver;
  private observedInputArea?: HTMLElement;

  private messageService = inject(MessageService);
  private authStore = inject(AuthStore);
  private orderService = inject(OrderService);
  readonly i18n = inject(I18nService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private mobileLayout = inject(MobileLayoutService);
  private ga = inject(GoogleAnalyticsService);
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

  private readonly MAX_DRAFT_LENGTH = 2000;
  private readonly DRAFT_STORAGE_PREFIX = 'cycleuni.chat.draft.';

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
          this.insertMessageSorted({
            id: msg.id,
            body: msg.content,
            is_mine: String(msg.user_id) === String(this.userId),
            created_at: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
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
        if (ack.timestamp) {
          msg.created_at = new Date(ack.timestamp).toISOString();
          this.sortMessages();
        }
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

  ngAfterViewChecked() {
    // The message history reserves space for the fixed input area with
    // padding-bottom. That reserve used to be a hand-guessed 72px, which
    // was too small once the URL bar was showing — the container's bottom
    // edge then lines up with the input instead of sitting above it, so
    // the newest message ended up underneath. Publish the input's real
    // rendered height and let CSS reserve exactly that, the same
    // let-the-browser-measure-it approach .chat-top-fixed uses up top.
    const el = this.inputArea?.nativeElement;
    // Re-observe when the element itself changes: .chat-area is behind an
    // *ngIf, so switching conversations destroys and recreates this node.
    if (el && el !== this.observedInputArea) {
      this.inputAreaResizeObserver?.disconnect();
      this.observedInputArea = el;
      this.inputAreaResizeObserver = new ResizeObserver(() => {
        // Set on the shared ancestor, not the input itself — custom
        // properties inherit down, and .message-history is a sibling.
        const target = el.parentElement ?? el;
        target.style.setProperty('--input-area-height', `${el.offsetHeight}px`);
        // The reserve just changed, so a view pinned to the bottom is now
        // slightly off; re-pin it rather than leaving the last message
        // half-covered until the next scroll.
        this.scrollToBottom(false);
      });
      this.inputAreaResizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    if (this.activeChat?.id) {
      this.saveDraft(this.activeChat.id, this.newMessage);
    }
    this.inputAreaResizeObserver?.disconnect();
    // The hub connection is owned by the app shell (ui-layout), not this
    // page, so it stays alive across navigation — only disconnectEdgeChat
    // (the per-room connection for whichever chat was open) belongs here.
    this.mobileLayout.setHideBottomNav(false);
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
                  if (err?.status === 403 || err?.error?.error?.code === 'auth.errNotVerified' || err?.error?.error?.code === 'acct.errUnverified') {
                    this.showUnverifiedPrompt = true;
                  } else {
                    alert(this.i18n.t('msg.chatOpenFailed') || 'Failed to open chat');
                  }
                  this.cdr.markForCheck();
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
    if (this.activeChat?.id) {
      this.saveDraft(this.activeChat.id, this.newMessage);
    }
    this.newMessage = '';
    this.activeChat = null;
    this.mobileLayout.setHideBottomNav(false);
  }

  selectChat(chat: any) {
    if (this.activeChat?.id === chat.id && this.messages.length > 0) return;
    if (this.activeChat?.id && this.activeChat.id !== chat.id) {
      this.saveDraft(this.activeChat.id, this.newMessage);
    }
    this.activeChat = chat;
    this.newMessage = this.loadDraft(chat.id);
    this.mobileLayout.setHideBottomNav(true);
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
        // Responses can arrive out of order when the user switches chats
        // faster than these requests resolve. If a newer selectChat() call
        // has since moved activeChat elsewhere, this response belongs to a
        // conversation the user is no longer looking at — drop it instead
        // of overwriting the token/history/socket for the current one.
        if (this.activeChat?.id !== chat.id) return;

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
            if (this.activeChat?.id !== chat.id) return;
            this.setEdgeMessages(data || []);
          },
          error: (err) => {
            console.error('[selectChat] getEdgeMessages failed:', err);
            if (this.activeChat?.id !== chat.id) return;
            this.setEdgeMessages([]);
          }
        });

        this.messageService.connectEdgeChat(chat.id, this.chatToken, this.userId, this.edgeChatUrl);
      },
      error: (err) => {
        console.error('Failed to fetch chat token', err);
        if (this.activeChat?.id !== chat.id) return;
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
    // Block sending if the WebSocket is not fully open. In 'disconnected'
    // state the socket is still being established (initial connect) — sending
    // at that moment causes sendEdgeMessage() to return false and the message
    // is immediately marked as failed before the connection even had a chance
    // to open. 'reconnecting' is already handled, but 'disconnected' was not.
    if (this.connectionState !== 'connected') return;
    if (this.newMessage.trim() && this.activeChat) {
      const text = this.newMessage.trim();
      const chatId = this.activeChat.id;
      this.clearDraft(chatId);
      this.newMessage = '';

      const tempMsg: any = {
        id: 'temp_' + Date.now(),
        body: text,
        is_mine: true,
        created_at: new Date().toISOString()
      };
      this.insertMessageSorted(tempMsg);
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
      this.ga.trackSendMessage(this.activeChat?.id);
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

    // Preserve any pending optimistic messages that are currently in flight
    const pendingOptimistic = this.messages.filter(m => m.id && String(m.id).startsWith('temp_') && !newMessages.some(nm => nm.body === m.body && nm.is_mine));

    this.messages = [...newMessages, ...pendingOptimistic].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    this.cdr.markForCheck();
    setTimeout(() => this.scrollToBottom(true), 50);
    setTimeout(() => this.scrollToBottom(true), 500); // Backup for slow rendering
  }

  private insertMessageSorted(msg: any): void {
    const msgTime = new Date(msg.created_at).getTime();
    let low = 0;
    let high = this.messages.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const midTime = new Date(this.messages[mid].created_at).getTime();
      if (midTime <= msgTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.messages.splice(low, 0, msg);
  }

  private sortMessages(): void {
    this.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
        this.clearDraft(chat.id);
        this.chats = this.chats.filter(c => c.id !== chat.id);
        if (this.activeChat?.id === chat.id) {
          this.activeChat = null;
          this.messages = [];
          this.newMessage = '';
        }
        this.cdr.markForCheck();
      }
    });
  }

  onDraftChange(text: string) {
    if (this.activeChat?.id) {
      this.saveDraft(this.activeChat.id, text);
    }
  }

  private saveDraft(conversationId: string | number, text: string): void {
    if (!conversationId || typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const key = `${this.DRAFT_STORAGE_PREFIX}${conversationId}`;
      const capped = (text || '').slice(0, this.MAX_DRAFT_LENGTH);
      if (capped.length > 0) {
        window.sessionStorage.setItem(key, capped);
      } else {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable or quota exceeded — fail gracefully without throwing
    }
  }

  private loadDraft(conversationId: string | number): string {
    if (!conversationId || typeof window === 'undefined' || !window.sessionStorage) return '';
    try {
      const key = `${this.DRAFT_STORAGE_PREFIX}${conversationId}`;
      return window.sessionStorage.getItem(key) || '';
    } catch {
      return '';
    }
  }

  private clearDraft(conversationId: string | number): void {
    if (!conversationId || typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const key = `${this.DRAFT_STORAGE_PREFIX}${conversationId}`;
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage unavailable — ignore
    }
  }
}

