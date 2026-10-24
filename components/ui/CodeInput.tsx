import React from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { fontFamily, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export interface CodeInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export function sanitizeCode(raw: string, length: number): string {
  return raw.replace(/\D/g, "").slice(0, length);
}

export function CodeInput({ length, value, onChange, testID }: CodeInputProps) {
  const { colors } = useTheme();
  const activeIndex = value.length < length ? value.length : -1;

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}>
      {Array.from({ length }, (_, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={index}
            testID={testID ? `${testID}-box-${index}` : undefined}
            style={{
              width: 38,
              height: 48,
              borderRadius: 12,
              borderWidth: stroke.regular,
              borderColor: colors.line,
              backgroundColor: active ? colors.yellow : colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MipoText
              style={{ fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28, color: active ? colors.onColor : colors.text }}
            >
              {value[index] ?? ""}
            </MipoText>
          </View>
        );
      })}
      <TextInput
        testID={testID}
        accessibilityLabel={`Código de ${length} dígitos`}
        value={value}
        onChangeText={(raw) => onChange(sanitizeCode(raw, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent" }}
      />
    </View>
  );
}
