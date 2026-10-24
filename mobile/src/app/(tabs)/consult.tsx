import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type PropsWithChildren, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { postJson } from "@/lib/api";
import type { Requirements, WebsiteType } from "@/lib/catalog";

const websiteTypes: {
  value: WebsiteType;
  label: string;
  copy: string;
  icon: "shopping-bag" | "briefcase" | "edit-3";
}[] = [
  {
    value: "store",
    label: "Bán hàng",
    copy: "Sản phẩm, đơn hàng, thanh toán",
    icon: "shopping-bag",
  },
  {
    value: "company",
    label: "Giới thiệu",
    copy: "Thương hiệu, dịch vụ, khách hàng",
    icon: "briefcase",
  },
  {
    value: "blog",
    label: "Blog",
    copy: "Bài viết, độc giả, tìm kiếm Google",
    icon: "edit-3",
  },
];
const visits = [1000, 5000, 10000, 50000, 100000];
const budgets = [100000, 300000, 600000, 1000000];

type AnalyzeResult = Partial<Requirements> & { followUpQuestion?: string };

export default function ConsultScreen() {
  const { requirements, setRequirements } = useApp();
  const [data, setData] = useState(requirements);
  const [step, setStep] = useState(0);
  const [natural, setNatural] = useState(requirements.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function update(next: Partial<Requirements>) {
    setData((current) => ({ ...current, ...next }));
  }

  async function analyze() {
    setLoading(true);
    setMessage("");
    try {
      const out = await postJson<AnalyzeResult>("/api/ai/analyze", {
        text: natural,
      });
      const next: Requirements = {
        ...data,
        websiteType: out.websiteType ?? data.websiteType,
        monthlyVisits: out.monthlyVisits ?? data.monthlyVisits,
        monthlyBudget: out.monthlyBudget ?? data.monthlyBudget,
        needsDomain: out.needsDomain ?? data.needsDomain,
        ecommerce: out.ecommerce ?? data.ecommerce,
        notes: natural,
      };
      setData(next);
      setRequirements(next);
      setMessage(
        out.followUpQuestion ||
          "HOSTORA đã điền những thông tin nhận diện được.",
      );
    } catch {
      setMessage(
        "Chưa thể đọc mô tả lúc này. Bạn vẫn có thể chọn từng bước bên dưới.",
      );
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    setRequirements({ ...data, notes: natural });
    router.push("/recommendations");
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Brand />
        <Pill tone="mint" icon="heart">
          DỄ SỬ DỤNG
        </Pill>
      </View>
      <View style={styles.intro}>
        <Eyebrow>Tư vấn thông minh</Eyebrow>
        <Title style={{ marginTop: 8 }}>Bắt đầu từ điều bạn thật sự cần.</Title>
        <Body style={{ marginTop: 10 }}>
          Mô tả bằng lời hoặc đi từng bước. Bạn luôn có thể chỉnh lại trước khi
          xem đề xuất.
        </Body>
      </View>

      <Card style={styles.aiCard} dark>
        <View style={styles.aiHeading}>
          <View style={styles.bot}>
            <Feather name="message-square" color={colors.mint} size={19} />
          </View>
          <View>
            <Text style={styles.aiKicker}>MÔ TẢ BẰNG LỜI</Text>
            <Text style={styles.aiTitle}>Nói với HOSTORA</Text>
          </View>
        </View>
        <TextInput
          value={natural}
          onChangeText={setNatural}
          multiline
          placeholder="Tôi bán mỹ phẩm online, khoảng 5.000 lượt truy cập, ngân sách 300 nghìn..."
          placeholderTextColor="#78889D"
          style={styles.textarea}
          textAlignVertical="top"
        />
        <Pressable
          disabled={natural.trim().length < 10 || loading}
          onPress={analyze}
          style={({ pressed }) => [
            styles.aiButton,
            pressed && { opacity: 0.8 },
            (natural.trim().length < 10 || loading) && { opacity: 0.45 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Feather name="zap" color={colors.ink} size={16} />
          )}
          <Text style={styles.aiButtonText}>Tự điền giúp tôi</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>

      <View style={styles.progressTop}>
        <Text style={styles.stepLabel}>BƯỚC {step + 1}/4</Text>
        <Text style={styles.stepName}>
          {["Loại website", "Lưu lượng", "Ngân sách", "Tên miền"][step]}
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${(step + 1) * 25}%` }]} />
      </View>

      <Card style={styles.wizard}>
        {step === 0 && (
          <ChoiceStep
            title="Bạn đang xây loại website nào?"
            copy="Mỗi loại website sẽ có nhu cầu vận hành khác nhau."
          >
            {websiteTypes.map((item) => (
              <Choice
                key={item.value}
                selected={data.websiteType === item.value}
                icon={item.icon}
                label={item.label}
                copy={item.copy}
                onPress={() =>
                  update({
                    websiteType: item.value,
                    ecommerce: item.value === "store",
                  })
                }
              />
            ))}
          </ChoiceStep>
        )}
        {step === 1 && (
          <ChoiceStep
            title="Lượt truy cập mỗi tháng?"
            copy="Ước tính gần đúng để chọn gói khởi đầu phù hợp."
          >
            <Text style={styles.bigValue}>
              {data.monthlyVisits.toLocaleString("vi-VN")}
            </Text>
            <Text style={styles.unit}>LƯỢT / THÁNG</Text>
            <View style={styles.chipGrid}>
              {visits.map((value) => (
                <Chip
                  key={value}
                  selected={data.monthlyVisits === value}
                  label={value.toLocaleString("vi-VN")}
                  onPress={() => update({ monthlyVisits: value })}
                />
              ))}
            </View>
          </ChoiceStep>
        )}
        {step === 2 && (
          <ChoiceStep
            title="Ngân sách vận hành?"
            copy="HOSTORA ưu tiên cả chi phí ban đầu và chi phí lâu dài."
          >
            <Text style={styles.bigValue}>
              {data.monthlyBudget.toLocaleString("vi-VN")}đ
            </Text>
            <Text style={styles.unit}>VND / THÁNG</Text>
            <View style={styles.chipGrid}>
              {budgets.map((value) => (
                <Chip
                  key={value}
                  selected={data.monthlyBudget === value}
                  label={`${value / 1000}K`}
                  onPress={() => update({ monthlyBudget: value })}
                />
              ))}
            </View>
          </ChoiceStep>
        )}
        {step === 3 && (
          <ChoiceStep
            title="Bạn có cần tên miền?"
            copy="Chỉ tính ưu đãi khi nguồn chính thức xác nhận."
          >
            <Choice
              selected={data.needsDomain}
              icon="check-circle"
              label="Có, cần tên miền"
              copy="Ưu tiên gói tặng tên miền năm đầu"
              onPress={() => update({ needsDomain: true })}
            />
            <Choice
              selected={!data.needsDomain}
              icon="link"
              label="Không, tôi đã có"
              copy="Tập trung hosting và chi phí gia hạn"
              onPress={() => update({ needsDomain: false })}
            />
          </ChoiceStep>
        )}
        <View style={styles.navigation}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <Button
                label="Quay lại"
                icon="arrow-left"
                variant="secondary"
                onPress={() => setStep(step - 1)}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={{ flex: 1 }}>
            {step < 3 ? (
              <Button label="Tiếp tục" onPress={() => setStep(step + 1)} />
            ) : (
              <Button label="Xem đề xuất" icon="award" onPress={finish} />
            )}
          </View>
        </View>
      </Card>
    </Screen>
  );
}

function ChoiceStep({
  title,
  copy,
  children,
}: PropsWithChildren<{ title: string; copy: string }>) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.question}>{title}</Text>
      <Text style={styles.questionCopy}>{copy}</Text>
      <View style={{ gap: 9, marginTop: 9 }}>{children}</View>
    </View>
  );
}
function Choice({
  selected,
  icon,
  label,
  copy,
  onPress,
}: {
  selected: boolean;
  icon: "shopping-bag" | "briefcase" | "edit-3" | "check-circle" | "link";
  label: string;
  copy: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <View
        style={[
          styles.choiceIcon,
          selected && { backgroundColor: colors.primary },
        ]}
      >
        <Feather
          name={icon}
          color={selected ? "white" : colors.primary}
          size={18}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.choiceCopy}>{copy}</Text>
      </View>
      {selected ? (
        <Feather name="check" color={colors.primary} size={18} />
      ) : null}
    </Pressable>
  );
}
function Chip({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: "white" }]}>
        {label}
      </Text>
    </Pressable>
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
  aiCard: { marginHorizontal: 18, marginTop: 24 },
  aiHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  bot: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(184,243,214,.1)",
  },
  aiKicker: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  aiTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
    marginTop: 2,
  },
  textarea: {
    minHeight: 116,
    marginTop: 16,
    borderRadius: radii.md,
    padding: 14,
    color: "white",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 13,
    lineHeight: 21,
    backgroundColor: "rgba(255,255,255,.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.1)",
  },
  aiButton: {
    height: 48,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: colors.mint,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  aiButtonText: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
  },
  message: {
    color: "#CAD5E3",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 11,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 28,
  },
  stepLabel: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1,
  },
  stepName: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  progress: {
    height: 5,
    marginHorizontal: 18,
    marginTop: 9,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  wizard: { marginHorizontal: 18, marginTop: 14 },
  question: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  questionCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 19,
  },
  choice: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: 12,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
  },
  choiceLabel: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  choiceCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 2,
  },
  bigValue: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 37,
    letterSpacing: -1.5,
    textAlign: "center",
    marginTop: 18,
  },
  unit: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.3,
    textAlign: "center",
    marginTop: -4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 17,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  navigation: { flexDirection: "row", gap: 9, marginTop: 24 },
});
