import React from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { fontFamily, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

const weekdaysShort = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const weekdaysLong = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const months = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatDateLong(date: Date): string {
  return `${weekdaysLong[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

export function weekdayShort(date: Date): string {
  return weekdaysShort[date.getDay()];
}

export function DateBlock({ date, testID }: { date: Date; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={formatDateLong(date)}
      style={{
        width: 48,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ backgroundColor: colors.red, paddingVertical: 2, alignItems: "center" }}>
        <MipoText variant="micro" color="onPink" style={{ fontSize: 10 }}>
          {weekdayShort(date)}
        </MipoText>
      </View>
      <MipoText style={{ fontFamily: fontFamily.display, fontSize: 20, lineHeight: 26, textAlign: "center" }}>
        {String(date.getDate())}
      </MipoText>
    </View>
  );
}
