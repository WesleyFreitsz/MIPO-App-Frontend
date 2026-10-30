import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const LEGACY_TOKEN_KEY = "@mipo_token";
const ACCESS_TOKEN_KEY = "mipo.accessToken";
const REFRESH_TOKEN_KEY = "mipo.refreshToken";
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"];

export type AuthTokens = { accessToken: string; refreshToken: string | null };

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://mipo-app-backend.onrender.com",
});

let tokens: AuthTokens | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;
let tokenListener: ((accessToken: string | null) => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function setTokenListener(listener: ((accessToken: string | null) => void) | null) {
  tokenListener = listener;
}

export function getAccessToken() {
  return tokens?.accessToken ?? null;
}

export function isAccessTokenExpired() {
  const payload = tokens?.accessToken.split(".")[1];
  if (!payload) return true;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getRefreshToken() {
  return tokens?.refreshToken ?? null;
}

// SecureStore não existe no web (modo preview), então lá os tokens ficam no AsyncStorage.
const storage = {
  get: (key: string) => (Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)),
  set: (key: string, value: string) => (Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value)),
  remove: (key: string) => (Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};

export async function loadTokens(): Promise<AuthTokens | null> {
  const accessToken = await storage.get(ACCESS_TOKEN_KEY);
  if (accessToken) {
    tokens = { accessToken, refreshToken: await storage.get(REFRESH_TOKEN_KEY) };
    return tokens;
  }

  const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
  if (!legacyToken) return null;
  await saveTokens({ accessToken: legacyToken, refreshToken: null });
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  return tokens;
}

export async function saveTokens(next: AuthTokens) {
  tokens = next;
  await storage.set(ACCESS_TOKEN_KEY, next.accessToken);
  if (next.refreshToken) await storage.set(REFRESH_TOKEN_KEY, next.refreshToken);
  else await storage.remove(REFRESH_TOKEN_KEY);
  tokenListener?.(next.accessToken);
}

export async function clearTokens() {
  tokens = null;
  await Promise.all([storage.remove(ACCESS_TOKEN_KEY), storage.remove(REFRESH_TOKEN_KEY), AsyncStorage.removeItem(LEGACY_TOKEN_KEY)]);
  tokenListener?.(null);
}

type AuthResponse = { access_token: string; refresh_token: string };

export async function saveAuthResponse(data: AuthResponse) {
  await saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
}

// null = sessão inválida (deslogar); erro de rede/servidor propaga sem derrubar a sessão.
async function requestNewAccessToken(): Promise<string | null> {
  const refreshToken = tokens?.refreshToken;
  if (!refreshToken) return null;
  try {
    const { data } = await api.post<AuthResponse>("/auth/refresh", { refreshToken });
    await saveAuthResponse(data);
    return data.access_token;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export { refreshAccessToken };

// Requisições que tomam 401 ao mesmo tempo esperam o mesmo refresh, pois o refresh token é de uso único.
function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= requestNewAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isPublicRoute = PUBLIC_AUTH_ROUTES.some((route) => original?.url?.startsWith(route));
    if (error.response?.status !== 401 || !original || isPublicRoute || original._retried) {
      return Promise.reject(error);
    }

    original._retried = true;
    let accessToken: string | null;
    try {
      accessToken = await refreshAccessToken();
    } catch {
      return Promise.reject(error);
    }
    if (!accessToken) {
      unauthorizedHandler?.();
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  },
);

export { api };
