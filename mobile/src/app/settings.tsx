import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
      if (!response.ok || !result.ok)
        throw new Error("Health check không đạt.");
      setConnected(true);
      setMessage(`Đã kết nối ${result.chatModel} + ${result.embedModel}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không kết nối được server local.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <DetailHeader
        title="Kết nối local AI"
        action={
          <Pill tone={connected ? "mint" : "warning"}>
            {connected ? "READY" : "LOCAL"}
          </Pill>
        }
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>Runtime connection</Eyebrow>
          <Title style={{ marginTop: 8 }}>Nối app với máy chạy Ollama.</Title>
          <Body style={{ marginTop: 10 }}>
            APK chạy độc lập. Các chức năng AI kết nối tới HOSTORA server trong
            mạng LAN hoặc qua ADB reverse.
          </Body>
        </View>
        <View style={styles.content}>
          <Card dark style={{ gap: 13 }}>
            <View style={styles.serverIcon}>
              <Feather name="server" color={colors.mint} size={22} />
            </View>
            <Text style={styles.label}>ĐỊA CHỈ HOSTORA SERVER</Text>
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
                label="LAN mặc định"
                onPress={() => setUrl(DEFAULT_API_BASE)}
              />
              <Preset
                label="USB localhost"
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
            <Text style={styles.helpTitle}>Hai cách kết nối</Text>
            <Help
              number="1"
              title="Cùng Wi‑Fi"
              copy="Nhập IP LAN của máy, ví dụ http://192.168.1.10:3000. Server phải chạy với pnpm dev:lan và firewall cho phép port 3000."
            />
            <Help
              number="2"
              title="USB để kiểm thử"
              copy="Chạy adb reverse tcp:3000 tcp:3000 rồi nhập http://127.0.0.1:3000. Cách này không cần mở firewall."
            />
          </Card>
          <View style={styles.privacy}>
            <Feather name="lock" color={colors.primary} size={17} />
            <Text style={styles.privacyText}>
              Không API cloud. URL này chỉ được lưu trong bộ nhớ cục bộ của ứng
              dụng.
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
    minHeight: 38,
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
