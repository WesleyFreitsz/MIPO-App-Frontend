import React, { useState } from "react";
import { View, FlatList } from "react-native";
import { Check, Plus, Trash2, Package } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Character,
  Chip,
  EmptyState,
  Fab,
  FieldLabel,
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
  user?: { id: string; name: string; avatarUrl?: string | null };
}

type RewardsTab = "rewards" | "redemptions";

const REWARD_TONES = ["yellow", "teal", "pink"] as const;

export default function AdminRewardsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [activeTab, setActiveTab] = useState<RewardsTab>("rewards");

  const { data: redemptions = [], isLoading: isLoadingRedemptions } = useQuery<Redemption[]>({
    queryKey: ["rewards", "redemptions", "PENDING"],
    queryFn: async () => (await api.get("/rewards/redemptions", { params: { status: "PENDING" } })).data,
    enabled: activeTab === "redemptions",
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/rewards/redemptions/${id}/deliver`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rewards", "redemptions"] }),
    onError: () => showAlert("Erro", "Não foi possível marcar como entregue."),
  });

  const { data: rewards = [], isLoading } = useQuery<Reward[]>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const res = await api.get("/rewards");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: { title: string; price: number; stock: number }) =>
      api.post("/rewards", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      setTitle("");
      setPrice("");
      setStock("");
      setFormVisible(false);
      showAlert("Sucesso", "Recompensa cadastrada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rewards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    },
  });

  const handleAddReward = () => {
    if (!title.trim() || !price.trim() || !stock.trim()) {
      showAlert("Erro", "Preencha todos os campos da recompensa.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      price: parseInt(price, 10),
      stock: parseInt(stock, 10),
    });
  };

  const handleDelete = (id: string) => {
    showAlert("Excluir", "Deseja remover esta recompensa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: () => deleteMutation.mutate(id),
        style: "destructive",
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Recompensas" />
      <SegmentedControl<RewardsTab>
        options={[
          { value: "rewards", label: "Catálogo" },
          { value: "redemptions", label: "Resgates pendentes" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === "redemptions" ? (
        isLoadingRedemptions ? (
          <LoadingState />
        ) : (
          <FlatList
            data={redemptions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={{ marginHorizontal: -14 }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 }}
            ListEmptyComponent={<EmptyState character="moeda5" title="Nenhum resgate pendente" />}
            renderItem={({ item }) => (
              <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar id={item.user?.id ?? item.id} name={item.user?.name ?? "Jogador"} uri={item.user?.avatarUrl} />
                <View style={{ flex: 1, gap: 4 }}>
                  <MipoText variant="cardTitle" numberOfLines={1}>
                    {item.rewardTitle}
                  </MipoText>
                  <MipoText variant="caption" numberOfLines={1}>
                    {`${item.user?.name ?? "Jogador"} · ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`}
                  </MipoText>
                  <Chip tone="yellow" label={`${item.price} moedas`} />
                </View>
                <Button
                  label="Entregue"
                  icon={Check}
                  variant="lime"
                  size="sm"
                  loading={deliverMutation.isPending && deliverMutation.variables === item.id}
                  onPress={() => deliverMutation.mutate(item.id)}
                />
              </Card>
            )}
          />
        )
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve + 80, gap: 14 }}
          ListEmptyComponent={
            <EmptyState character="moeda5" title="Nenhuma recompensa ativa" message="Toque no + para cadastrar a primeira." />
          }
          renderItem={({ item, index }) => {
            const tone = REWARD_TONES[index % REWARD_TONES.length];
            const foreground = foregroundOn(tone, colors);
            return (
              <Card tone={tone} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Character name="moeda5" size={60} motion={index === 0 ? "idle" : "none"} />
                <View style={{ flex: 1, gap: 6 }}>
                  <MipoText variant="cardTitle" numberOfLines={2} style={{ color: foreground }}>
                    {item.title}
                  </MipoText>
                  <Chip tone="dark" label={`${item.price} moedas`} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Package size={14} color={foreground} />
                    <MipoText variant="micro" style={{ color: foreground }}>
                      {item.stock} em estoque
                    </MipoText>
                  </View>
                </View>
                <IconButton icon={Trash2} accessibilityLabel={`Excluir ${item.title}`} onPress={() => handleDelete(item.id)} />
              </Card>
            );
          }}
        />
      )}
      {activeTab === "rewards" ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Fab icon={Plus} accessibilityLabel="Nova recompensa" onPress={() => setFormVisible(true)} />
        </View>
      ) : null}

      <BottomSheet visible={formVisible} onClose={() => setFormVisible(false)}>
        <MipoText variant="screenTitle" style={{ fontSize: 22 }}>
          Nova recompensa
        </MipoText>
        <FieldLabel>Nome do prêmio</FieldLabel>
        <Input placeholder="Ex: Jogo Catan" value={title} onChangeText={setTitle} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FieldLabel>Preço (moedas)</FieldLabel>
            <Input placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel>Estoque inicial</FieldLabel>
            <Input placeholder="0" keyboardType="numeric" value={stock} onChangeText={setStock} />
          </View>
        </View>
        <Button
          label="Cadastrar recompensa"
          icon={Plus}
          variant="red"
          block
          loading={createMutation.isPending}
          disabled={!title.trim() || !price.trim() || !stock.trim()}
          onPress={handleAddReward}
          style={{ marginTop: 16 }}
        />
      </BottomSheet>
    </Screen>
  );
}
