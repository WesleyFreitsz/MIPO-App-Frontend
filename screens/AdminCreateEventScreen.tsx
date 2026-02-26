import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Calendar, Clock, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../services/api";

export default function AdminCreateEventScreen({ navigation, route }: any) {
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localType, setLocalType] = useState("SALAO");
  const [customLocation, setCustomLocation] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  useEffect(() => {
    if (isEditing) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events`);
      const event = response.data.find((e: any) => e.id === eventId);

      if (event) {
        setTitle(event.title);
        setDescription(event.description);
        setLocalType(event.space);
        setCustomLocation(event.customLocation || "");
        setBanner(event.bannerUrl);
        setEventDate(new Date(event.dateTime));
      } else {
        Alert.alert("Erro", "Evento não encontrado.");
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar dados do evento.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  // Função para subir a imagem para o storage
  const uploadImageAsync = async (uri: string) => {
    if (uri.startsWith("http")) return uri; // Se já é link do Supabase, não faz nada
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `banner-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      // @ts-ignore
      formData.append("file", {
        uri,
        name: filename,
        type: match ? `image/${match[1]}` : "image/jpeg",
      });

      // Enviando para chat-content para separar de avatares de usuários
      const res = await api.post("/uploads/chat-content", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const handleSalvar = async () => {
    if (!title || !description) {
      return Alert.alert("Erro", "Preencha o nome e a descrição.");
    }

    setLoading(true);
    try {
      let finalBannerUrl = banner;

      // Se houver uma imagem nova do celular, faz upload antes de salvar
      if (banner && banner.startsWith("file://")) {
        finalBannerUrl = await uploadImageAsync(banner);
        if (!finalBannerUrl)
          throw new Error("Erro ao enviar a imagem do evento.");
      }

      const payload = {
        title,
        description,
        space: localType,
        customLocation: localType === "PERSONALIZADO" ? customLocation : null,
        dateTime: eventDate.toISOString(),
        bannerUrl: finalBannerUrl,
      };

      if (isEditing) {
        await api.patch(`/events/${eventId}`, payload);
        Alert.alert("Sucesso", "Evento atualizado!");
      } else {
        await api.post("/events", payload);
        Alert.alert("Sucesso", "Evento criado!");
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.response?.data?.message || error.message || "Falha na operação.",
      );
    } finally {
      setLoading(false);
    }
  };

  const LocationChip = ({ label, value }: any) => (
    <TouchableOpacity
      style={[styles.chip, localType === value && styles.chipActive]}
      onPress={() => setLocalType(value)}
    >
      <Text
        style={[styles.chipText, localType === value && styles.chipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={styles.label}>Banner do Evento</Text>
      <TouchableOpacity
        style={styles.bannerButton}
        onPress={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.5,
          });
          if (!res.canceled) setBanner(res.assets[0].uri);
        }}
      >
        {banner ? (
          <Image source={{ uri: banner }} style={styles.bannerImage} />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Camera color="#94a3b8" size={32} />
            <Text style={{ color: "#94a3b8", marginTop: 8 }}>
              Selecionar Imagem
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Nome do Evento</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Torneio de Catan"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Detalhes do evento..."
      />

      <Text style={styles.label}>Localização</Text>
      <View style={styles.row}>
        <LocationChip label="Salão" value="SALAO" />
        <LocationChip label="Salinha" value="SALINHA" />
        <LocationChip label="Externo" value="EXTERNO" />
        <LocationChip label="Personalizado" value="PERSONALIZADO" />
      </View>

      {localType === "PERSONALIZADO" && (
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Digite o local ou endereço"
          value={customLocation}
          onChangeText={setCustomLocation}
        />
      )}

      <View style={styles.rowInput}>
        <TouchableOpacity
          onPress={() => {
            setPickerMode("date");
            setShowPicker(true);
          }}
          style={styles.iconInput}
        >
          <Calendar size={20} color="#64748b" />
          <Text style={{ marginLeft: 8 }}>
            {eventDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setPickerMode("time");
            setShowPicker(true);
          }}
          style={styles.iconInput}
        >
          <Clock size={20} color="#64748b" />
          <Text style={{ marginLeft: 8 }}>
            {eventDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={eventDate}
          mode={pickerMode}
          is24Hour
          onChange={onDateChange}
        />
      )}

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSalvar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>
            {isEditing ? "Salvar Alterações" : "Publicar Evento"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#E11D48" },
  chipText: { color: "#64748b", fontWeight: "bold" },
  chipTextActive: { color: "#fff" },
  rowInput: { flexDirection: "row", gap: 10, marginTop: 15 },
  iconInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  saveBtn: {
    backgroundColor: "#E11D48",
    padding: 16,
    borderRadius: 15,
    marginTop: 30,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
  bannerButton: {
    height: 180,
    backgroundColor: "#e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: { alignItems: "center" },
});
