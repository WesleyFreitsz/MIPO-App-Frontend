import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { haptic } from "../../motion/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
}

export function Checkbox({ checked, onChange, accessibilityLabel, testID }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      hitSlop={11}
      onPress={() => {
        haptic.select();
        onChange(!checked);
      }}
    >
      <View
        testID={testID ? `${testID}-box` : undefined}
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: stroke.regular,
          borderColor: colors.line,
          backgroundColor: checked ? colors.lime : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={14} color={colors.onColor} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
