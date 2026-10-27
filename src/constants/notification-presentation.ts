import type { ComponentProps } from 'react';
import type { SymbolView } from 'expo-symbols';

type NotificationVisual = { icon: ComponentProps<typeof SymbolView>['name']; foreground: string; background: string };

export const notificationTheme = {
  page: '#F3F8FF', surface: '#FFFFFF', border: '#E1EAF6', divider: '#EAF0F8',
  title: '#10284B', secondary: '#596F8E', blue: '#1769E0', active: '#1769E0',
  badge: '#EAF3FF', hovered: '#F1F7FF', unread: '#F7FAFF', error: '#C73542',
} as const;

// One registry owns cross-platform glyphs and their color pairs for every notification surface.
export const notificationVisuals = {
  like: { icon: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }, foreground: '#DF3656', background: '#FFF0F3' },
  comment: { icon: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }, foreground: '#1769E0', background: '#EAF3FF' },
  mention: { icon: { ios: 'at', android: 'alternate_email', web: 'alternate_email' }, foreground: '#833CE6', background: '#F2EAFF' },
  reply: { icon: { ios: 'arrowshape.turn.up.left', android: 'reply', web: 'reply' }, foreground: '#11855A', background: '#E6FAF0' },
  follow: { icon: { ios: 'person.2', android: 'group_add', web: 'group_add' }, foreground: '#833CE6', background: '#F2EAFF' },
  community: { icon: { ios: 'person.2', android: 'groups', web: 'groups' }, foreground: '#833CE6', background: '#F2EAFF' },
  verification: { icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }, foreground: '#11855A', background: '#E6FAF0' },
  recruitment: { icon: { ios: 'briefcase', android: 'work_outline', web: 'work_outline' }, foreground: '#C36909', background: '#FFF3E5' },
  project: { icon: { ios: 'person.3', android: 'groups', web: 'groups' }, foreground: '#1769E0', background: '#EAF3FF' },
  system: { icon: { ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }, foreground: '#C36909', background: '#FFF3E5' },
  default: { icon: { ios: 'bell', android: 'notifications_none', web: 'notifications_none' }, foreground: '#596F8E', background: '#EDF2F8' },
} as const satisfies Record<string, NotificationVisual>;

export const notificationTypeVisuals: Readonly<Record<string, keyof typeof notificationVisuals>> = {
  'community.post.liked': 'like', 'community.comment.created': 'comment',
  'community.mentioned': 'mention', 'community.post.mentioned': 'mention',
  'community.comment.replied': 'reply', 'community.user.followed': 'follow',
  'community.report.submitted': 'community', 'systemannouncement': 'system',
};

export function notificationVisual(type: string, category: string): NotificationVisual {
  const event = type.toLowerCase(), group = category.toLowerCase();
  const key = Object.prototype.hasOwnProperty.call(notificationTypeVisuals, event) ? notificationTypeVisuals[event]
    : Object.prototype.hasOwnProperty.call(notificationVisuals, group) ? group as keyof typeof notificationVisuals : 'default';
  return notificationVisuals[key];
}
