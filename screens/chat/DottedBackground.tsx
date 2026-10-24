import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

export function DottedBackground({ color, dotColor }: { color: string; dotColor: string }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color }}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" patternUnits="userSpaceOnUse" width={16} height={16}>
            <Circle cx={8} cy={8} r={1.3} fill={dotColor} opacity={0.22} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  );
}
