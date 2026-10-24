import React from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Avatar } from "./Avatar";
import { MipoText } from "./Text";

export interface StackPerson {
  id: string;
  name: string;
  uri?: string | null;
}

export function AvatarStack({ people, max = 3, testID }: { people: StackPerson[]; max?: number; testID?: string }) {
  const { colors } = useTheme();
  if (people.length === 0) return null;
  const visible = people.slice(0, max);
  const rest = people.length - visible.length;

  return (
    <View testID={testID} style={{ flexDirection: "row", alignItems: "center" }}>
      {visible.map((person, index) => (
        <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
          <Avatar id={person.id} name={person.name} uri={person.uri} size="sm" />
        </View>
      ))}
      {rest > 0 ? (
        <View
          style={{
            marginLeft: -8,
            height: 26,
            minWidth: 26,
            paddingHorizontal: 4,
            borderRadius: 13,
            borderWidth: 2,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MipoText variant="micro" color="text">{`+${rest}`}</MipoText>
        </View>
      ) : null}
    </View>
  );
}
