import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

const icons = {
  index: "home",
  consult: "zap",
  assistant: "message-circle",
  tools: "activity",
  leads: "users",
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ color, focused }) => (
          <Feather
            name={icons[route.name as keyof typeof icons] ?? "circle"}
            color={String(color)}
            size={focused ? 21 : 19}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Trang chủ" }} />
      <Tabs.Screen name="consult" options={{ title: "Tư vấn" }} />
      <Tabs.Screen name="assistant" options={{ title: "Trợ lý" }} />
      <Tabs.Screen name="tools" options={{ title: "Công cụ" }} />
      <Tabs.Screen name="leads" options={{ title: "Leads" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "ios" ? 7 : 10,
    height: Platform.OS === "ios" ? 80 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 9,
    borderTopWidth: 0,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.97)",
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { borderRadius: 18 },
  label: { fontFamily: "BeVietnamPro_700Bold", fontSize: 9, marginTop: 1 },
});
