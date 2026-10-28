import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/app-context";
import { colors } from "@/constants/theme";
import { BrandOrbit } from "./brand-orbit";

const kindLabel = {
  order: "Đơn hàng",
  payment: "Thanh toán",
  refund: "Hoàn tiền",
  voucher: "Voucher",
} as const;

export function NotificationCenter() {
  const insets = useSafeAreaInsets();
  const floatingBottom = Math.max(insets.bottom, 10) + 76;
  const {
    notifications,
    unreadNotifications,
    markNotificationRead,
  } = useApp();
  const [open, setOpen] = useState(false);
  const latestUnread = useMemo(
    () => notifications.find((item) => !item.read),
    [notifications],
  );

  function openNotification(id: string, route?: string) {
    markNotificationRead(id);
    if (route) {
      setOpen(false);
      router.push(route as never);
    }
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {latestUnread && !open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${latestUnread.title}. Mở thông báo`}
          onPress={() => {
            markNotificationRead(latestUnread.id);
            setOpen(true);
          }}
          style={[styles.banner, { bottom: floatingBottom }]}
        >
          <View style={styles.bannerIcon}>
            <Feather name="bell" size={17} color={colors.mint} />
          </View>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerEyebrow}>{kindLabel[latestUnread.kind]}</Text>
            <Text numberOfLines={1} style={styles.bannerTitle}>
              {latestUnread.title}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#B8C9C5" />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Thông báo${unreadNotifications ? `, ${unreadNotifications} chưa đọc` : ""}`}
        onPress={() => setOpen(true)}
        style={[styles.bell, { bottom: floatingBottom }]}
      >
        <Feather name="bell" size={19} color="white" />
        {unreadNotifications ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadNotifications, 9)}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Đóng thông báo"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>TRUNG TÂM CẬP NHẬT</Text>
                <Text style={styles.sheetTitle}>Việc vừa xảy ra.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setOpen(false)}
                style={styles.close}
              >
                <Feather name="x" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.orbitStage}>
              <BrandOrbit />
              <Text style={styles.orbitHint}>Kéo biểu tượng để xoay không gian HOSTORA</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.length ? (
                notifications.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => openNotification(item.id, item.route)}
                    style={[styles.item, !item.read && styles.itemUnread]}
                  >
                    <View style={[styles.dot, item.read && styles.dotRead]} />
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemMeta}>
                        {kindLabel[item.kind]} · {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </Text>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemMessage}>{item.message}</Text>
                    </View>
                    {item.route ? <Feather name="arrow-up-right" size={17} color={colors.primary} /> : null}
                  </Pressable>
                ))
              ) : (
                <View style={styles.empty}>
                  <Feather name="inbox" size={24} color={colors.primary} />
                  <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
                  <Text style={styles.emptyCopy}>Khi bạn đặt mua hoặc thanh toán, cập nhật sẽ xuất hiện tại đây.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: "absolute", zIndex: 80, left: 14, right: 66, minHeight: 58, backgroundColor: "#092734F2", borderWidth: 1, borderColor: "#B5EFD233", paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#071827", shadowOpacity: .24, shadowRadius: 18, elevation: 12 },
  bannerIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: "#B5EFD21A", alignItems: "center", justifyContent: "center" },
  bannerCopy: { flex: 1 }, bannerEyebrow: { color: colors.mint, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 8, letterSpacing: 1.1, textTransform: "uppercase" }, bannerTitle: { color: "white", fontFamily: "BeVietnamPro_700Bold", fontSize: 12, marginTop: 2 },
  bell: { position: "absolute", zIndex: 90, right: 22, width: 44, height: 44, borderRadius: 14, backgroundColor: colors.ink, borderWidth: 1, borderColor: "#B5EFD266", alignItems: "center", justifyContent: "center", elevation: 13 },
  badge: { position: "absolute", top: -5, right: -4, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#EF6B54", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.canvas }, badgeText: { color: "white", fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 9 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(3,12,19,.58)" },
  sheet: { maxHeight: "88%", backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#C7D3CF", alignSelf: "center", marginTop: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 17 },
  sheetEyebrow: { color: colors.primary, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 9, letterSpacing: 1.1 }, sheetTitle: { color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 24, letterSpacing: -.5, marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 13, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  orbitStage: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.ink, borderRadius: 22, overflow: "hidden", paddingVertical: 4 }, orbitHint: { color: "#A9BBB6", textAlign: "center", fontFamily: "BeVietnamPro_500Medium", fontSize: 10, marginTop: -8, marginBottom: 12 },
  list: { padding: 20, gap: 9 },
  item: { minHeight: 92, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, backgroundColor: "white", borderWidth: 1, borderColor: colors.line }, itemUnread: { borderColor: "#72C5A4", backgroundColor: "#F1FBF6" }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 }, dotRead: { backgroundColor: "#C4CECB" }, itemCopy: { flex: 1 }, itemMeta: { color: colors.muted, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 9 }, itemTitle: { color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 13, marginTop: 3 }, itemMessage: { color: colors.text, fontFamily: "BeVietnamPro_400Regular", fontSize: 11, lineHeight: 17, marginTop: 3 },
  empty: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 24 }, emptyTitle: { color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 16, marginTop: 10 }, emptyCopy: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 5 },
});
