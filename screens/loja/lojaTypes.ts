import type { AccentName } from "../../theme/tokens";

export type MenuCategory = "FOOD" | "DRINK" | "DESSERT" | "OTHER";
export type OrderStatus = "PENDING" | "PREPARING" | "DONE" | "CANCELED";
export type OrderItemKind = "MENU" | "GAME" | "HELP";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: MenuCategory;
  price: number;
  imageUrl: string | null;
  available: boolean;
  dailySpecial: boolean;
  sortOrder: number;
}

export interface OrderItem {
  id: string;
  kind: OrderItemKind;
  menuItemId: string | null;
  gameId: string | null;
  nameSnapshot: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
}

export interface OrderTab {
  id: string;
  userId: string;
  customerName: string;
  cardNumber: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
}

export interface Order {
  id: string;
  tabId: string;
  status: OrderStatus;
  tableLabel: string | null;
  note: string | null;
  canceledReason: string | null;
  createdAt: string;
  items: OrderItem[];
  tab?: OrderTab;
  total?: number;
}

export interface TabWithOrders extends OrderTab {
  orders: Order[];
  total: number;
}

export interface CartLine {
  key: string;
  kind: OrderItemKind;
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export const MENU_CATEGORY_LABEL: Record<MenuCategory, string> = {
  FOOD: "Comidas",
  DRINK: "Bebidas",
  DESSERT: "Sobremesas",
  OTHER: "Outros",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Recebido",
  PREPARING: "Preparando",
  DONE: "Entregue",
  CANCELED: "Cancelado",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, AccentName> = {
  PENDING: "yellow",
  PREPARING: "teal",
  DONE: "lime",
  CANCELED: "red",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number) {
  return brl.format(value);
}

export function minutesAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  return minutes < 1 ? "agora" : `há ${minutes} min`;
}

export const MY_TAB_QUERY_KEY = ["orders", "tab", "mine"] as const;
export const MENU_QUERY_KEY = ["menu"] as const;
