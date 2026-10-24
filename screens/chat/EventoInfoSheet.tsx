import React from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Calendar, MapPin } from "lucide-react-native";
import { Avatar, BottomSheet, Card, Character, IconBox, MipoText, formatDateLong } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, stroke } from "../../theme/tokens";
import { EventoDetail } from "../../types";
import { eventoLocation, formatEventoTime, participantLabel } from "../evento/eventoState";

export interface EventoInfoSheetProps {
  evento: EventoDetail | null;
  visible: boolean;
  onOpenProfile: (userId: string) => void;
  onClose: () => void;
}

export function EventoInfoSheet({ evento, visible, onOpenProfile, onClose }: EventoInfoSheetProps) {
  const { colors } = useTheme();
  if (!evento) return null;
  const participants = evento.participants ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {evento.bannerUrl ? (
          <View style={{ height: 140, borderRadius: radius.card, borderWidth: stroke.regular, borderColor: colors.line, overflow: "hidden" }}>
            <Image source={{ uri: evento.bannerUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
        ) : (
          <Card tone="pink" flat contentStyle={{ height: 110, alignItems: "flex-end", justifyContent: "flex-end" }}>
            <Character name="dado3" size={90} style={{ marginBottom: -14 }} />
          </Card>
        )}
        <MipoText variant="screenTitle" style={{ marginTop: 12 }}>
          {evento.title}
        </MipoText>
        <View style={{ gap: 10, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconBox icon={Calendar} tone="yellow" />
            <MipoText variant="cardTitle">{`${formatDateLong(new Date(evento.dateTime))} · ${formatEventoTime(evento.dateTime)}`}</MipoText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconBox icon={MapPin} tone="teal" />
            <MipoText variant="cardTitle">{eventoLocation(evento)}</MipoText>
          </View>
        </View>
        {evento.description ? (
          <MipoText variant="body" color="muted" style={{ marginTop: 14 }}>
            {evento.description}
          </MipoText>
        ) : null}
        <MipoText variant="section" style={{ marginTop: 16, marginBottom: 8 }}>
          Quem vai
        </MipoText>
        {participants.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {participants.map((participant) => (
              <Pressable
                key={participant.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${participant.name}`}
                onPress={() => onOpenProfile(participant.id)}
                style={{ alignItems: "center", width: 56, gap: 4 }}
              >
                <Avatar id={participant.id} name={participant.name} uri={participant.avatarUrl} />
                <MipoText variant="micro" numberOfLines={1}>
                  {participantLabel(participant)}
                </MipoText>
              </Pressable>
            ))}
          </View>
        ) : (
          <MipoText variant="caption">Ninguém confirmado ainda.</MipoText>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
