import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Search } from "lucide-react-native";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { StaffUser, displayName } from "./loja/storeTypes";
import { STORE_PRESENCE_KEY } from "./loja/useStorePresence";

const SEARCH_DEBOUNCE_MS = 300;

export default function StaffCheckInScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const usersQuery = useQuery<StaffUser[]>({
    queryKey: ["store", "staff", "users", term],
    queryFn: async () => (await api.get<StaffUser[]>("/store/staff/users", { params: { search: term || undefined } })).data,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["store", "staff", "users"] });
    queryClient.invalidateQueries({ queryKey: STORE_PRESENCE_KEY });
  };

  const toggleMutation = useMutation({
    mutationFn: (user: StaffUser) =>
      user.checkedIn ? api.post(`/store/staff-check-out/${user.id}`) : api.post("/store/staff-check-in", { userId: user.id }),
    onSuccess: refresh,
    onError: () => showAlert("Erro", "Não foi possível atualizar o check-in."),
  });

  const users = usersQuery.data ?? [];

  return (
    <Screen>
      <ScreenHeader
        title="Check-in manual"
        subtitle={term ? "Resultado da busca" : "Quem está na loja agora"}
        onBack={() => navigation.goBack()}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Search size={18} color={colors.muted} strokeWidth={2.4} />
        <Input
          placeholder="Buscar por nome ou apelido"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Buscar jogador"
          containerStyle={{ flex: 1 }}
        />
      </View>

      {usersQuery.isLoading ? (
        <LoadingState skeletons={3} />
      ) : usersQuery.isError ? (
        <ErrorState onRetry={() => usersQuery.refetch()} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(user) => user.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={usersQuery.isRefetching} onRefresh={refresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <EmptyState character="peao2" title={term ? "Ninguém encontrado" : "Loja vazia por enquanto"} />
          }
          renderItem={({ item }) => (
            <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar name={item.name} id={item.id} uri={item.avatarUrl} online={item.checkedIn} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <MipoText variant="bodyBold" numberOfLines={1}>
                  {displayName(item)}
                </MipoText>
                <MipoText variant="caption" numberOfLines={1}>
                  {item.checkedIn ? "Na loja" : item.name}
                </MipoText>
              </View>
              <Button
                label={item.checkedIn ? "Saída" : "Entrada"}
                icon={item.checkedIn ? LogOut : LogIn}
                variant={item.checkedIn ? "ghost" : "teal"}
                size="sm"
                loading={toggleMutation.isPending && toggleMutation.variables?.id === item.id}
                onPress={() => toggleMutation.mutate(item)}
                accessibilityLabel={item.checkedIn ? `Registrar saída de ${displayName(item)}` : `Registrar entrada de ${displayName(item)}`}
              />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
