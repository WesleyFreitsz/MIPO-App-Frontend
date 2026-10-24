import React from "react";
import { MipoText } from "./Text";

export function FieldLabel({ children }: { children: string }) {
  return (
    <MipoText variant="label" style={{ marginTop: 12, marginBottom: 4 }}>
      {children}
    </MipoText>
  );
}
