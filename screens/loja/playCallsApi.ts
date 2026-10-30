import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { PresentUser } from "./storeTypes";

export type PlayCallMode = "NOW" | "SCHEDULED";
export type PlayCallStatus = "OPEN" | "FULL" | "CLOSED" | "EXPIRED";

export interface PlayCall {
  id: string;
  title: string;
  mode: PlayCallMode;
  status: PlayCallStatus;
  scheduledFor: string | null;
  slotsNeeded: number;
  note: string | null;
  createdAt: string;
  game: { id: string; name: string; imageUrl: string | null } | null;
  creator: PresentUser;
  members: PresentUser[];
  isCreator: boolean;
  isMember: boolean;
  chatId: string | null;
}

export interface CreatePlayCallInput {
  mode: PlayCallMode;
  gameId?: string;
  title?: string;
  scheduledFor?: string;
  slotsNeeded: number;
  note?: string;
}

const PLAY_CALLS_KEY = ["playCalls"];
const REFRESH_MS = 30_000;

export function usePlayCalls(mode: PlayCallMode, enabled = true) {
  const query = useQuery<PlayCall[]>({
    queryKey: [...PLAY_CALLS_KEY, mode],
    queryFn: async () => (await api.get<PlayCall[]>("/play-calls", { params: { mode } })).data,
    refetchInterval: REFRESH_MS,
    enabled,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (enabled) refetch();
    }, [refetch, enabled]),
  );
  return query;
}

export function usePlayCallActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: PLAY_CALLS_KEY });

  return {
    create: useMutation({
      mutationFn: async (input: CreatePlayCallInput) => (await api.post<PlayCall>("/play-calls", input)).data,
      onSuccess,
    }),
    join: useMutation({
      mutationFn: async (id: string) => (await api.post<PlayCall>(`/play-calls/${id}/join`)).data,
      onSuccess,
    }),
    leave: useMutation({ mutationFn: (id: string) => api.post(`/play-calls/${id}/leave`), onSuccess }),
    close: useMutation({ mutationFn: (id: string) => api.patch(`/play-calls/${id}/close`), onSuccess }),
  };
}

export function apiErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) || fallback;
}

export function formatPlayCallTime(call: PlayCall) {
  if (call.mode === "NOW" || !call.scheduledFor) return "Agora, na Mipo";
  const date = new Date(call.scheduledFor);
  const day = date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return `${day} às ${date.getHours()}h${date.getMinutes() ? String(date.getMinutes()).padStart(2, "0") : ""}`;
}
