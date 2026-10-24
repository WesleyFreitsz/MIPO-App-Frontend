import React, { useState } from "react";
import { Alert, FlatList, View } from "react-native";
import { Coins, MoreVertical, UserMinus } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  useBottomReserve,
} from "../components/ui";

interface AdminUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  coins: number;
  banned?: boolean;
}

type AdminUsersResponse = AdminUser[] | { data?: AdminUser[]; total?: number };

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery<AdminUsersResponse>({
    queryKey: ["users", "admin"],
    queryFn: async () => {
      const res = await api.get("/users/admin/list", {
        params: { skip: 0, take: 50 },
      });
      return res.data;
    },
  });

  const addCoinsMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/users/${id}/coins`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      api.patch(`/users/${id}/ban`, { banned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
    },
  });

  const users: AdminUser[] = Array.isArray(data) ? data : data?.data || [];
  const total = !Array.isArray(data) && typeof data?.total === "number" ? data.total : undefined;

  const handleAddCoins = (user: AdminUser) => {
    addCoinsMutation.mutate({ id: user.id, amount: 1 });
    Alert.alert("Sucesso", `+1 moeda adicionada para ${user.name}`);
  };

  const handleBan = (user: AdminUser) => {
    Alert.alert(
      "Banir usuário",
      `Deseja banir ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Banir",
          onPress: () => {
            banMutation.mutate({ id: user.id, banned: true });
            Alert.alert("Sucesso", `${user.name} foi banido.`);
          },
          style: "destructive",
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Usuários" subtitle={total !== undefined ? `${total} jogadores` : undefined} />
      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              style={item.banned ? { opacity: 0.6 } : undefined}
              contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
              <View style={{ flex: 1, gap: 2 }}>
                <MipoText variant="cardTitle" numberOfLines={1}>
                  {item.name}
                </MipoText>
                {item.email ? (
                  <MipoText variant="caption" numberOfLines={1}>
                    {item.email}
                  </MipoText>
                ) : null}
                <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                  <Chip tone="yellow" icon={Coins} label={`${item.coins ?? 0} moedas`} />
                  {item.banned ? <Chip tone="red" label="Banido" /> : null}
                </View>
              </View>
              <IconButton
                icon={MoreVertical}
                accessibilityLabel={`Ações de ${item.name}`}
                onPress={() => setSelectedUser(item)}
              />
            </Card>
          )}
          ListEmptyComponent={<EmptyState character="peao2" title="Nenhum usuário encontrado." />}
        />
      )}

      <BottomSheet visible={selectedUser !== null} onClose={() => setSelectedUser(null)}>
        {selectedUser ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Avatar id={selectedUser.id} name={selectedUser.name} uri={selectedUser.avatarUrl} />
              <MipoText variant="screenTitle" numberOfLines={1} style={{ flex: 1, fontSize: 22 }}>
                {selectedUser.name}
              </MipoText>
            </View>
            <Button
              label="Adicionar 1 moeda"
              icon={Coins}
              block
              onPress={() => {
                const user = selectedUser;
                setSelectedUser(null);
                handleAddCoins(user);
              }}
            />
            {!selectedUser.banned ? (
              <Button
                label="Banir usuário"
                icon={UserMinus}
                variant="red"
                block
                onPress={() => {
                  const user = selectedUser;
                  setSelectedUser(null);
                  handleBan(user);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
