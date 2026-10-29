import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Body,
  Brand,
  Button,
  Card,
  Eyebrow,
  IconBox,
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { useRecommendedPlans } from "@/lib/recommendations";
import { normalizeContact } from "@/lib/contact";

export default function LeadsScreen() {
  const { leads, addLead, removeLead, requirements } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const { plans, status } = useRecommendedPlans(requirements);
  const topPlan = plans[0];
  const topPlanLabel = topPlan ? `${topPlan.provider} ${topPlan.name}` : "Chưa tải được gói tư vấn";

  function submit() {
    if (
      status !== "verified" || !topPlan || Boolean(normalizeContact({ name, phone }).error)
    )
      return;
    const contact = normalizeContact({ name, phone });
    addLead({
      name: contact.name,
      phone: contact.phone,
      plan: topPlanLabel,
      planId: topPlan.id,
    });
    setName("");
    setPhone("");
    setSaved(true);
  }

  function confirmDelete(id: string) {
    Alert.alert(
      "Xóa khách tư vấn?",
      "Dữ liệu này chỉ nằm trên thiết bị và không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => removeLead(id) },
      ],
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Brand />
        <Pill tone="mint" icon="lock">
          RIÊNG TƯ
        </Pill>
      </View>
      <View style={styles.intro}>
        <Eyebrow>Danh sách đăng ký</Eyebrow>
        <Title style={{ marginTop: 8 }}>Thông tin chỉ ở trên điện thoại.</Title>
        <Body style={{ marginTop: 10 }}>
          Họ tên và số điện thoại không được dùng trong phần tư vấn tự động.
        </Body>
      </View>
      <View style={styles.content}>
        <Card dark style={{ gap: 14 }}>
          <View style={styles.formTop}>
            <IconBox name="user-plus" tone="dark" />
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Đăng ký tư vấn</Text>
              <Text style={styles.formCopy}>
                Gói đang quan tâm: {topPlanLabel}
                {status !== "verified"
                  ? " · hãy kết nối lại để tải bảng giá"
                  : ""}
              </Text>
            </View>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Họ và tên"
            placeholderTextColor="#748399"
            style={styles.inputDark}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Số điện thoại"
            placeholderTextColor="#748399"
            style={styles.inputDark}
            keyboardType="phone-pad"
          />
          <Button
            label="Lưu trên thiết bị"
            icon="shield"
            variant="mint"
            disabled={
              status !== "verified" || !topPlan || Boolean(normalizeContact({ name, phone }).error)
            }
            onPress={submit}
          />
          {saved ? (
            <View style={styles.saved}>
              <Feather name="check-circle" color={colors.mint} size={15} />
              <Text style={styles.savedText}>
                Đã lưu cục bộ. Không dữ liệu nào rời thiết bị.
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryValue}>{leads.length}</Text>
            <Text style={styles.summaryLabel}>TỔNG ĐĂNG KÝ</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.summaryValue}>
              {
                leads.filter(
                  (lead) =>
                    lead.planId === topPlan?.id ||
                    lead.plan === topPlan?.name ||
                    lead.plan === topPlanLabel,
                ).length
              }
            </Text>
            <Text style={styles.summaryLabel}>
              QUAN TÂM {topPlan.name.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Khách đã đăng ký</Text>
          <Text style={styles.count}>{leads.length} mục</Text>
        </View>
        {leads.length === 0 ? (
          <Card style={styles.empty}>
            <IconBox name="users" />
            <Text style={styles.emptyTitle}>Chưa có khách đăng ký</Text>
            <Text style={styles.emptyCopy}>
              Khi khách đăng ký, thông tin sẽ xuất hiện ở đây và chỉ nằm trong
              ứng dụng trên điện thoại này.
            </Text>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} style={styles.lead}>
              <View style={styles.leadAvatar}>
                <Text style={styles.leadAvatarText}>
                  {lead.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leadName}>{lead.name}</Text>
                <Text style={styles.leadPhone}>{lead.phone}</Text>
                <View style={styles.leadMeta}>
                  <Pill tone="blue">{lead.plan}</Pill>
                  <Text style={styles.date}>
                    {new Date(lead.createdAt).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => confirmDelete(lead.id)}
                style={styles.delete}
              >
                <Feather name="trash-2" color={colors.danger} size={16} />
              </Pressable>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intro: { paddingHorizontal: 18, paddingTop: 28 },
  content: { paddingHorizontal: 18, paddingTop: 23, gap: 17 },
  formTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  formTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 17,
  },
  formCopy: {
    color: "#9FADBE",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    marginTop: 2,
  },
  inputDark: {
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,.06)",
    borderColor: "rgba(255,255,255,.1)",
    borderWidth: 1,
    color: "white",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  saved: { flexDirection: "row", alignItems: "center", gap: 7 },
  savedText: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 16,
    gap: 18,
  },
  divider: { width: 1, height: 36, backgroundColor: colors.line },
  summaryValue: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 25,
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 7,
    letterSpacing: 0.7,
    marginTop: 1,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  listTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 19,
  },
  count: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  empty: { alignItems: "center", paddingVertical: 31 },
  emptyTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
    marginTop: 12,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    maxWidth: 270,
    marginTop: 5,
  },
  lead: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  leadAvatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  leadAvatarText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 16,
  },
  leadName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  leadPhone: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    marginTop: 2,
  },
  leadMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  date: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 8,
  },
  delete: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
