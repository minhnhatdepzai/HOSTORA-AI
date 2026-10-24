import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/detail-header";
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { postJson } from "@/lib/api";

type Stage = "idea" | "content" | "building" | "live";
type DomainStatus = "need" | "owned" | "connected";
type Form = {
  websiteType: "store" | "company" | "blog";
  monthlyVisits: number;
  monthlyBudget: number;
  stage: Stage;
  deadlineWeeks: number;
  domainStatus: DomainStatus;
  contentReady: boolean;
  seoKeywordReady: boolean;
  analyticsReady: boolean;
  backupOwner: boolean;
  paymentReady: boolean;
  teamCanOperate: boolean;
};
type Report = {
  score: number;
  band: { label: string; copy: string };
  dimensions: {
    id: string;
    label: string;
    score: number;
    max: number;
    percent: number;
    note: string;
  }[];
  blockers: string[];
  recommendation: {
    provider: string;
    name: string;
    fitScore: number;
    promoMonthlyVnd: number;
    billingMonths: number;
    sourceUrl: string;
    verifiedAt: string;
  };
  ai: {
    headline: string;
    summary: string;
    strengths: string[];
    nextActions: string[];
    judgeQuestions: string[];
  };
  aiMode: "local-ai" | "deterministic-fallback";
  sources: {
    citation: string;
    title: string;
    sourceUrl: string;
    verifiedAt: string;
  }[];
  disclaimer: string;
};

const stages: [Stage, string][] = [
  ["idea", "Ý tưởng"],
  ["content", "Nội dung"],
  ["building", "Đang xây"],
  ["live", "Đã chạy"],
];
const checks = [
  ["contentReady", "Nội dung/sản phẩm đã sẵn sàng"],
  ["seoKeywordReady", "Đã chọn nhóm từ khóa SEO"],
  ["analyticsReady", "Đã có kế hoạch đo chuyển đổi"],
  ["backupOwner", "Có người phụ trách backup/restore"],
  ["paymentReady", "Đã chuẩn bị thanh toán/đơn hàng"],
  ["teamCanOperate", "Có người vận hành sau bàn giao"],
] as const;

