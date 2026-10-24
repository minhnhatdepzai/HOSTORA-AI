import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export function DetailHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.slot}>
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather name="arrow-left" color={colors.text} size={20} />
        </Pressable>
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  slot: { width: 82 },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 14,
    textAlign: "center",
  },
  action: { width: 82, alignItems: "flex-end" },
});
