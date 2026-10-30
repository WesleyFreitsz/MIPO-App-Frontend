import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  loadTokens,
  saveAuthResponse,
  setTokenListener,
  setUnauthorizedHandler,
} from "../services/api";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHED_USER_KEY = "mipo.cachedUser";

type Achievement = {
  id: string;
  title: string;
  icon?: string;
};

type User = {
  id: string;
  name: string;
  nickname: string | null;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "MODERATOR" | "WAITER" | "USER";
  showInStorePresence?: boolean;
  showLastSeen?: boolean;
  needsBirthDate?: boolean;
  termsVersion?: string | null;
  isProfileComplete: boolean;
  coins?: number;
  achievements?: Achievement[];
};

export type SignUpData = {
  name: string;
  login: string;
  password: string;
  birthDate: string;
  termsVersion: string;
};

type AuthContextData = {
  user: User | null;
  token: string | null;
  signed: boolean;
  loading: boolean;
  signIn: (loginData: any) => Promise<void>;
  signUp: (registerData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();

  async function refreshUser() {
    try {
      const response = await api.get<User>("/users/profile");
      setUser(response.data);
      AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(response.data)).catch(() => undefined);
    } catch (error) {
      console.error("Erro ao atualizar dados do usuário", error);
    }
  }

  // Inicializa o WebSocket global de notificações quando há um usuário logado
  useEffect(() => {
    if (user?.id && token) {
      // Pega a baseURL e remove o "/api" do final para conectar no Gateway raiz do NestJS
      const socketUrl = api.defaults.baseURL
        ? api.defaults.baseURL.replace("/api", "")
        : "http://localhost:3000";

      // auth como função: cada reconexão usa o access token atual, sem recriar o socket a cada refresh.
      const socketInstance = io(socketUrl, {
        transports: ["websocket"],
        auth: (cb) => cb({ token: getAccessToken() }),
      });

      socketInstance.on("connect", () => {
        socketInstance.emit("auth");
      });

      // Escuta notificações em tempo real
      socketInstance.on("notification:new", () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      });

      socketInstance.on("store:presence-changed", () => {
        queryClient.invalidateQueries({ queryKey: ["store", "present"] });
      });

      socketInstance.on("tab:closed", () => {
        queryClient.invalidateQueries({ queryKey: ["reviews", "pending"] });
      });

      socketInstance.on("play-calls:changed", () => {
        queryClient.invalidateQueries({ queryKey: ["playCalls"] });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else if (!user && socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [user?.id]);

  const clearSession = useCallback(async () => {
    await clearTokens();
    await AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => undefined);
    setUser(null);
  }, []);

  useEffect(() => {
    setTokenListener(setToken);
    return () => setTokenListener(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    async function loadStorageData() {
      const storedTokens = await loadTokens();
      if (storedTokens) {
        setToken(storedTokens.accessToken);
        const cachedUser = await AsyncStorage.getItem(CACHED_USER_KEY).catch(() => null);
        if (cachedUser) {
          setUser(JSON.parse(cachedUser) as User);
          refreshUser();
        } else {
          await refreshUser();
        }
      }
      setLoading(false);
    }
    loadStorageData();
  }, []);

  async function signIn({ login, password }: any) {
    const response = await api.post("/auth/login", { login, password });
    await saveAuthResponse(response.data);
    await refreshUser();
  }

  async function signUp(data: SignUpData) {
    const response = await api.post("/auth/register", { ...data, acceptTerms: true });
    await saveAuthResponse(response.data);
    await refreshUser();
  }

  async function signOut() {
    try {
      await api.patch("/users/notification-token", { token: null });
    } catch (error) {
      console.warn("Não foi possível remover o token de push", error);
    }
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    await clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        token,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
