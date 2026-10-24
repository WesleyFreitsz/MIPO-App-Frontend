import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Calendar, Clock, ImagePlus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button, FieldLabel, Input, MipoText, Screen, ScreenHeader, SegmentedControl } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { EventoDetail } from "../types";

interface AdminCreateEventScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "goBack">;
  route: { params?: { eventId?: string } };
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

const localOptions = [
  { value: "SALAO", label: "Salão" },
  { value: "SALINHA", label: "Salinha" },
  { value: "EXTERNO", label: "Externo" },
  { value: "PERSONALIZADO", label: "Outro" },
];

function PickerField({ icon: Icon, label, onPress, accessibilityLabel }: { icon: LucideIcon; label: string; onPress: () => void; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 12,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        borderRadius: radius.input,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon size={16} color={colors.muted} strokeWidth={2.4} />
      <MipoText variant="bodyBold" style={{ fontSize: 14 }}>
        {label}
      </MipoText>
    </Pressable>
  );
}

export default function AdminCreateEventScreen({ navigation, route }: AdminCreateEventScreenProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;
  const isAdmin = user?.role === "ADMIN";

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localType, setLocalType] = useState("SALAO");
  const [customLocation, setCustomLocation] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  useEffect(() => {
    if (isEditing) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const response = await api.get<EventoDetail[]>(`/events`);
      const event = response.data.find((e) => e.id === eventId);

      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? "");
        setLocalType(event.space);
        setCustomLocation(event.customLocation || "");
        setBanner(event.bannerUrl ?? null);
        setEventDate(new Date(event.dateTime));
      } else {
        Alert.alert("Erro", "Evento não encontrado.");
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar dados do evento.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  // Função para subir a imagem para o storage
  const uploadImageAsync = async (uri: string) => {
    if (uri.startsWith("http")) return uri; // Se já é link do Supabase, não faz nada
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `banner-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      // @ts-ignore
      formData.append("file", {
        uri,
        name: filename,
        type: match ? `image/${match[1]}` : "image/jpeg",
      });

      // Enviando para chat-content para separar de avatares de usuários
      const res = await api.post("/uploads/chat-content", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const handleSalvar = async () => {
    if (!title || !description) {
      return Alert.alert("Erro", "Preencha o nome e a descrição.");
    }

    setLoading(true);
    try {
      let finalBannerUrl = banner;

      // Se houver uma imagem nova do celular, faz upload antes de salvar
      if (banner && banner.startsWith("file://")) {
        finalBannerUrl = await uploadImageAsync(banner);
        if (!finalBannerUrl)
          throw new Error("Erro ao enviar a imagem do evento.");
      }

      const payload = {
        title,
        description,
        space: localType,
        customLocation: localType === "PERSONALIZADO" ? customLocation : null,
        dateTime: eventDate.toISOString(),
        bannerUrl: finalBannerUrl,
      };

      if (isEditing) {
        await api.patch(`/events/${eventId}`, payload);
        Alert.alert("Sucesso", "Evento atualizado!");
      } else {
        await api.post("/events", payload);
        Alert.alert("Sucesso", "Evento criado!");
      }
      navigation.goBack();
    } catch (caught) {
      const error = caught as ApiError;
      Alert.alert(
        "Erro",
        error.response?.data?.message || error.message || "Falha na operação.",
      );
    } finally {
      setLoading(false);
    }
  };

  const pickBanner = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
    });
    if (!res.canceled) setBanner(res.assets[0].uri);
  };

  const openPicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const submitLabel = isEditing ? "Salvar alterações" : isAdmin ? "Publicar evento" : "Enviar sugestão";

  return (
    <Screen>
      <ScreenHeader title={isEditing ? "Editar evento" : isAdmin ? "Novo evento" : "Sugerir evento"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={banner ? "Trocar banner" : "Adicionar banner"}
            onPress={pickBanner}
            style={{
              height: 170,
              borderWidth: stroke.regular,
              borderStyle: "dashed",
              borderColor: colors.line,
              borderRadius: radius.card,
              backgroundColor: colors.surface2,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {banner ? (
              <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <>
                <ImagePlus size={30} color={colors.muted} strokeWidth={2.4} />
                <MipoText variant="bodyBold" color="muted">
                  Adicionar banner
                </MipoText>
              </>
            )}
          </Pressable>

          <FieldLabel>Nome do evento</FieldLabel>
          <Input value={title} onChangeText={setTitle} placeholder="Ex: Torneio de Catan" />

          <FieldLabel>Descrição</FieldLabel>
          <Input
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhes do evento..."
            containerStyle={{ minHeight: 100 }}
          />

          <FieldLabel>Local</FieldLabel>
          <SegmentedControl options={localOptions} value={localType} onChange={setLocalType} />

          {localType === "PERSONALIZADO" && (
            <Input
              placeholder="Digite o local ou endereço"
              value={customLocation}
              onChangeText={setCustomLocation}
              containerStyle={{ marginTop: 10 }}
            />
          )}

          <FieldLabel>Data e horário</FieldLabel>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PickerField
              icon={Calendar}
              label={eventDate.toLocaleDateString()}
              accessibilityLabel="Escolher data"
              onPress={() => openPicker("date")}
            />
            <PickerField
              icon={Clock}
              label={eventDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              accessibilityLabel="Escolher horário"
              onPress={() => openPicker("time")}
            />
          </View>

          {showPicker && (
            <DateTimePicker
              value={eventDate}
              mode={pickerMode}
              is24Hour
              onChange={onDateChange}
            />
          )}
        </ScrollView>

        <Button label={submitLabel} variant="red" block loading={loading} onPress={handleSalvar} style={{ marginTop: 8 }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
