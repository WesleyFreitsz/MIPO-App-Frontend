import type { OrderItemKind } from "./lojaTypes";

export interface PendingReview {
  visit: { id: string; checkedInAt: string; checkedOutAt: string };
  orders: { id: string; createdAt: string; items: { kind: OrderItemKind; nameSnapshot: string; quantity: number }[] }[];
}

export const PENDING_REVIEW_KEY = ["reviews", "pending"] as const;

export function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
