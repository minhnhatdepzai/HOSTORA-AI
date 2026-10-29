import { DetailHeader } from "@/components/detail-header";
import { Button, CinematicScrollView } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { postJson } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Mode = "login" | "register" | "forgot";
const content = {
  login: { eyebrow: "SỔ DỊCH VỤ", title: "Chào mừng bạn quay lại.", copy: "Mở voucher, yêu cầu hỗ trợ và những website thuộc tài khoản của bạn.", action: "Đăng nhập" },
  register: { eyebrow: "MỘT TÀI KHOẢN", title: "Giữ mọi thứ ở cùng một nơi.", copy: "Dùng đúng email nhận hóa đơn để voucher được cất tự động.", action: "Tạo tài khoản" },
  forgot: { eyebrow: "KHÔI PHỤC", title: "Lấy lại mật khẩu.", copy: "Nếu email đã có tài khoản, HOSTORA sẽ gửi liên kết dùng một lần.", action: "Gửi liên kết" },
} satisfies Record<Mode, { eyebrow: string; title: string; copy: string; action: string }>;

export function AccountAuthScreen({ mode }: { mode: Mode }) {
  const params = useLocalSearchParams<{ next?: string }>();
  const auth = useCustomerAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit() {
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      if (mode === "login") await auth.login(email, password);
      if (mode === "register") await auth.register(name, email, password);
      if (mode === "forgot") {
        const result = await postJson<{ message: string }>("/api/account/forgot-password", { email });
        setMessage(result.message); setSuccess(true); return;
      }
      const destination = params.next === "/studio" || params.next === "/orders" ? params.next : "/account";
      router.replace(destination as Href);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Chưa thể hoàn tất yêu cầu."); }
    finally { setBusy(false); }
  }

  const valid = email.trim().includes("@") && (mode === "forgot" || password.length >= (mode === "login" ? 1 : 10)) && (mode !== "register" || name.trim().length >= 2);
  return <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
    <DetailHeader title={mode === "login" ? "Đăng nhập" : mode === "register" ? "Tạo tài khoản" : "Quên mật khẩu"} />
    <CinematicScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
      <View style={styles.hero}><Text style={styles.eyebrow}>{content[mode].eyebrow}</Text><Text style={styles.title}>{content[mode].title}</Text><Text style={styles.copy}>{content[mode].copy}</Text><View style={styles.orbit}><View style={styles.orbitDot} /></View></View>
      <View style={styles.form}>
        {mode === "register" ? <Field label="Họ và tên" value={name} onChangeText={setName} autoComplete="name" /> : null}
        <Field label="Email nhận hóa đơn" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" />
        {mode !== "forgot" ? <View style={styles.field}><Text style={styles.label}>Mật khẩu</Text><View style={styles.password}><TextInput accessibilityLabel="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete={mode === "login" ? "current-password" : "new-password"} style={styles.passwordInput} /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onPress={() => setShowPassword((value) => !value)} style={styles.eye}><Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.muted} /></Pressable></View>{mode === "register" ? <Text style={styles.hint}>Ít nhất 10 ký tự, có chữ và số.</Text> : null}</View> : null}
        {message ? <Text accessibilityRole="alert" style={[styles.message, success && styles.messageSuccess]}>{message}</Text> : null}
        {busy ? <ActivityIndicator color={colors.primary} /> : <Button label={content[mode].action} disabled={!valid} onPress={() => void submit()} />}
        {mode === "login" ? <><TextLink label="Quên mật khẩu?" onPress={() => router.push("/account-forgot")} /><TextLink label="Chưa có tài khoản? Đăng ký" onPress={() => router.push({ pathname: "/account-register", params: { next: params.next ?? "/account" } })} /></> : null}
        {mode === "register" || mode === "forgot" ? <TextLink label="Quay lại đăng nhập" onPress={() => router.replace("/account-login")} /> : null}
      </View>
    </CinematicScrollView>
  </SafeAreaView>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} style={styles.input} /></View>;
}
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.textLink}><Text style={styles.textLinkLabel}>{label}</Text><Feather name="arrow-right" size={15} color={colors.primary} /></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 22 },
  hero: { position: "relative", overflow: "hidden", minHeight: 244, backgroundColor: colors.ink, borderRadius: 24, borderCurve: "continuous", padding: 24, justifyContent: "flex-end", gap: 8 },
  eyebrow: { color: colors.mint, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 10, letterSpacing: 1.6 }, title: { maxWidth: 300, color: "white", fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 29, lineHeight: 35, letterSpacing: -1 }, copy: { maxWidth: 320, color: "#C7D5D3", fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 20 },
  orbit: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: "rgba(181,239,210,.24)", right: -74, top: -58, alignItems: "center", justifyContent: "flex-end" }, orbitDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.mint, marginBottom: -7 },
  form: { gap: 15, backgroundColor: "white", borderWidth: 1, borderColor: colors.line, padding: 20, borderRadius: 18, borderCurve: "continuous" }, field: { gap: 7 }, label: { color: colors.text, fontFamily: "BeVietnamPro_700Bold", fontSize: 12 }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 10, borderCurve: "continuous", paddingHorizontal: 13, color: colors.text, fontFamily: "BeVietnamPro_500Medium", backgroundColor: colors.canvas },
  password: { minHeight: 50, flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: 10, borderCurve: "continuous", backgroundColor: colors.canvas }, passwordInput: { flex: 1, paddingHorizontal: 13, color: colors.text, fontFamily: "BeVietnamPro_500Medium" }, eye: { width: 48, alignItems: "center", justifyContent: "center" }, hint: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 10 },
  message: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 9, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 11, lineHeight: 18 }, messageSuccess: { color: colors.primary, backgroundColor: colors.primarySoft },
  textLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line }, textLinkLabel: { color: colors.primary, fontFamily: "BeVietnamPro_700Bold", fontSize: 12 },
});
