import React from "react";
import { Pressable, View } from "react-native";
import { CheckCheck } from "lucide-react-native";
import { MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { ChatMessageItem, colorForName, displayLabel, formatMessageTime } from "./chatTypes";

export interface MessageBubbleProps {
  message: ChatMessageItem;
  isOwn: boolean;
  onLongPress: (message: ChatMessageItem) => void;
}

export function MessageBubble({ message, isOwn, onLongPress }: MessageBubbleProps) {
  const { colors } = useTheme();
  const foreground = isOwn ? colors.onColor : colors.text;
  const author = displayLabel(message.user);

  return (
    <View style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginVertical: 3 }}>
      <Pressable
        onLongPress={() => onLongPress(message)}
        delayLongPress={300}
        accessibilityHint={isOwn ? "Toque e segure para editar ou apagar" : undefined}
        style={{
          maxWidth: "78%",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 18,
          borderWidth: stroke.regular,
          borderColor: colors.line,
          backgroundColor: isOwn ? colors.yellow : colors.surface,
          ...(isOwn ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
        }}
      >
        {!isOwn && author ? (
          <MipoText variant="micro" style={{ color: message.member?.customColor || colorForName(author), marginBottom: 2 }}>
            {author}
          </MipoText>
        ) : null}
        {message.isDeleted ? (
          <MipoText variant="body" style={{ color: foreground, opacity: 0.6, fontStyle: "italic" }}>
            Esta mensagem foi apagada.
          </MipoText>
        ) : (
          <MipoText variant="bodyBold" style={{ color: foreground }}>
            {message.content}
          </MipoText>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 4, marginTop: 2 }}>
          {message.isEdited && !message.isDeleted ? (
            <MipoText variant="micro" style={{ color: foreground, opacity: 0.6, fontStyle: "italic" }}>
              editado
            </MipoText>
          ) : null}
          <MipoText variant="micro" style={{ color: foreground, opacity: 0.6 }}>
            {formatMessageTime(message.createdAt)}
          </MipoText>
          {isOwn ? <CheckCheck size={14} color={message.isRead ? colors.blue : foreground} style={{ opacity: message.isRead ? 1 : 0.5 }} /> : null}
        </View>
      </Pressable>
    </View>
  );
}
