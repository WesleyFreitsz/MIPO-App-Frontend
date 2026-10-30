import { Linking } from "react-native";
import { api } from "./api";

const LEGAL_BASE_URL = `${api.defaults.baseURL ?? ""}/legal`;

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/privacidade`,
  terms: `${LEGAL_BASE_URL}/termos`,
  community: `${LEGAL_BASE_URL}/diretrizes-da-comunidade`,
  accountDeletion: `${LEGAL_BASE_URL}/exclusao-de-conta`,
};

// Trocar pelo e-mail real do encarregado antes de publicar.
export const PRIVACY_EMAIL = "[E-MAIL DE PRIVACIDADE]";

export const MIN_AGE = 18;

export interface LegalVersion {
  version: string;
  minAge: number;
}

export const legalVersionQuery = {
  queryKey: ["legal", "version"],
  queryFn: async () => (await api.get<LegalVersion>("/legal/version")).data,
  staleTime: 60 * 60 * 1000,
};

export function openLegalPage(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

export function contactPrivacy() {
  Linking.openURL(`mailto:${PRIVACY_EMAIL}`).catch(() => undefined);
}

export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function ageOn(birthDate: Date, today = new Date()) {
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  return today.getFullYear() - birthDate.getFullYear() - (hadBirthday ? 0 : 1);
}
