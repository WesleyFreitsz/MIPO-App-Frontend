import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { StorePresence } from "./storeTypes";

export const STORE_PRESENCE_KEY = ["store", "present"];
const PRESENCE_REFRESH_MS = 60_000;

// O backend emite "store:presence-changed" no socket raiz, mas o app só escuta o namespace do chat;
// por isso a presença atualiza por polling leve + ao focar a tela.
export function useStorePresence() {
  const query = useQuery<StorePresence>({
    queryKey: STORE_PRESENCE_KEY,
    queryFn: async () => (await api.get<StorePresence>("/store/present")).data,
    refetchInterval: PRESENCE_REFRESH_MS,
  });

  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return query;
}

export function useStoreCheckIn() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: STORE_PRESENCE_KEY });

  const checkIn = useMutation({
    mutationFn: (code: string) => api.post("/store/check-in", { code }),
    onSuccess,
  });
  const checkOut = useMutation({
    mutationFn: () => api.post("/store/check-out"),
    onSuccess,
  });

  return { checkIn, checkOut };
}
