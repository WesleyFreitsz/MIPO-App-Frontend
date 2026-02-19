import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ SUBSTITUA PELO IP DA SUA MÁQUINA SE USAR ANDROID FISICO OU EMULADOR
// Ex: 'http://192.168.1.15:3000'
const BASE_URL = "http://192.168.3.61:3000";
export const api = axios.create({
  baseURL: BASE_URL,
});

// Interceptor: Adiciona o Token automaticamente em toda requisição
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@mipo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
