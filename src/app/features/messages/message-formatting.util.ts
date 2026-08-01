// Pure formatting/parsing helpers extracted from the Messages component so
// they can be unit-tested standalone, without Angular DI or component state.

/**
 * Inbox-preview placeholder for an image message.
 *
 * Carries an i18n key instead of literal text because this preview is
 * persisted server-side (Django's `conversation.latest_message_body`) and
 * shown to *both* participants — who may be reading in different languages.
 * Resolving it at write time would bake one language into the database.
 * `formatSystemMessageForPreview` resolves it per viewer, using the same
 * `[SYSTEM:<i18nKey>]` convention the backend already uses for order
 * notifications.
 *
 * Must stay in sync with CFEdgeChat's IMAGE_PREVIEW_TOKEN (src/ChatRoom.ts),
 * which is what actually writes it for messages sent by the other party.
 */
export const IMAGE_PREVIEW_TOKEN = '[SYSTEM:msg.imagePlaceholder]';

/** Format a message timestamp relative to "now": time-only if today, weekday
 * if within the last week, month/day if this year, else full date. */
export function formatMessageTime(dateString: string, lang: 'en-US' | 'zh-TW'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

  const isThisYear = date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (diffDays === 0) {
    return timeStr;
  }

  if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date);
    return `${weekday} ${timeStr}`;
  }

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  if (isThisYear) {
    return `${month}/${day} ${timeStr}`;
  }

  const year = date.getFullYear();
  return `${year}/${month}/${day} ${timeStr}`;
}

/** Whether a raw message body is one of the meetup-flow control messages
 * (request/accept/decline/cancel). Generic [SYSTEM:xxx] messages (e.g. order
 * cancellation notices) are NOT meetup cards and should render as normal messages. */
export function isMeetupRequest(body: string): boolean {
  if (!body) return false;
  return body.includes('[MEETUP_REQUEST]') ||
    body.includes('[MEETUP_ACCEPT]') ||
    body.includes('[MEETUP_DECLINE]') ||
    body.includes('[MEETUP_CANCEL]') ||
    // Only match meetup-related SYSTEM messages, not generic ones
    body.includes('[SYSTEM:order.notify.meetup_requested]') ||
    body.includes('[SYSTEM:order.notify.meetup_accepted]') ||
    body.includes('[SYSTEM:order.notify.meetup_declined]') ||
    body.includes('[SYSTEM:order.notify.meetup_cancelled]') ||
    body.includes('[SYSTEM:order.notify.seller_approved]') ||
    body.includes('[SYSTEM:order.notify.seller_rejected]') ||
    body.includes('[SYSTEM:order.notify.cancelled_by_buyer]') ||
    body.includes('[SYSTEM:order.notify.cancelled_by_seller]') ||
    body.includes('[SYSTEM:order.notify.delivered]');
}

/** Strip the control-message markers, leaving just the human-readable text. */
export function cleanMeetupBody(body: string): string {
  if (!body) return '';
  return body
    .replace(/\[SYSTEM:[^\]]+\]/g, '')
    .replace(/\[MEETUP_(REQUEST|ACCEPT|DECLINE|CANCEL)\]/g, '')
    .trim();
}
