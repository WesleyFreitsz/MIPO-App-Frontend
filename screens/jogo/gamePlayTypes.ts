export interface PlayUser {
  id: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface GamePlayItem {
  id: string;
  playedAt: string;
  source: "ORDER" | "MANUAL";
  note: string | null;
  game: { id: string; name: string; imageUrl: string | null };
  author: PlayUser | null;
  players: (PlayUser | null)[];
}

export interface GamePlaySummary {
  totalPlays: number;
  distinctGames: number;
  playsThisMonth: number;
  topGames: { id: string; name: string; imageUrl: string | null; plays: number }[];
}

export interface GamePlaysPage {
  data: GamePlayItem[];
  total: number;
  hasMore: boolean;
  summary: GamePlaySummary;
}
