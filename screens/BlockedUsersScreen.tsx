import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Avatar, Button, EmptyState, LoadingState, MipoText, Screen, ScreenHeader, showAlert } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { SocialUser } from "./social/socialFormat";

export default function BlockedUsersScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<{ data: SocialUser[] }>({
    queryKey: ["blockedUsers"],
    queryFn: async () => (await api.get("/friends/blocked")).data,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/friends/${userId}`),
    onSuccess: (_response, userId) => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendship", userId] });
    },
    onError: () => showAlert("Erro", "Não foi possível desbloquear agora."),
  });

  return (
    <Screen>
      <ScreenHeader title="Bloqueados" />
      {isLoading ? (
        <LoadingState skeletons={3} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(user) => user.id}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.pink} />}
          ListEmptyComponent={<EmptyState character="peao2" title="Ninguém bloqueado" message="Quem você bloquear aparece aqui." />}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <MipoText variant="cardTitle" numberOfLines={1}>
                  {item.name}
                </MipoText>
                {item.nickname ? <MipoText variant="micro">{`@${item.nickname}`}</MipoText> : null}
              </View>
              <Button
                label="Desbloquear"
                variant="ghost"
                size="sm"
                loading={unblockMutation.isPending && unblockMutation.variables === item.id}
                onPress={() => unblockMutation.mutate(item.id)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}
