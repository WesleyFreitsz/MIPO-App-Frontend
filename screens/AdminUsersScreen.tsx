import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Coins, Minus, MoreVertical, Plus, Search, UserCheck, UserMinus } from "lucide-react-native";
import { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
  showAlert,
} from "../components/ui";

interface AdminUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  coins: number;
  banned?: boolean;
  role: UserRole;
}

type UserRole = "USER" | "WAITER" | "MODERATOR" | "ADMIN";

const ROLE_LABEL: Record<UserRole, string> = { USER: "Jogador", WAITER: "Garçom", MODERATOR: "Moderador", ADMIN: "Admin" };

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "USER", label: "Jogador" },
  { value: "WAITER", label: "Garçom" },
  { value: "MODERATOR", label: "Moderador" },
  { value: "ADMIN", label: "Admin" },
];

type AdminUsersResponse = AdminUser[] | { data?: AdminUser[]; total?: number };

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [coinAmount, setCoinAmount] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery<AdminUsersResponse>({
    queryKey: ["users", "admin", debouncedSearch],
    queryFn: async () => {
      const res = await api.get("/users/admin/list", {
        params: { skip: 0, take: 50, search: debouncedSearch || undefined },
      });
      return res.data;
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
      showAlert("Sucesso", "Papel atualizado.");
    },
    onError: () => showAlert("Erro", "Não foi possível alterar o papel."),
  });

  const coinsMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; name: string; amount: number }) =>
      api.patch(`/users/${id}/coins`, { amount }),
    onSuccess: (_, { name, amount }) => {
      queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
      const count = Math.abs(amount);
      const noun = count === 1 ? "moeda" : "moedas";
      showAlert("Sucesso", amount > 0 ? `+${count} ${noun} para ${name}` : `${count} ${noun} retiradas de ${name}`);
    },
    onError: (error: AxiosError<{ message?: string }>) =>
      showAlert("Erro", error.response?.data?.message ?? "Não foi possível alterar as moedas."),
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

  const parsedCoinAmount = Number.parseInt(coinAmount, 10);
  const validCoinAmount = Number.isInteger(parsedCoinAmount) && parsedCoinAmount > 0 && parsedCoinAmount <= 100_000;

  const changeCoins = (user: AdminUser, sign: 1 | -1) => {
    if (!validCoinAmount) return showAlert("Quantidade inválida", "Informe um número inteiro de 1 a 100.000.");
    setSelectedUser(null);
    setCoinAmount("");
    coinsMutation.mutate({ id: user.id, name: user.name, amount: sign * parsedCoinAmount });
  };

  const handleBan = (user: AdminUser) => {
    showAlert(
      "Banir usuário",
      `Deseja banir ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Banir",
          onPress: () => {
            banMutation.mutate({ id: user.id, banned: true });
            showAlert("Sucesso", `${user.name} foi banido.`);
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleUnban = (user: AdminUser) => {
    banMutation.mutate({ id: user.id, banned: false });
    showAlert("Sucesso", `${user.name} foi desbanido.`);
  };

  return (
    <Screen>
      <ScreenHeader title="Usuários" subtitle={total !== undefined ? `${total} jogadores` : undefined} />
      <Input
        icon={Search}
        placeholder="Buscar por nome ou apelido"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        accessibilityLabel="Buscar usuários"
      />
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
                  {item.role !== "USER" ? <Chip tone="lilac" label={ROLE_LABEL[item.role]} /> : null}
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

      <BottomSheet
        visible={selectedUser !== null}
        onClose={() => {
          setSelectedUser(null);
          setCoinAmount("");
        }}
      >
        {selectedUser ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Avatar id={selectedUser.id} name={selectedUser.name} uri={selectedUser.avatarUrl} />
              <MipoText variant="screenTitle" numberOfLines={1} style={{ flex: 1, fontSize: 22 }}>
                {selectedUser.name}
              </MipoText>
            </View>
            <View style={{ gap: 6 }}>
              <MipoText variant="bodyBold">{`Moedas (saldo: ${selectedUser.coins ?? 0})`}</MipoText>
              <Input
                icon={Coins}
                placeholder="Quantidade"
                value={coinAmount}
                onChangeText={(text) => setCoinAmount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="Quantidade de moedas"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button label="Adicionar" icon={Plus} variant="lime" onPress={() => changeCoins(selectedUser, 1)} style={{ flex: 1 }} />
                <Button label="Retirar" icon={Minus} variant="ghost" onPress={() => changeCoins(selectedUser, -1)} style={{ flex: 1 }} />
              </View>
            </View>
            {currentUser?.role === "ADMIN" && currentUser.id !== selectedUser.id ? (
              <View style={{ gap: 6 }}>
                <MipoText variant="bodyBold">Papel</MipoText>
                <SegmentedControl<UserRole>
                  options={ROLE_OPTIONS}
                  value={selectedUser.role}
                  onChange={(role) => {
                    const user = selectedUser;
                    setSelectedUser(null);
                    roleMutation.mutate({ id: user.id, role });
                  }}
                />
              </View>
            ) : null}
            {selectedUser.banned ? (
              <Button
                label="Desbanir usuário"
                icon={UserCheck}
                block
                onPress={() => {
                  const user = selectedUser;
                  setSelectedUser(null);
                  handleUnban(user);
                }}
              />
            ) : (
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
            )}
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
