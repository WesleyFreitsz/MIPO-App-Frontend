import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Bell, ShieldAlert, Gift, Info, X } from "lucide-react-native";
import { api } from "../services/api";
import {
  Button,
  Card,
  Character,
  Chip,
  FieldLabel,
  IconButton,
  Input,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  showAlert,
} from "../components/ui";
import { EventoDetail } from "../types";

interface AdminSendNotificationScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "goBack">;
}

interface ScheduledNotification {
  id: string;
  title: string;
  sendAt: string;
  eventId: string | null;
}

type Audience = "all" | "event";
type Timing = "now" | "later";

const icons = [
  { id: "bell", component: Bell, label: "Geral" },
  { id: "shield", component: ShieldAlert, label: "Alerta" },
  { id: "gift", component: Gift, label: "Promo" },
  { id: "info", component: Info, label: "Info" },
];

const formatDateTime = (date: Date) =>
  date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function AdminSendNotificationScreen({ navigation }: AdminSendNotificationScreenProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("bell");
  const [audience, setAudience] = useState<Audience>("all");
  const [eventId, setEventId] = useState<string | null>(null);
  const [timing, setTiming] = useState<Timing>("now");
  const [sendAt, setSendAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);

  const { data: events = [] } = useQuery<EventoDetail[]>({
    queryKey: ["events"],
    queryFn: async () => (await api.get<EventoDetail[]>("/events")).data,
    enabled: audience === "event",
  });

  const { data: scheduled = [] } = useQuery<ScheduledNotification[]>({
    queryKey: ["notifications", "scheduled"],
    queryFn: async () => (await api.get("/notifications/scheduled")).data,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post("/notifications/admin-broadcast", {
        title,
        message,
        icon: selectedIcon,
        eventId: audience === "event" ? eventId : undefined,
        sendAt: timing === "later" ? sendAt.toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showAlert("Sucesso", timing === "later" ? `Aviso agendado para ${formatDateTime(sendAt)}.` : "Notificação enviada!");
      navigation.goBack();
    },
    onError: () => showAlert("Erro", "Falha ao enviar notificação."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/scheduled/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "scheduled"] }),
    onError: () => showAlert("Erro", "Não foi possível cancelar."),
  });

  const handleSend = () => {
    if (!title || !message) return showAlert("Erro", "Preencha título e mensagem.");
    if (audience === "event" && !eventId) return showAlert("Erro", "Escolha o evento.");
    if (timing === "later" && sendAt.getTime() <= Date.now()) return showAlert("Erro", "Escolha um horário no futuro.");
    sendMutation.mutate();
  };

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPickerMode(null);
    if (selected) setSendAt(selected);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <ScreenHeader title="Enviar aviso" subtitle={audience === "all" ? "Vai para todos os jogadores" : "Vai para quem confirmou no evento"} />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FieldLabel>Para quem</FieldLabel>
          <SegmentedControl<Audience>
            options={[
              { value: "all", label: "Todos" },
              { value: "event", label: "Participantes de evento" },
            ]}
            value={audience}
            onChange={setAudience}
          />
          {audience === "event" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {events.length === 0 ? <MipoText variant="caption">Nenhum evento ativo.</MipoText> : null}
              {events.map((event) => (
                <Chip
                  key={event.id}
                  label={event.title}
                  tone={eventId === event.id ? "active" : "neutral"}
                  selected={eventId === event.id}
                  onPress={() => setEventId(event.id)}
                />
              ))}
            </View>
          ) : null}

          <FieldLabel>Quando</FieldLabel>
          <SegmentedControl<Timing>
            options={[
              { value: "now", label: "Agora" },
              { value: "later", label: "Agendar" },
            ]}
            value={timing}
            onChange={setTiming}
          />
          {timing === "later" ? (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Button label={sendAt.toLocaleDateString("pt-BR")} variant="ghost" size="sm" onPress={() => setPickerMode("date")} style={{ flex: 1 }} />
              <Button
                label={sendAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                variant="ghost"
                size="sm"
                onPress={() => setPickerMode("time")}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          {pickerMode ? <DateTimePicker value={sendAt} mode={pickerMode} is24Hour minimumDate={new Date()} onChange={onPickerChange} /> : null}

          <FieldLabel>Tipo</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {icons.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                icon={item.component}
                tone={selectedIcon === item.id ? "active" : "neutral"}
                selected={selectedIcon === item.id}
                onPress={() => setSelectedIcon(item.id)}
              />
            ))}
          </View>

          <FieldLabel>Título</FieldLabel>
          <Input value={title} onChangeText={setTitle} placeholder="Ex: Manutenção no sábado" />

          <FieldLabel>Mensagem</FieldLabel>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder="Digite a mensagem..."
            multiline
            containerStyle={{ minHeight: 70 }}
          />

          <FieldLabel>Prévia</FieldLabel>
          <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Character name="carta3" size={40} motion="none" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <MipoText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
                  {title || "Título do aviso"}
                </MipoText>
                <MipoText variant="micro">agora</MipoText>
              </View>
              <MipoText variant="caption" numberOfLines={2}>
                {message || "A mensagem aparece aqui."}
              </MipoText>
            </View>
          </Card>

          {scheduled.length > 0 ? (
            <>
              <FieldLabel>Agendados</FieldLabel>
              <View style={{ gap: 8 }}>
                {scheduled.map((item) => (
                  <Card key={item.id} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <MipoText variant="bodyBold" numberOfLines={1}>
                        {item.title}
                      </MipoText>
                      <MipoText variant="micro">
                        {`${formatDateTime(new Date(item.sendAt))} · ${item.eventId ? "participantes do evento" : "todos"}`}
                      </MipoText>
                    </View>
                    <IconButton icon={X} accessibilityLabel={`Cancelar ${item.title}`} onPress={() => cancelMutation.mutate(item.id)} size={36} />
                  </Card>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        <Button
          label={timing === "later" ? "Agendar" : "Enviar"}
          icon={Send}
          variant="red"
          block
          loading={sendMutation.isPending}
          onPress={handleSend}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
