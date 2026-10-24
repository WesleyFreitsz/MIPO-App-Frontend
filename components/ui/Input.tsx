import React, { forwardRef } from "react";
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { fontFamily, radius, stroke, typeScale } from "../../theme/tokens";

export interface InputProps extends TextInputProps {
  icon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { icon: Icon, containerStyle, style, testID, multiline, ...props },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID ? `${testID}-box` : undefined}
      style={[
        {
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          borderWidth: stroke.regular,
          borderColor: colors.line,
          borderRadius: radius.input,
          backgroundColor: colors.surface,
        },
        containerStyle,
      ]}
    >
      {Icon ? <Icon size={16} color={colors.muted} strokeWidth={2.4} /> : null}
      <TextInput
        ref={ref}
        testID={testID}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        selectionColor={colors.pink}
        style={[
          {
            flex: 1,
            minHeight: 40,
            fontFamily: fontFamily.bodyBold,
            fontSize: typeScale.body + 1,
            color: colors.text,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
});
