import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithTheme } from "./renderWithTheme";

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
}

export function renderWithProviders(ui: React.ReactElement, queryClient: QueryClient = createTestQueryClient()) {
  return renderWithTheme(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
