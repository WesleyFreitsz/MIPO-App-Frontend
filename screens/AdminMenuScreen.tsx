import React, { useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Pencil, Plus, Star, Trash2 } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { isLocalFile, uploadMedia, UploadError } from "../services/uploads";
import {
  BottomSheet,
  Button,
  Card,
  Checkbox,
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
  showAlert,
  useBottomReserve,
} from "../components/ui";
import { formatBRL, MENU_CATEGORY_LABEL, MENU_QUERY_KEY, MenuCategory, MenuItem } from "./loja/lojaTypes";

const ADMIN_MENU_KEY = [...MENU_QUERY_KEY, "admin"] as const;
const CATEGORIES = Object.keys(MENU_CATEGORY_LABEL) as MenuCategory[];

interface MenuForm {
  id?: string;
  name: string;
  description: string;
  category: MenuCategory;
  price: string;
  imageUrl: string | null;
  available: boolean;
  dailySpecial: boolean;
}

const EMPTY_FORM: MenuForm = {
  name: "",
  description: "",
  category: "FOOD",
  price: "",
  imageUrl: null,
  available: true,
  dailySpecial: false,
};

function parsePrice(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

export default function AdminMenuScreen() {
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [form, setForm] = useState<MenuForm | null>(null);

  const menuQuery = useQuery<MenuItem[]>({
    queryKey: ADMIN_MENU_KEY,
    queryFn: async () => (await api.get("/menu", { params: { all: true } })).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: async (current: MenuForm) => {
      const price = parsePrice(current.price);
      if (price === null) throw new UploadError("Preço inválido.");
      const imageUrl = isLocalFile(current.imageUrl) ? await uploadMedia({ uri: current.imageUrl }, "/uploads/chat-content") : current.imageUrl;
      const body = {
        name: current.name.trim(),
        description: current.description.trim() || undefined,
        category: current.category,
        price,
        imageUrl: imageUrl ?? undefined,
        available: current.available,
        dailySpecial: current.dailySpecial,
      };
      return current.id ? api.patch(`/menu/${current.id}`, body) : api.post("/menu", body);
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
    onError: (error: Error) => showAlert("Erro", error instanceof UploadError ? error.message : "Não foi possível salvar o item."),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; changes: Partial<Pick<MenuItem, "available" | "dailySpecial">> }) => api.patch(`/menu/${data.id}`, data.changes),
    onSuccess: invalidate,
    onError: () => showAlert("Erro", "Não foi possível atualizar o item."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/${id}`),
    onSuccess: invalidate,
    onError: () => showAlert("Erro", "Não foi possível remover o item."),
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled && form) setForm({ ...form, imageUrl: result.assets[0].uri });
  };

  const edit = (item: MenuItem) =>
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      price: item.price.toFixed(2).replace(".", ","),
      imageUrl: item.imageUrl,
      available: item.available,
      dailySpecial: item.dailySpecial,
    });

  const confirmDelete = (item: MenuItem) =>
    showAlert("Remover item", `Tirar "${item.name}" do cardápio?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
    ]);

  const renderItem = ({ item }: { item: MenuItem }) => (
    <Card contentStyle={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} accessibilityIgnoresInvertColors /> : null}
        <View style={{ flex: 1 }}>
          <MipoText variant="cardTitle" numberOfLines={1}>
            {item.name}
          </MipoText>
          <MipoText variant="caption">{`${MENU_CATEGORY_LABEL[item.category]} · ${formatBRL(item.price)}`}</MipoText>
        </View>
        <IconButton icon={Pencil} accessibilityLabel={`Editar ${item.name}`} onPress={() => edit(item)} />
        <IconButton icon={Trash2} tone="red" accessibilityLabel={`Remover ${item.name}`} onPress={() => confirmDelete(item)} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip
          label={item.available ? "Disponível" : "Esgotado"}
          tone={item.available ? "lime" : "neutral"}
          selected={item.available}
          onPress={() => toggleMutation.mutate({ id: item.id, changes: { available: !item.available } })}
        />
        <Chip
          label="Destaque do dia"
          icon={Star}
          tone={item.dailySpecial ? "yellow" : "neutral"}
          selected={item.dailySpecial}
          onPress={() => toggleMutation.mutate({ id: item.id, changes: { dailySpecial: !item.dailySpecial } })}
        />
      </View>
    </Card>
  );

  return (
    <Screen>
      <ScreenHeader title="Cardápio" subtitle="Toque nos selos para mudar na hora" />
      {menuQuery.isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={menuQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve + 80, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={menuQuery.isRefetching} onRefresh={() => void menuQuery.refetch()} />}
          ListEmptyComponent={<EmptyState character="peao2" title="Cardápio vazio" message="Adicione o primeiro item no botão +" />}
        />
      )}
      <Fab icon={Plus} accessibilityLabel="Novo item do cardápio" onPress={() => setForm(EMPTY_FORM)} />

      <BottomSheet visible={form !== null} onClose={() => setForm(null)}>
        {form ? (
          <View>
            <MipoText variant="section">{form.id ? "Editar item" : "Novo item"}</MipoText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Escolher foto do item"
              onPress={pickImage}
              style={{ alignSelf: "flex-start", marginTop: 12 }}
            >
              {form.imageUrl ? (
                <Image source={{ uri: form.imageUrl }} style={{ width: 84, height: 84, borderRadius: 14 }} accessibilityIgnoresInvertColors />
              ) : (
                <Chip icon={ImagePlus} label="Adicionar foto" size="md" />
              )}
            </Pressable>
            <FieldLabel>Nome</FieldLabel>
            <Input value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Ex.: Pastel de queijo" maxLength={80} />
            <FieldLabel>Descrição</FieldLabel>
            <Input value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Opcional" maxLength={500} multiline />
            <FieldLabel>Categoria</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  label={MENU_CATEGORY_LABEL[category]}
                  selected={form.category === category}
                  tone={form.category === category ? "active" : "neutral"}
                  onPress={() => setForm({ ...form, category })}
                />
              ))}
            </View>
            <FieldLabel>Preço (R$)</FieldLabel>
            <Input value={form.price} onChangeText={(price) => setForm({ ...form, price })} placeholder="0,00" keyboardType="decimal-pad" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
              <Checkbox checked={form.available} onChange={(available) => setForm({ ...form, available })} accessibilityLabel="Disponível" />
              <MipoText variant="body">Disponível</MipoText>
              <Checkbox checked={form.dailySpecial} onChange={(dailySpecial) => setForm({ ...form, dailySpecial })} accessibilityLabel="Destaque do dia" />
              <MipoText variant="body">Destaque do dia</MipoText>
            </View>
            <Button
              label="Salvar"
              block
              loading={saveMutation.isPending}
              disabled={form.name.trim().length < 2 || !form.price.trim() || parsePrice(form.price) === null}
              onPress={() => saveMutation.mutate(form)}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
