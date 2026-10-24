import React from "react";
import { Image, ScrollView, View } from "react-native";
import { Calendar, Camera, MapPin, MessageCircle, Users } from "lucide-react-native";
import { Avatar, BottomSheet, Button, Card, Character, Chip, IconBox, MipoText, formatDateLong } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, stroke } from "../../theme/tokens";
import { EventoDetail } from "../../types";
import { eventoLocation, formatEventoChip, formatEventoTime, participantLabel } from "./eventoState";

export interface EventoDetailSheetProps {
  evento: EventoDetail | null;
  visible: boolean;
  onClose: () => void;
  onToggleParticipation: () => void;
  onCheckIn: () => void;
  onOpenChat: () => void;
  isConfirmed: boolean;
  canCheckIn: boolean;
  toggling?: boolean;
  checkingIn?: boolean;
}

function InfoRow({ icon, tone, title, subtitle }: { icon: typeof MapPin; tone: "yellow" | "teal" | "lime"; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconBox icon={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <MipoText variant="cardTitle">{title}</MipoText>
        {subtitle ? <MipoText variant="caption">{subtitle}</MipoText> : null}
      </View>
    </View>
  );
}

export function EventoDetailSheet({
  evento,
  visible,
  onClose,
  onToggleParticipation,
  onCheckIn,
  onOpenChat,
  isConfirmed,
  canCheckIn,
  toggling = false,
  checkingIn = false,
}: EventoDetailSheetProps) {
  const { colors } = useTheme();
  if (!evento) return null;
  const participants = evento.participants ?? [];
  const date = new Date(evento.dateTime);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {evento.bannerUrl ? (
          <View style={{ height: 140, borderRadius: radius.card, borderWidth: stroke.regular, borderColor: colors.line, overflow: "hidden" }}>
            <Image source={{ uri: evento.bannerUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
        ) : (
          <Card tone="pink" flat contentStyle={{ height: 120, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Chip label={formatEventoChip(evento.dateTime)} tone="lime" />
            </View>
            <Character name="dado1" size={90} style={{ marginBottom: -14, marginRight: -6 }} />
          </Card>
        )}

        <MipoText variant="screenTitle" style={{ marginTop: 12 }}>
          {evento.title}
        </MipoText>

        <View style={{ gap: 10, marginTop: 12 }}>
          <InfoRow icon={Calendar} tone="yellow" title={`${formatDateLong(date)} · ${formatEventoTime(evento.dateTime)}`} />
          <InfoRow icon={MapPin} tone="teal" title={eventoLocation(evento)} />
          <InfoRow
            icon={Users}
            tone="lime"
            title={participants.length === 1 ? "1 confirmado" : `${participants.length} confirmados`}
          />
        </View>

        {evento.description ? (
          <>
            <MipoText variant="section" style={{ marginTop: 16, marginBottom: 4 }}>
              Sobre o evento
            </MipoText>
            <MipoText variant="body" color="muted">
              {evento.description}
            </MipoText>
          </>
        ) : null}

        <MipoText variant="section" style={{ marginTop: 16, marginBottom: 8 }}>
          Quem vai
        </MipoText>
        {participants.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {participants.map((participant) => (
              <View key={participant.id} style={{ alignItems: "center", width: 56, gap: 4 }}>
                <Avatar id={participant.id} name={participant.name} uri={participant.avatarUrl} />
                <MipoText variant="micro" numberOfLines={1}>
                  {participantLabel(participant)}
                </MipoText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <MipoText variant="caption">Ninguém confirmado ainda.</MipoText>
        )}
      </ScrollView>

      <View style={{ gap: 10, marginTop: 16 }}>
        {isConfirmed ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Cancelar presença" variant="ghost" loading={toggling} onPress={onToggleParticipation} style={{ flex: 1 }} block />
            <Button label="Chat" icon={MessageCircle} variant="teal" accessibilityLabel="Chat do evento" onPress={onOpenChat} style={{ flex: 1 }} block />
          </View>
        ) : (
          <Button label="Vou nessa!" variant="red" block loading={toggling} onPress={onToggleParticipation} />
        )}
        {canCheckIn ? <Button label="Fazer check-in" icon={Camera} block loading={checkingIn} onPress={onCheckIn} /> : null}
      </View>
    </BottomSheet>
  );
}
