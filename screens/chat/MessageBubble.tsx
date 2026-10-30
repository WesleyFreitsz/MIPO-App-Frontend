import React from "react";
import { Image, Pressable, View } from "react-native";
import { AlertCircle, CheckCheck, Clock } from "lucide-react-native";
import { MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { ChatMessageItem, colorForName, displayLabel, formatMessageTime } from "./chatTypes";
import { groupReactions } from "./messageCache";

export interface MessageBubbleProps {
  message: ChatMessageItem;
  isOwn: boolean;
  currentUserId: string | undefined;
  onLongPress: (message: ChatMessageItem) => void;
  onRetry: (message: ChatMessageItem) => void;
  onToggleReaction: (message: ChatMessageItem, emoji: string) => void;
}

const IMAGE_SIZE = 220;

export function MessageBubble({ message, isOwn, currentUserId, onLongPress, onRetry, onToggleReaction }: MessageBubbleProps) {
  const { colors } = useTheme();
  const foreground = isOwn ? colors.onColor : colors.text;
  const author = displayLabel(message.user);
  const failed = message.status === "failed";
  const reactions = groupReactions(message.reactions, currentUserId);

  return (
    <View style={{ alignItems: isOwn ? "flex-end" : "flex-start", marginVertical: 3 }}>
      <Pressable
        onPress={failed ? () => onRetry(message) : undefined}
        onLongPress={() => onLongPress(message)}
        delayLongPress={300}
        accessibilityHint={failed ? "Toque para tentar enviar de novo" : "Toque e segure para mais opções"}
        style={{
          maxWidth: "78%",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 18,
          borderWidth: stroke.regular,
          borderColor: failed ? colors.red : colors.line,
          backgroundColor: isOwn ? colors.yellow : colors.surface,
          opacity: message.status === "sending" ? 0.7 : 1,
          ...(isOwn ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
        }}
      >
        {!isOwn && author ? (
          <MipoText variant="micro" style={{ color: message.member?.customColor || colorForName(author), marginBottom: 2 }}>
            {author}
          </MipoText>
        ) : null}
        {message.replyTo ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: colors.pink, paddingLeft: 8, marginBottom: 6, opacity: 0.8 }}>
            <MipoText variant="micro" style={{ color: foreground }}>
              {displayLabel(message.replyTo.user) || "Mensagem"}
            </MipoText>
            <MipoText variant="caption" numberOfLines={2} style={{ color: foreground }}>
              {message.replyTo.isDeleted ? "Mensagem apagada" : message.replyTo.content || "📷 Imagem"}
            </MipoText>
          </View>
        ) : null}
        {message.isDeleted ? (
          <MipoText variant="body" style={{ color: foreground, opacity: 0.6, fontStyle: "italic" }}>
            Esta mensagem foi apagada.
          </MipoText>
        ) : (
          <>
            {message.imageUrl ? (
              <Image
                source={{ uri: message.imageUrl }}
                accessibilityLabel="Imagem enviada"
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12, marginBottom: message.content ? 6 : 0 }}
              />
            ) : null}
            {message.content ? (
              <MipoText variant="bodyBold" style={{ color: foreground }}>
                {message.content}
              </MipoText>
            ) : null}
          </>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 4, marginTop: 2 }}>
          {message.isEdited && !message.isDeleted ? (
            <MipoText variant="micro" style={{ color: foreground, opacity: 0.6, fontStyle: "italic" }}>
              editado
            </MipoText>
          ) : null}
          {failed ? (
            <MipoText variant="micro" style={{ color: colors.red }}>
              Falhou. Toque para reenviar
            </MipoText>
          ) : (
            <MipoText variant="micro" style={{ color: foreground, opacity: 0.6 }}>
              {formatMessageTime(message.createdAt)}
            </MipoText>
          )}
          {isOwn ? (
            failed ? (
              <AlertCircle size={14} color={colors.red} />
            ) : message.status === "sending" ? (
              <Clock size={13} color={foreground} style={{ opacity: 0.6 }} />
            ) : (
              <CheckCheck size={14} color={message.isRead ? colors.blue : foreground} style={{ opacity: message.isRead ? 1 : 0.5 }} />
            )
          ) : null}
        </View>
      </Pressable>
      {reactions.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: -4, paddingHorizontal: 6 }}>
          {reactions.map((reaction) => (
            <Pressable
              key={reaction.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.emoji} ${reaction.count}${reaction.mine ? ", sua reação" : ""}`}
              onPress={() => onToggleReaction(message, reaction.emoji)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 12,
                borderWidth: stroke.regular,
                borderColor: reaction.mine ? colors.pink : colors.line,
                backgroundColor: colors.surface,
              }}
            >
              <MipoText variant="micro">{reaction.emoji}</MipoText>
              {reaction.count > 1 ? <MipoText variant="micro">{reaction.count}</MipoText> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