export default function ReadinessScreen() {
  const { requirements } = useApp();
  const [form, setForm] = useState<Form>({
    websiteType: requirements.websiteType,
    monthlyVisits: requirements.monthlyVisits,
    monthlyBudget: requirements.monthlyBudget,
    stage: "building",
    deadlineWeeks: 4,
    domainStatus: requirements.needsDomain ? "need" : "owned",
    contentReady: false,
    seoKeywordReady: false,
    analyticsReady: false,
    backupOwner: false,
    paymentReady: false,
    teamCanOperate: false,
  });
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await postJson<Report>("/api/ai/readiness", form));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể chấm hồ sơ.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <DetailHeader
        title="Launch Score AI"
        action={<Pill tone="mint">CV CHECKER</Pill>}
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>AI launch readiness</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Chấm hồ sơ website trước khi launch.
          </Title>
          <Body style={{ marginTop: 10 }}>
            Điểm do code tính. Ollama local phản biện điểm yếu và lập kế hoạch 7
            ngày, không nhận tên hay số điện thoại.
          </Body>
        </View>
        <View style={styles.content}>
          <Card style={styles.form}>
            <Label text="LOẠI WEBSITE" />
            <ChoiceRow
              values={[
                ["store", "Bán hàng"],
                ["company", "Giới thiệu"],
                ["blog", "Blog"],
              ]}
              selected={form.websiteType}
              onSelect={(websiteType) => setForm({ ...form, websiteType })}
            />

            <Label text="GIAI ĐOẠN" />
            <ChoiceRow
              values={stages}
              selected={form.stage}
              onSelect={(stage) => setForm({ ...form, stage })}
            />

            <View style={styles.twoColumns}>
              <NumberField
                label="LƯỢT/THÁNG"
                value={form.monthlyVisits}
                onChange={(monthlyVisits) =>
                  setForm({ ...form, monthlyVisits })
                }
              />
              <NumberField
                label="NGÂN SÁCH/THÁNG"
                value={form.monthlyBudget}
                onChange={(monthlyBudget) =>
                  setForm({ ...form, monthlyBudget })
                }
              />
            </View>

            <Label text="THỜI GIAN TỚI LAUNCH" />
            <ChoiceRow
              values={[
                [1, "1 tuần"],
                [2, "2 tuần"],
                [4, "4 tuần"],
                [8, "8 tuần"],
              ]}
              selected={form.deadlineWeeks}
              onSelect={(deadlineWeeks) => setForm({ ...form, deadlineWeeks })}
            />

            <Label text="TÊN MIỀN" />
            <ChoiceRow
              values={[
                ["need", "Chưa có"],
                ["owned", "Đã mua"],
                ["connected", "Đã nối"],
              ]}
              selected={form.domainStatus}
              onSelect={(domainStatus) => setForm({ ...form, domainStatus })}
            />

            <Label text="CHECKLIST SẴN SÀNG" />
            <View style={styles.checks}>
              {checks
                .filter(
                  ([key]) =>
                    key !== "paymentReady" || form.websiteType === "store",
                )
                .map(([key, label]) => (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: form[key] }}
                    key={key}
                    onPress={() => setForm({ ...form, [key]: !form[key] })}
                    style={[styles.check, form[key] && styles.checkActive]}
                  >
                    <View
                      style={[
                        styles.checkIcon,
                        form[key] && styles.checkIconActive,
                      ]}
                    >
                      <Feather
                        name="check"
                        size={14}
                        color={form[key] ? "white" : colors.faint}
                      />
                    </View>
                    <Text style={styles.checkText}>{label}</Text>
                  </Pressable>
                ))}
            </View>
            <Button
              label={loading ? "AI đang phản biện…" : "Chấm Launch Score"}
              icon="award"
              onPress={() => void analyze()}
              disabled={loading}
            />
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card>

          {result ? <ReportView result={result} /> : <EmptyState />}
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function ReportView({ result }: { result: Report }) {
  return (
    <>
      <Card dark style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={styles.score}>{result.score}</Text>
          <Text style={styles.scoreOut}>/100</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiMode}>
            {result.aiMode === "local-ai"
              ? "OLLAMA ĐÃ PHẢN BIỆN"
              : "AI OFFLINE · ĐIỂM CODE"}
          </Text>
          <Text style={styles.band}>{result.band.label}</Text>
          <Text style={styles.bandCopy}>{result.band.copy}</Text>
        </View>
      </Card>

      <Card style={styles.resultCard}>
        <Text style={styles.sectionTitle}>Bản đồ sẵn sàng</Text>
        {result.dimensions.map((dimension) => (
          <View key={dimension.id} style={styles.dimension}>
            <View style={styles.dimensionTop}>
              <Text style={styles.dimensionLabel}>{dimension.label}</Text>
              <Text style={styles.dimensionScore}>
                {dimension.score}/{dimension.max}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${dimension.percent}%` }]} />
            </View>
            <Text style={styles.note}>{dimension.note}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.resultCard}>
        <View style={styles.sectionRow}>
          <Feather name="cpu" color={colors.primary} size={18} />
          <Text style={styles.sectionTitle}>{result.ai.headline}</Text>
        </View>
        <Text style={styles.summary}>{result.ai.summary}</Text>
        <Text style={styles.subheading}>Kế hoạch ưu tiên</Text>
        {result.ai.nextActions.map((item, index) => (
          <View key={item} style={styles.action}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={styles.actionText}>{item}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.resultCard}>
        <View style={styles.sectionRow}>
          <Feather name="server" color={colors.success} size={18} />
          <Text style={styles.sectionTitle}>Gói đang khớp</Text>
        </View>
        <Text style={styles.planName}>
          {result.recommendation.provider} {result.recommendation.name}
        </Text>
        <Text style={styles.note}>
          Fit {result.recommendation.fitScore}/100 · kỳ{" "}
          {result.recommendation.billingMonths} tháng ·{" "}
          {result.recommendation.promoMonthlyVnd.toLocaleString("vi-VN")}đ/tháng
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(result.recommendation.sourceUrl)}
        >
          <Text style={styles.source}>
            Mở nguồn · {result.recommendation.verifiedAt}
          </Text>
        </Pressable>
      </Card>

      <Card style={[styles.resultCard, styles.questionsCard]}>
        <View style={styles.sectionRow}>
          <Feather name="help-circle" color="#6D28D9" size={18} />
          <Text style={styles.questionTitle}>AI phản biện như giám khảo</Text>
        </View>
        {result.ai.judgeQuestions.map((question, index) => (
          <View key={question} style={styles.question}>
            <Text style={styles.questionIndex}>Q{index + 1}</Text>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        ))}
      </Card>

      {result.blockers.length ? (
        <Card style={styles.resultCard}>
          <View style={styles.sectionRow}>
            <Feather name="alert-triangle" color={colors.warning} size={18} />
            <Text style={styles.sectionTitle}>Điểm nghẽn</Text>
          </View>
          {result.blockers.map((blocker) => (
            <Text key={blocker} style={styles.blocker}>
              • {blocker}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card style={styles.resultCard}>
        <Text style={styles.note}>{result.disclaimer}</Text>
        {result.sources.map((source) => (
          <Text
            key={source.citation}
            accessibilityRole="link"
            onPress={() => void Linking.openURL(source.sourceUrl)}
            style={styles.source}
          >
            [{source.citation}] {source.title} · {source.verifiedAt}
          </Text>
        ))}
      </Card>
    </>
  );
}

function EmptyState() {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name="award" size={25} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Một điểm số, một lộ trình rõ</Text>
      <Text style={styles.emptyCopy}>
        Giống CV checker: HOSTORA chỉ ra điểm mạnh, điểm nghẽn và ba câu hỏi
        phản biện trước khi launch.
      </Text>
    </Card>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ChoiceRow<T extends string | number>({
  values,
  selected,
  onSelect,
}: {
  values: readonly (readonly [T, string])[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {values.map(([value, label]) => (
        <Pressable
          key={String(value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === selected }}
          onPress={() => onSelect(value)}
          style={[styles.choice, value === selected && styles.choiceActive]}
        >
          <Text
            style={[
              styles.choiceText,
              value === selected && styles.choiceTextActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ flex: 1, gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(text) => onChange(Number(text.replace(/[^0-9]/g, "")))}
        keyboardType="number-pad"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 14 },
  form: { gap: 13 },
  label: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    flexGrow: 1,
    minWidth: 65,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 9,
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  choiceTextActive: { color: "white" },
  twoColumns: { flexDirection: "row", gap: 9 },
  input: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  checks: { gap: 7 },
  check: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 10,
  },
  checkActive: { borderColor: "#9DDFC4", backgroundColor: colors.successSoft },
  checkIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIconActive: { backgroundColor: colors.success },
  checkText: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  error: {
    color: colors.danger,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 8,
    borderColor: colors.mint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  score: { color: "white", fontFamily: "BeVietnamPro_900Black", fontSize: 30 },
  scoreOut: {
    color: "#8FA0B6",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 8,
  },
  aiMode: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 7,
    letterSpacing: 1,
  },
  band: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 18,
    marginTop: 4,
  },
  bandCopy: {
    color: "#B8C5D5",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 4,
  },
  resultCard: { gap: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
  },
  dimension: { gap: 6 },
  dimensionTop: { flexDirection: "row", justifyContent: "space-between" },
  dimensionLabel: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  dimensionScore: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
  },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  note: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  summary: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
  },
  subheading: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  action: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  number: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  numberText: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
  },
  actionText: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 16,
  },
  planName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 18,
  },
  source: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
    lineHeight: 16,
  },
  questionsCard: { backgroundColor: "#F4F0FF", borderColor: "#DDD0FF" },
  questionTitle: {
    color: "#5B21B6",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
  },
  question: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 13,
    padding: 11,
  },
  questionIndex: {
    color: "#6D28D9",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
  },
  questionText: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
    lineHeight: 16,
  },
  blocker: {
    color: colors.warning,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 16,
  },
  empty: { alignItems: "center", paddingVertical: 34 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
    marginTop: 15,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 280,
  },
});
