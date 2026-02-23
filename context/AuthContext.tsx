import React, { createContext, useState, useEffect, useContext } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import { io, Socket } from "socket.io-client";

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
  role: "ADMIN" | "USER";
  isProfileComplete: boolean;
  coins?: number;
  achievements?: Achievement[];
};

type AuthContextData = {
  user: User | null;
  token: string | null;
  signed: boolean;
  loading: boolean;
  signIn: (loginData: any) => Promise<void>;
  signUp: (registerData: any) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  async function refreshUser() {
    try {
      const response = await api.get("/users/profile");
      setUser(response.data);
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

      const socketInstance = io(socketUrl, {
        transports: ["websocket"],
      });

      socketInstance.on("connect", () => {
        socketInstance.emit("auth", { userId: user.id });
      });

      // Escuta notificações em tempo real
      socketInstance.on("notification:new", (data: any) => {
        // Ignora a exibição de pop-up para mensagens de chat para não poluir a tela
        if (data.type === "CHAT_MESSAGE") return;

        Alert.alert("Nova Notificação 🔔", data.message);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else if (!user && socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [user?.id, token]);

  useEffect(() => {
    async function loadStorageData() {
      const storedToken = await AsyncStorage.getItem("@mipo_token");
      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        await refreshUser();
      }
      setLoading(false);
    }
    loadStorageData();
  }, []);

  async function signIn({ login, password }: any) {
    const response = await api.post("/auth/login", { login, password });
    const newToken = response.data.access_token;
    setToken(newToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    await AsyncStorage.setItem("@mipo_token", newToken);
    await refreshUser();
  }

  async function signUp({ name, login, password, age }: any) {
    const response = await api.post("/auth/register", {
      name,
      login,
      password,
      age: parseInt(age),
    });
    const newToken = response.data.access_token;
    setToken(newToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    await AsyncStorage.setItem("@mipo_token", newToken);
    await refreshUser();
  }

  function signOut() {
    AsyncStorage.removeItem("@mipo_token").then(() => {
      setUser(null);
      setToken(null);
      delete api.defaults.headers.common["Authorization"];
    });
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
