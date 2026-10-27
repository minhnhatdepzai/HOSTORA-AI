import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const icons = {
  index: "home",
  products: "grid",
  consult: "compass",
  assistant: "message-circle",
  tools: "bar-chart-2",
  leads: "users",
} as const;

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
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { height: 64 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10), paddingLeft: insets.left, paddingRight: insets.right }],
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.icon, focused && styles.activeIcon]}><Feather
            name={icons[route.name as keyof typeof icons] ?? "circle"}
            color={String(color)}
            size={focused ? 21 : 19}
          /></View>
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
    elevation: 0,
  },
  item: { minHeight: 52 },
  icon: { width: 48, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeIcon: { backgroundColor: colors.primarySoft },
  label: { fontFamily: "BeVietnamPro_700Bold", fontSize: 10, marginTop: 1 },
});
