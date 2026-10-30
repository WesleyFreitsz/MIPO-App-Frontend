import { Jogo } from "../../types";

export interface RankingUser {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface RankingEntry {
  position: number;
  score: number;
  createdAt: string;
  user: RankingUser;
}

export interface MonthlyGame {
  id: string;
  year: number;
  month: number;
  gameId: string;
  game: Jogo;
  prizeFirst?: string | null;
  prizeSecond?: string | null;
  prizeThird?: string | null;
  rules?: string | null;
}

export interface MonthlyGameStanding extends MonthlyGame {
  podium: RankingEntry[];
  totalPlayers: number;
  myEntry: RankingEntry | null;
}

export interface MonthlyPeriod {
  year: number;
  month: number;
  isCurrent: boolean;
  games: MonthlyGameStanding[];
}

export type MonthlyGameScoreStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MonthlyGameScore {
  id: string;
  monthlyGameId: string;
  monthlyGame: MonthlyGame;
  score: number;
  status: MonthlyGameScoreStatus;
  proofImageUrl?: string | null;
  note?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  user?: RankingUser;
}

export interface Page<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

export function prizeFor(monthlyGame: MonthlyGame, position: number): string | null {
  if (position === 1) return monthlyGame.prizeFirst ?? null;
  if (position === 2) return monthlyGame.prizeSecond ?? null;
  if (position === 3) return monthlyGame.prizeThird ?? null;
  return null;
}

export function displayName(user: RankingUser): string {
  return user.nickname || user.name;
}

export const scoreStatusLabel: Record<MonthlyGameScoreStatus, string> = {
  PENDING: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

export interface GameUserMark {
  id: string;
  gameId: string;
  isFavorite: boolean;
  wantsToPlay: boolean;
  rating: number | null;
  review: string | null;
}

export interface GameReview {
  id: string;
  rating: number;
  review: string | null;
  updatedAt: string;
  user: RankingUser;
}
