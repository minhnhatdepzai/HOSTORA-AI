import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/detail-header";
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors } from "@/constants/theme";
import { DEFAULT_API_BASE, getApiBase, saveApiBase } from "@/lib/api";

export default function SettingsScreen() {
  const [url, setUrl] = useState(DEFAULT_API_BASE);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void getApiBase().then(setUrl);
  }, []);

  async function testConnection() {
    setChecking(true);
    setMessage("");
    setConnected(false);
    try {
      const target = await saveApiBase(url);
      const response = await fetch(`${target}/api/health`);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("Kết nối chưa sẵn sàng.");
      setConnected(true);
      setMessage("Đã kết nối. Các tính năng tư vấn đã sẵn sàng.");
    } catch {
      setMessage(
        "Chưa kết nối được. Hãy kiểm tra hai thiết bị đang cùng Wi‑Fi và thử lại.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top", "bottom", "left", "right"]}
    >
      <DetailHeader
        title="Kết nối dịch vụ"
        action={
          <Pill tone={connected ? "mint" : "warning"}>
            {connected ? "SẴN SÀNG" : "CHƯA KẾT NỐI"}
          </Pill>
        }
      />
      <Screen insetTop={false}>
        <View style={styles.intro}>
          <Eyebrow>Thiết lập một lần</Eyebrow>
          <Title style={{ marginTop: 8 }}>Kết nối với HOSTORA.</Title>
          <Body style={{ marginTop: 10 }}>
            Nhập địa chỉ do người cài đặt cung cấp để dùng tư vấn, kiểm tra khả
            năng được tìm thấy trên Google và các gợi ý thông minh.
          </Body>
        </View>
        <View style={styles.content}>
          <Button
            label="Xem yêu cầu tư vấn đã lưu"
            icon="users"
            variant="secondary"
            onPress={() => router.push("/(tabs)/leads")}
          />
          <Card dark style={{ gap: 13 }}>
            <View style={styles.serverIcon}>
              <Feather name="server" color={colors.mint} size={22} />
            </View>
            <Text style={styles.label}>ĐỊA CHỈ KẾT NỐI</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.10:3000"
              placeholderTextColor="#718196"
              style={styles.input}
            />
            <View style={styles.presets}>
              <Preset
                label="Địa chỉ đã cài sẵn"
                onPress={() => setUrl(DEFAULT_API_BASE)}
              />
              <Preset
                label="Kết nối qua USB"
                onPress={() => setUrl("http://127.0.0.1:3000")}
              />
            </View>
            {checking ? (
              <ActivityIndicator color={colors.mint} />
            ) : (
              <Button
                label="Lưu và kiểm tra kết nối"
                icon="wifi"
                variant="mint"
                onPress={() => void testConnection()}
              />
            )}
            {message ? (
              <View
                style={[
                  styles.message,
                  connected ? styles.messageOk : styles.messageError,
                ]}
              >
                <Feather
                  name={connected ? "check-circle" : "alert-circle"}
                  color={connected ? colors.mint : "#FFC1C1"}
                  size={15}
                />
                <Text
                  style={[
                    styles.messageText,
                    { color: connected ? colors.mint : "#FFC1C1" },
                  ]}
                >
                  {message}
                </Text>
              </View>
            ) : null}
          </Card>
          <Card style={{ gap: 13 }}>
            <Text style={styles.helpTitle}>Cách kết nối</Text>
            <Help
              number="1"
              title="Điện thoại và máy HOSTORA cùng Wi‑Fi"
              copy="Nhập địa chỉ do người cài đặt cung cấp, sau đó bấm Lưu và kiểm tra kết nối."
            />
            <Help
              number="2"
              title="Nếu chưa kết nối được"
              copy="Kiểm tra máy HOSTORA đang bật, hai thiết bị đang cùng mạng rồi thử lại."
            />
          </Card>
          <View style={styles.privacy}>
            <Feather name="lock" color={colors.primary} size={17} />
            <Text style={styles.privacyText}>
              Địa chỉ kết nối chỉ được lưu trên điện thoại này.
            </Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function Help({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.help}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.helpItemTitle}>{title}</Text>
        <Text style={styles.helpCopy}>{copy}</Text>
      </View>
    </View>
  );
}
function Preset({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.preset, pressed && { opacity: 0.72 }]}
    >
      <Text style={styles.presetText}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 15 },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(184,243,214,.1)",
  },
  label: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
    color: "white",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 12,
  },
  presets: { flexDirection: "row", gap: 8 },
  preset: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,243,214,.25)",
    backgroundColor: "rgba(184,243,214,.07)",
  },
  presetText: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  message: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    padding: 10,
    borderRadius: 12,
  },
  messageOk: { backgroundColor: "rgba(184,243,214,.08)" },
  messageError: { backgroundColor: "rgba(255,120,120,.08)" },
  messageText: {
    flex: 1,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  helpTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
  },
  help: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  number: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  numberText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 12,
  },
  helpItemTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  helpCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 16,
    marginTop: 3,
  },
  privacy: {
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start",
    paddingHorizontal: 10,
  },
  privacyText: {
    flex: 1,
    color: colors.primary,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 16,
  },
});
