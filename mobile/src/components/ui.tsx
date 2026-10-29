import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Children, isValidElement, useCallback, useMemo, useState } from "react";
import type { ComponentProps, PropsWithChildren, ReactNode, Ref } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  type ScrollViewProps,
  StyleSheet,
  Text,
  type ScrollViewInstance,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/constants/theme";
import {
  ScrollMotionContext,
  ScrollReveal,
  ScrollRevealText,
} from "@/components/motion";

export function Screen({
  children,
  dark = false,
  insetTop = true,
  scrollRef,
  onScroll,
  revealChildren = true,
}: PropsWithChildren<{
  dark?: boolean;
  insetTop?: boolean;
  scrollRef?: Ref<ScrollViewInstance>;
  onScroll?: ScrollViewProps["onScroll"];
  revealChildren?: boolean;
}>) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [viewportHeight, setViewportHeight] = useState(0);
  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true, listener: onScroll },
      ),
    [onScroll, scrollY],
  );
  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safe, dark && styles.safeDark]}
      edges={insetTop ? ["top", "left", "right", "bottom"] : ["bottom"]}
      onLayout={handleViewportLayout}
    >
      <ScrollMotionContext.Provider value={{ scrollY, viewportHeight, baseTop: 0 }}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {revealChildren
            ? Children.map(children, (child, index) =>
                isValidElement(child) ? (
                  <ScrollReveal key={child.key ?? `screen-section-${index}`}>
                    {child}
                  </ScrollReveal>
                ) : (
                  child
                ),
              )
            : children}
        </Animated.ScrollView>
      </ScrollMotionContext.Provider>
    </SafeAreaView>
  );
}

export function CinematicScrollView({
  children,
  scrollRef,
  onScroll,
  onLayout,
  revealChildren = true,
  ...props
}: PropsWithChildren<
  ScrollViewProps & {
    scrollRef?: Ref<ScrollViewInstance>;
    revealChildren?: boolean;
  }
>) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [viewportHeight, setViewportHeight] = useState(0);
  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true, listener: onScroll },
      ),
    [onScroll, scrollY],
  );
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
      onLayout?.(event);
    },
    [onLayout],
  );

  return (
    <ScrollMotionContext.Provider value={{ scrollY, viewportHeight, baseTop: 0 }}>
      <Animated.ScrollView
        {...props}
        ref={scrollRef}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {revealChildren
          ? Children.map(children, (child, index) =>
              isValidElement(child) ? (
                <ScrollReveal key={child.key ?? `scroll-section-${index}`}>
                  {child}
                </ScrollReveal>
              ) : (
                child
              ),
            )
          : children}
      </Animated.ScrollView>
    </ScrollMotionContext.Provider>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <Image
        source={require("../../assets/images/hostora-icon-source.png")}
        style={styles.brandMark}
        contentFit="cover"
        accessibilityLabel="Biểu tượng HOSTORA"
      />
      <View>
        <Text style={[styles.brandName, inverse && { color: "white" }]}>
          HOSTORA
        </Text>
        <Text style={[styles.brandSub, inverse && { color: colors.mint }]}>
          CỐ VẤN TRANG WEB
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
    <ScrollRevealText style={[styles.eyebrow, light && { color: colors.mint }]}>
      {children}
    </ScrollRevealText>
  );
}

export function Title({
  children,
  light = false,
  style,
}: PropsWithChildren<{ light?: boolean; style?: TextStyle }>) {
  return (
    <ScrollRevealText
      style={[styles.title, light && { color: "white" }, style]}
    >
      {children}
    </ScrollRevealText>
  );
}

export function Body({
  children,
  light = false,
  style,
}: PropsWithChildren<{ light?: boolean; style?: TextStyle }>) {
  return (
    <ScrollRevealText
      style={[styles.body, light && { color: "#CAD5E3" }, style]}
    >
      {children}
    </ScrollRevealText>
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
      accessibilityState={{ disabled }}
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
      <View style={[styles.buttonIcon, { backgroundColor: variant === "primary" ? "rgba(255,255,255,0.12)" : "rgba(17,105,94,0.07)" }]}>
        <Feather name={icon} size={16} color={textColor} />
      </View>
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
        <ScrollRevealText style={styles.sectionTitle}>{title}</ScrollRevealText>
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
  scroll: {
    paddingBottom: 32,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: radii.sm,
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
  buttonText: { fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 13, flexShrink: 1 },
  buttonIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pressed: { opacity: 0.9 },
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
