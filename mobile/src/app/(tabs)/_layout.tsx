import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from "react-native-reanimated";
import { useMotionPreference } from "@/components/motion";

const icons = {
  index: "home",
  products: "grid",
  consult: "compass",
  assistant: "message-circle",
  tools: "bar-chart-2",
  leads: "users",
} as const;

function TabIcon({ name, focused, color }: { name: keyof typeof icons; focused: boolean; color: string }) {
  const reduced = useMotionPreference();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: reduced ? 0 : 220,
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, reduced, progress]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * progress.value }, { scale: 1 + 0.06 * progress.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.7 + 0.3 * progress.value }],
  }));
  return (
    <View style={styles.icon}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.activeIcon, backdropStyle]} />
      <Animated.View style={iconStyle}>
        <Feather name={icons[name] ?? "circle"} color={color} size={20} />
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: "fade",
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { height: 64 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10), paddingLeft: insets.left, paddingRight: insets.right }],
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name={route.name as keyof typeof icons} focused={focused} color={String(color)} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ" }} />
      <Tabs.Screen name="products" options={{ title: "Dịch vụ" }} />
      <Tabs.Screen name="consult" options={{ title: "Chọn gói" }} />
      <Tabs.Screen name="assistant" options={{ title: "Hỏi đáp" }} />
      <Tabs.Screen name="tools" options={{ title: "Chi phí" }} />
      <Tabs.Screen name="leads" options={{ href: null, title: "Yêu cầu đã lưu" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  item: { minHeight: 52 },
  icon: { width: 48, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeIcon: { backgroundColor: colors.primarySoft, borderRadius: 12 },
  label: { fontFamily: "BeVietnamPro_700Bold", fontSize: 10, marginTop: 1 },
});
