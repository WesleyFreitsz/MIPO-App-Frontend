import React, { useState } from "react";
import { Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { MipoText } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";

interface BirthDateFieldProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

const DEFAULT_PICKER_DATE = new Date(2000, 0, 1);

export function BirthDateField({ value, onChange }: BirthDateFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (selected) onChange(selected);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Data de nascimento: ${value.toLocaleDateString("pt-BR")}` : "Escolher data de nascimento"}
        onPress={() => setOpen((current) => !current)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 12,
          borderWidth: stroke.regular,
          borderColor: colors.line,
          borderRadius: radius.input,
          backgroundColor: colors.surface,
        }}
      >
        <Calendar size={16} color={colors.muted} strokeWidth={2.4} />
        <MipoText variant="body" color={value ? "text" : "muted"}>
          {value ? value.toLocaleDateString("pt-BR") : "dd/mm/aaaa"}
        </MipoText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ?? DEFAULT_PICKER_DATE}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          locale="pt-BR"
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}
