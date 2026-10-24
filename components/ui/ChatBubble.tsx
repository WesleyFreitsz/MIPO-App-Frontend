import React from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export interface ChatBubbleProps {
  text: string;
  mine: boolean;
  time?: string;
  author?: string;
  children?: React.ReactNode;
  testID?: string;
}

export function ChatBubble({ text, mine, time, author, children, testID }: ChatBubbleProps) {
  const { colors } = useTheme();
  const foreground = mine ? colors.onColor : colors.text;
  return (
    <View
      testID={testID}
      style={{
        maxWidth: "78%",
        alignSelf: mine ? "flex-end" : "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        backgroundColor: mine ? colors.yellow : colors.surface,
        ...(mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
      }}
    >
      {author ? (
        <MipoText variant="micro" style={{ color: colors.pink, marginBottom: 2 }}>
          {author}
        </MipoText>
      ) : null}
      {children}
      {text ? (
        <MipoText variant="bodyBold" style={{ color: foreground }}>
          {text}
        </MipoText>
      ) : null}
      {time ? (
        <MipoText variant="micro" style={{ color: foreground, opacity: 0.6, alignSelf: "flex-end", marginTop: 2 }}>
          {time}
        </MipoText>
      ) : null}
    </View>
  );
}
