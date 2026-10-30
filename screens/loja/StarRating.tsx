import React from "react";
import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic } from "../../motion/haptics";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  label: string;
}

export function StarRating({ value, onChange, size = 32, label }: StarRatingProps) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const filled = rating <= value;
        return (
          <Pressable
            key={rating}
            accessibilityRole="radio"
            accessibilityState={{ selected: rating === value }}
            accessibilityLabel={`${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
            hitSlop={6}
            onPress={() => {
              haptic.tap();
              onChange(rating);
            }}
          >
            <Star size={size} color={colors.text} fill={filled ? colors.yellow : "transparent"} strokeWidth={2} />
          </Pressable>
        );
      })}
    </View>
  );
}
