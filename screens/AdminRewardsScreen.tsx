import React, { useState } from "react";
import { View, FlatList, Alert } from "react-native";
import { Plus, Trash2, Package } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
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
  useBottomReserve,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { foregroundOn } from "../theme/tokens";

interface Reward {
  id: string;
  title: string;
  price: number;
  stock: number;
}

const REWARD_TONES = ["yellow", "teal", "pink"] as const;

export default function AdminRewardsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

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
      Alert.alert("Sucesso", "Recompensa cadastrada!");
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
      Alert.alert("Erro", "Preencha todos os campos da recompensa.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      price: parseInt(price, 10),
      stock: parseInt(stock, 10),
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Deseja remover esta recompensa?", [
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
      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve + 80, gap: 14 }}
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
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Fab icon={Plus} accessibilityLabel="Nova recompensa" onPress={() => setFormVisible(true)} />
      </View>

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
