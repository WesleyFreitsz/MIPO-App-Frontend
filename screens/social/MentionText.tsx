import React from "react";
import { MipoText, MipoTextProps } from "../../components/ui";

const MENTION_SPLIT = /(@[a-zA-Z0-9_]+)/g;

export function MentionText({ children, ...props }: Omit<MipoTextProps, "children"> & { children: string }) {
  return (
    <MipoText {...props}>
      {children.split(MENTION_SPLIT).map((part, index) =>
        index % 2 === 1 ? (
          <MipoText key={index} variant={props.variant} color="pink">
            {part}
          </MipoText>
        ) : (
          part
        ),
      )}
    </MipoText>
  );
}
