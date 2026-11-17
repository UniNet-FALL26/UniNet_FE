export type FriendRelationship = 'none' | 'self' | 'friends' | 'incoming' | 'outgoing';
export type FriendPerson = {
  accountId: string; profileId: string; fullName: string; nickname: string; avatarUrl: string | null;
  role: number; relationship: FriendRelationship; friendshipId: string | null; friendshipVersion: number | null;
};
export type FriendPage = { items: FriendPerson[]; page: number; pageSize: number; total: number };
export type FriendList = 'friends' | 'received' | 'sent' | 'people';
