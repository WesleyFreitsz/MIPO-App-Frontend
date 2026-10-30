export interface PresentUser {
  id: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface StorePresence {
  count: number;
  users: PresentUser[];
  me: { checkedIn: boolean; visitId?: string; checkedInAt?: string };
}

export interface StaffUser extends PresentUser {
  checkedIn: boolean;
  checkedInAt: string | null;
}

export interface CheckinCode {
  code: string;
  qrContent: string;
  createdAt: string;
}

export interface VisitorStats {
  user: PresentUser;
  visits: number;
  distinctDays: number;
  avgMinutes: number | null;
  lastVisitAt: string;
}

export interface VisitStats {
  year: number;
  month: number;
  totalVisits: number;
  uniqueVisitors: number;
  avgMinutes: number | null;
  byWeekday: number[];
  byHour: number[];
  ranking: VisitorStats[];
}

export const CHECKIN_LINK_PREFIX = "mipo://checkin/";

export function checkinCodeFromScan(data: string): string | null {
  const code = data.startsWith(CHECKIN_LINK_PREFIX) ? data.slice(CHECKIN_LINK_PREFIX.length) : null;
  return code && /^[\w-]{8,64}$/.test(code) ? code : null;
}

export function displayName(user: PresentUser): string {
  return user.nickname || user.name;
}
