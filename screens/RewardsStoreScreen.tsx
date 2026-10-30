import React, { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Coins, Gift, Package } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  Button,
  Card,
  Character,
  Chip,
  EmptyState,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { foregroundOn } from "../theme/tokens";

interface Reward {
  id: string;
  title: string;
  price: number;
  stock: number;
}

interface Redemption {
  id: string;
  rewardTitle: string;
  price: number;
  status: "PENDING" | "DELIVERED";
  createdAt: string;
}

type StoreTab = "store" | "mine";

const REWARD_TONES = ["yellow", "teal", "pink"] as const;

export default function RewardsStoreScreen() {
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [activeTab, setActiveTab] = useState<StoreTab>("store");
  const coins = user?.coins ?? 0;

  const rewardsQuery = useQuery<Reward[]>({
    queryKey: ["rewards"],
    queryFn: async () => (await api.get("/rewards")).data,
  });

  const redemptionsQuery = useQuery<Redemption[]>({
    queryKey: ["rewards", "redemptions", "me"],
    queryFn: async () => (await api.get("/rewards/redemptions/me")).data,
    enabled: activeTab === "mine",
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) => api.post(`/rewards/${rewardId}/redeem`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      refreshUser();
      showAlert("Resgatado!", "Retire seu prêmio no balcão. Acompanhe em Meus resgates.");
    },
    onError: (error: AxiosError<{ message?: string }>) =>
      showAlert("Não foi possível resgatar", error.response?.data?.message ?? "Tente novamente."),
  });

  const confirmRedeem = (reward: Reward) =>
    showAlert("Resgatar recompensa", `Trocar ${reward.price} moedas por "${reward.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Resgatar", onPress: () => redeemMutation.mutate(reward.id) },
    ]);

  const refreshing = rewardsQuery.isRefetching || redemptionsQuery.isRefetching;
  const onRefresh = () => {
    refreshUser();
    if (activeTab === "store") rewardsQuery.refetch();
    else redemptionsQuery.refetch();
  };

  const listProps = {
    showsVerticalScrollIndicator: false,
    style: { marginHorizontal: -14 },
    contentContainerStyle: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 },
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
  };

  return (
    <Screen>
      <ScreenHeader title="Loja de recompensas" right={<Chip tone="yellow" icon={Coins} label={`${coins} moedas`} />} />
      <SegmentedControl<StoreTab>
        options={[
          { value: "store", label: "Recompensas" },
          { value: "mine", label: "Meus resgates" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "store" ? (
        rewardsQuery.isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            {...listProps}
            data={rewardsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState character="moeda5" title="Nenhuma recompensa disponível" message="Volte em breve!" />}
            renderItem={({ item, index }) => {
              const tone = REWARD_TONES[index % REWARD_TONES.length];
              const foreground = foregroundOn(tone, colors);
              const soldOut = item.stock <= 0;
              const affordable = coins >= item.price;
              return (
                <Card tone={tone} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Character name="moeda5" size={56} motion="none" />
                  <View style={{ flex: 1, gap: 6 }}>
                    <MipoText variant="cardTitle" numberOfLines={2} style={{ color: foreground }}>
                      {item.title}
                    </MipoText>
                    <Chip tone="dark" label={`${item.price} moedas`} />
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Package size={14} color={foreground} />
                      <MipoText variant="micro" style={{ color: foreground }}>
                        {soldOut ? "Esgotado" : `${item.stock} disponíveis`}
                      </MipoText>
                    </View>
                  </View>
                  <Button
                    label={soldOut ? "Esgotado" : affordable ? "Resgatar" : "Sem saldo"}
                    icon={Gift}
                    size="sm"
                    variant="red"
                    disabled={soldOut || !affordable}
                    loading={redeemMutation.isPending && redeemMutation.variables === item.id}
                    onPress={() => confirmRedeem(item)}
                  />
                </Card>
              );
            }}
          />
        )
      ) : redemptionsQuery.isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          {...listProps}
          data={redemptionsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState character="moeda5" title="Você ainda não resgatou nada" />}
          renderItem={({ item }) => (
            <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <MipoText variant="cardTitle" numberOfLines={1}>
                  {item.rewardTitle}
                </MipoText>
                <MipoText variant="caption">{`${item.price} moedas · ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`}</MipoText>
              </View>
              <Chip tone={item.status === "DELIVERED" ? "lime" : "yellow"} label={item.status === "DELIVERED" ? "Entregue" : "Aguardando retirada"} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
