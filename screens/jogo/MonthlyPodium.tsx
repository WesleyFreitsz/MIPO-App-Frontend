import React from "react";
import { View } from "react-native";
import { Avatar, Character, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, radius, stroke } from "../../theme/tokens";
import { MonthlyGame, RankingEntry, displayName, prizeFor } from "./monthlyGameTypes";

const PODIUM_ORDER = [2, 1, 3];
const BLOCK_HEIGHT: Record<number, number> = { 1: 92, 2: 68, 3: 52 };
const BLOCK_TONE: Record<number, AccentName> = { 1: "yellow", 2: "lilac", 3: "orange" };

interface MonthlyPodiumProps {
  monthlyGame: MonthlyGame;
  podium: RankingEntry[];
  compact?: boolean;
}

export function MonthlyPodium({ monthlyGame, podium, compact = false }: MonthlyPodiumProps) {
  const { colors } = useTheme();
  const scale = compact ? 0.7 : 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }} accessibilityRole="summary">
      {PODIUM_ORDER.map((position) => {
        const entry = podium.find((item) => item.position === position);
        const tone = BLOCK_TONE[position];
        const prize = compact ? null : prizeFor(monthlyGame, position);
        const label = entry
          ? `${position}º lugar: ${displayName(entry.user)}, ${entry.score} pontos${prize ? `, prêmio ${prize}` : ""}`
          : `${position}º lugar vago`;

        return (
          <View key={position} style={{ flex: 1, alignItems: "center" }} accessible accessibilityLabel={label}>
            {position === 1 && entry ? <Character name="trofeu1" size={compact ? 26 : 36} motion="none" /> : null}
            {entry ? (
              <>
                <Avatar name={entry.user.name} id={entry.user.id} uri={entry.user.avatarUrl} size={compact ? "sm" : "md"} />
                <MipoText variant="bodyBold" numberOfLines={1} style={{ marginTop: 4, maxWidth: "100%" }}>
                  {displayName(entry.user)}
                </MipoText>
                <MipoText variant="caption" numberOfLines={1}>
                  {`${entry.score} pts`}
                </MipoText>
              </>
            ) : (
              <MipoText variant="caption" style={{ marginBottom: 4 }}>
                vago
              </MipoText>
            )}
            <View
              style={{
                alignSelf: "stretch",
                height: BLOCK_HEIGHT[position] * scale,
                marginTop: 6,
                borderWidth: stroke.regular,
                borderColor: colors.line,
                borderTopLeftRadius: radius.icon,
                borderTopRightRadius: radius.icon,
                backgroundColor: entry ? colors[tone] : colors.surface2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MipoText variant="screenTitle" style={{ color: entry ? foregroundOn(tone, colors) : colors.muted, fontSize: compact ? 18 : 24 }}>
                {`${position}º`}
              </MipoText>
            </View>
            {prize ? (
              <MipoText variant="micro" numberOfLines={2} style={{ marginTop: 6, textAlign: "center" }}>
                {prize}
              </MipoText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
