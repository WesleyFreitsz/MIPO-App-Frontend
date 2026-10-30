export const RECOMMENDATIONS_PATH = "/game-plays/recommendations";

export interface Recommendation {
  id: string;
  name: string;
  imageUrl: string | null;
  reason: string;
}
