import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/constants/theme";

export function Screen({
  children,
  dark = false,
}: PropsWithChildren<{ dark?: boolean }>) {
  return (
    <SafeAreaView
      style={[styles.safe, dark && styles.safeDark]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <LinearGradient
        colors={[colors.mint, "#76E3EF"]}
        style={styles.brandMark}
      >
        <Text style={styles.brandLetter}>H</Text>
      </LinearGradient>
      <View>
        <Text style={[styles.brandName, inverse && { color: "white" }]}>
          HOSTORA
        </Text>
        <Text style={[styles.brandSub, inverse && { color: colors.mint }]}>
          CỐ VẤN WEBSITE
        </Text>
      </View>
    </View>
  );
}

export function Eyebrow({
  children,
  light = false,
}: PropsWithChildren<{ light?: boolean }>) {
  return (
    <Text style={[styles.eyebrow, light && { color: colors.mint }]}>
      {children}
    </Text>
  );
}

export function Title({
  children,
  light = false,
  style,
}: PropsWithChildren<{ light?: boolean; style?: TextStyle }>) {
  return (
    <Text style={[styles.title, light && { color: "white" }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  light = false,
  style,
}: PropsWithChildren<{ light?: boolean; style?: TextStyle }>) {
  return (
    <Text style={[styles.body, light && { color: "#CAD5E3" }, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  dark = false,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; dark?: boolean }>) {
  return (
    <View style={[styles.card, dark && styles.cardDark, style]}>
      {children}
    </View>
  );
}

export function Pill({
  children,
  tone = "blue",
  icon,
}: PropsWithChildren<{
  tone?: "blue" | "mint" | "dark" | "warning";
  icon?: ComponentProps<typeof Feather>["name"];
}>) {
  const map = {
    blue: [colors.primarySoft, colors.primary],
    mint: [colors.successSoft, colors.success],
    dark: [colors.inkSoft, colors.mint],
    warning: [colors.warningSoft, colors.warning],
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: map[tone][0] }]}>
      {icon ? <Feather name={icon} size={12} color={map[tone][1]} /> : null}
      <Text style={[styles.pillText, { color: map[tone][1] }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon = "arrow-right",
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Feather>["name"];
  variant?: "primary" | "secondary" | "mint" | "ghost";
  disabled?: boolean;
}) {
  const variantStyle = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    mint: styles.buttonMint,
    ghost: styles.buttonGhost,
  }[variant];
  const textColor =
    variant === "primary"
      ? "white"
      : variant === "mint"
        ? colors.ink
        : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
      <Feather name={icon} size={17} color={textColor} />
    </Pressable>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function IconBox({
  name,
  tone = "blue",
}: {
  name: ComponentProps<typeof Feather>["name"];
  tone?: "blue" | "mint" | "dark";
}) {
  const map = {
    blue: [colors.primarySoft, colors.primary],
    mint: [colors.successSoft, colors.success],
    dark: [colors.ink, colors.mint],
  } as const;
  return (
    <View style={[styles.iconBox, { backgroundColor: map[tone][0] }]}>
      <Feather name={name} size={19} color={map[tone][1]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  safeDark: { backgroundColor: colors.ink },
  scroll: { paddingBottom: 128 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 18,
  },
  brandName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 15,
    letterSpacing: -0.4,
  },
  brandSub: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.8,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.35,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.45,
  },
  body: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 14,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 18,
    ...shadows.card,
  },
  cardDark: {
    backgroundColor: colors.inkSoft,
    borderColor: "rgba(255,255,255,.09)",
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonPrimary: { backgroundColor: colors.primary, ...shadows.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
  },
  buttonMint: { backgroundColor: colors.mint },
  buttonGhost: { backgroundColor: colors.surfaceAlt },
  buttonText: { fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 13 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.6,
    marginTop: 5,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
