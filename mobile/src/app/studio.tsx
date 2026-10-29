import { DetailHeader } from "@/components/detail-header";
import { RevealWords, ScrollReveal } from "@/components/motion";
import { Pressable } from "@/components/pressable";
import { Body, Button, Eyebrow, Screen, Title } from "@/components/ui";
import { ColorPalette } from "@/components/color-palette";
import { colors } from "@/constants/theme";
import { getApiBase, postJson } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Choice = "food" | "retail" | "service" | "portfolio" | "education";
type Goal = "sell" | "book" | "showcase" | "contact";
type Style = "editorial" | "bold" | "warm" | "minimal";
type Accent = string;
type PreviewView = "home" | "about" | "contact";
type Brief = {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  aboutTitle: string;
  aboutCopy: string;
  features: { title: string; copy: string }[];
};
type Result = {
  brief: Brief;
  notice: string;
  generationMode: "local-ai" | "template-fallback";
  project: {
    id: string;
    url: string;
    downloadUrl: string;
    repositoryUrl: string | null;
    publishMessage: string;
  };
  recommendations: {
    id: string;
    eligibility: "eligible" | "over-budget" | "unverified" | "unsupported";
    upfrontVnd: number;
    provider: string;
    name: string;
    score: number;
    promoMonthlyVnd: number;
    renewalMonthlyVnd: number | null;
    billingMonths: number;
    sourceUrl: string;
    reasons: string[];
  }[];
};

const businesses = [
  ["food", "Ẩm thực"],
  ["retail", "Bán lẻ"],
  ["service", "Dịch vụ"],
  ["portfolio", "Cá nhân"],
  ["education", "Giáo dục"],
] as const;
const goals = [
  ["sell", "Bán hàng"],
  ["book", "Nhận đặt lịch"],
  ["showcase", "Giới thiệu"],
  ["contact", "Nhận liên hệ"],
] as const;
const styles = [
  ["editorial", "Biên tập"],
  ["bold", "Táo bạo"],
  ["warm", "Ấm áp"],
  ["minimal", "Tối giản"],
] as const;
const trafficPresets = [1_000, 5_000, 10_000, 50_000, 100_000] as const;
const budgetPresets = [100_000, 300_000, 600_000, 1_000_000] as const;
const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

function money(value: number | null) {
  return value == null
    ? "Chưa có dữ liệu"
    : `${value.toLocaleString("vi-VN")}đ`;
}

export default function StudioScreen() {
  const auth = useCustomerAuth();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  const [brand, setBrand] = useState("");
  const [idea, setIdea] = useState("");
  const [story, setStory] = useState("");
  const [offerings, setOfferings] = useState("");
  const [customerAction, setCustomerAction] = useState("");
  const [audience, setAudience] = useState("");
  const [business, setBusiness] = useState<Choice>("service");
  const [goal, setGoal] = useState<Goal>("contact");
  const [style, setStyle] = useState<Style>("editorial");
  const [monthlyVisits, setMonthlyVisits] = useState(5000);
  const [monthlyBudget, setMonthlyBudget] = useState(100000);
  const [color, setColor] = useState<Accent>("#11695e");
  const [colorDraft, setColorDraft] = useState("#11695e");
  const [needsDomain, setNeedsDomain] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready =
    brand.trim().length >= 2 &&
    audience.trim().length >= 3 &&
    idea.trim().length >= 12 &&
    isHexColor(colorDraft) &&
    Number.isInteger(monthlyVisits) &&
    monthlyVisits >= 1 &&
    monthlyVisits <= 100000000 &&
    Number.isInteger(monthlyBudget) &&
    monthlyBudget >= 10000 &&
    monthlyBudget <= 100000000;
  const missingRequirements = [
    ...(brand.trim().length < 2 ? ["tên thương hiệu (ít nhất 2 ký tự)"] : []),
    ...(audience.trim().length < 3
      ? ["khách hàng chính (ít nhất 3 ký tự)"]
      : []),
    ...(idea.trim().length < 12 ? ["ý tưởng (ít nhất 12 ký tự)"] : []),
    ...(!isHexColor(colorDraft) ? ["mã màu HEX hợp lệ"] : []),
    ...(!Number.isInteger(monthlyVisits) ||
    monthlyVisits < 1 ||
    monthlyVisits > 100000000
      ? ["lượt truy cập từ 1 đến 100.000.000"]
      : []),
    ...(!Number.isInteger(monthlyBudget) ||
    monthlyBudget < 10000 ||
    monthlyBudget > 100000000
      ? ["ngân sách từ 10.000đ đến 100.000.000đ"]
      : []),
  ];

  function updateColor(value: string) {
    setColorDraft(value);
    if (isHexColor(value)) setColor(value);
  }

  async function generate() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const output = await postJson<Result>("/api/ai/site-studio", {
        brand: brand.trim(),
        idea: idea.trim(),
        story: story.trim(),
        offerings: offerings.trim(),
        customerAction: customerAction.trim(),
        business,
        goal,
        audience: audience.trim(),
        style,
        monthlyVisits,
        monthlyBudget,
        needsDomain,
        color,
      });
      setResult(output);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chưa thể tạo bản xem trước.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!auth.hydrated) {
    return <Screen><DetailHeader title="Xưởng tạo trang web" /><ActivityIndicator color={colors.primary} /></Screen>;
  }
  if (!auth.customer) {
    return <Screen><DetailHeader title="Xưởng tạo trang web" /><View style={page.form}><Eyebrow>WEBSITE THUỘC VỀ BẠN</Eyebrow><Title>Đăng nhập trước khi bắt đầu.</Title><Body>HOSTORA giữ bản xem trước, lịch sử chỉnh sửa và mã nguồn theo đúng tài khoản sở hữu.</Body><Button label="Đăng nhập để tạo website" icon="log-in" onPress={() => router.push({ pathname: "/account-login", params: { next: "/studio" } })} /><Button label="Tạo tài khoản mới" variant="secondary" icon="user-plus" onPress={() => router.push({ pathname: "/account-register", params: { next: "/studio" } })} /></View></Screen>;
  }

  return (
    <Screen
      revealChildren={false}
      scrollRef={scrollRef}
      onScroll={(event) => scrollY.setValue(event.nativeEvent.contentOffset.y)}
    >
      <DetailHeader title="Xưởng tạo trang web" />
      <View style={page.hero}>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          style={[
            page.heroOrbit,
            {
              transform: [{
                translateY: scrollY.interpolate({
                  inputRange: [0, 360],
                  outputRange: [0, -76],
                  extrapolate: "clamp",
                }),
              }, {
                rotate: scrollY.interpolate({
                  inputRange: [0, 360],
                  outputRange: ["-18deg", "48deg"],
                  extrapolate: "clamp",
                }),
              }],
            },
          ]}
        >
          <View style={page.heroOrbitInner} />
        </Animated.View>
        <Eyebrow light>TRỢ LÝ TẠO TRANG WEB · HOSTORA</Eyebrow>
        <RevealWords
          style={[page.heroTitle, { color: "#fff" }]}
          segments={[
            { text: "Kể ý tưởng.\n" },
            { text: "Nhìn thấy trang web.", style: page.heroAccent },
          ]}
        />
        <Body light style={page.heroCopy}>
          AI cục bộ soạn nội dung. App dựng bản xem trước và chọn hosting bằng
          dữ liệu đã kiểm tra.
        </Body>
      </View>

      <ScrollReveal animate={false} style={page.form}>
        <Question
          number="01"
          title="Bạn muốn tạo trang web gì?"
          copy="Kể như đang nói với một người thiết kế."
        />
        <Field
          label="Tên thương hiệu"
          value={brand}
          onChangeText={setBrand}
          placeholder="Ví dụ: Mộc Cafe"
        />
        <Field
          label="Khách hàng chính"
          value={audience}
          onChangeText={setAudience}
          placeholder="Ví dụ: dân văn phòng ở trung tâm"
        />
        <Field
          label="Sản phẩm và câu chuyện của bạn"
          value={idea}
          onChangeText={setIdea}
          placeholder="Bạn bán gì, khách nên biết điều gì, và muốn họ làm gì?"
          multiline
        />
        <Field
          label="Vì sao thương hiệu bắt đầu? · nếu có"
          value={story}
          onChangeText={setStory}
          maxLength={400}
          placeholder="Một chi tiết riêng mà bạn muốn khách nhớ"
          multiline
        />
        <Field
          label="Bạn đang bán hoặc làm cụ thể gì? · nếu có"
          value={offerings}
          onChangeText={setOfferings}
          maxLength={400}
          placeholder="Tên món, nhóm sản phẩm hoặc dịch vụ thật"
          multiline
        />
        <Field
          label="Khách nên làm gì sau khi xem? · nếu có"
          value={customerAction}
          onChangeText={setCustomerAction}
          maxLength={300}
          placeholder="Ví dụ: xem mẫu rồi gửi yêu cầu"
        />

        <Question
          number="02"
          title="Website cần làm việc gì?"
          copy="Chọn mục tiêu quan trọng nhất với khách hàng."
        />
        <ChoiceGroup
          label="Loại hình"
          options={businesses}
          value={business}
          onChange={setBusiness}
        />
        <ChoiceGroup
          label="Mục tiêu"
          options={goals}
          value={goal}
          onChange={setGoal}
        />

        <Question
          number="03"
          title="Bạn thích cảm giác nào?"
          copy="Mở bảng màu để phối theo thương hiệu hoặc nhập mã HEX riêng."
        />
        <ChoiceGroup
          label="Phong cách"
          options={styles}
          value={style}
          onChange={setStyle}
        />
        <View style={page.field}>
          <Text style={page.label}>Bảng mã màu</Text>
          <ColorPalette value={colorDraft} onChange={updateColor} />
        </View>

        <Question
          number="04"
          title="Quy mô dự kiến ra sao?"
          copy="Dùng để chấm gói hosting, không gửi cho nhà cung cấp."
        />
        <View style={page.field}>
          <Text style={page.label}>Lượt truy cập mỗi tháng · tự nhập</Text>
          <TextInput
            accessibilityLabel="Lượt truy cập dự kiến mỗi tháng"
            keyboardType="number-pad"
            maxLength={9}
            value={String(monthlyVisits)}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 9);
              setMonthlyVisits(digits ? Number(digits) : 0);
            }}
            style={page.input}
          />
          <Text style={page.fieldHint}>
            Từ 1 đến 100.000.000 lượt/tháng; mức bên dưới chỉ để chọn nhanh.
          </Text>
          <Text style={page.fieldHint}>Mức tham khảo</Text>
          <View style={page.presets}>
            {trafficPresets.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: monthlyVisits === value }}
                onPress={() => setMonthlyVisits(value)}
                style={[
                  page.choice,
                  monthlyVisits === value && page.choiceActive,
                ]}
              >
                <Text
                  style={[
                    page.choiceText,
                    monthlyVisits === value && page.choiceTextActive,
                  ]}
                >
                  {value.toLocaleString("vi-VN")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={page.field}>
          <Text style={page.label}>
            Ngân sách hosting mỗi tháng (VND) · tự nhập
          </Text>
          <TextInput
            accessibilityLabel="Ngân sách hosting mỗi tháng bằng đồng"
            keyboardType="number-pad"
            maxLength={9}
            value={String(monthlyBudget)}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 9);
              setMonthlyBudget(digits ? Number(digits) : 0);
            }}
            style={page.input}
          />
          <Text style={page.fieldHint}>
            Từ 10.000đ đến 100.000.000đ/tháng; mức bên dưới chỉ để chọn nhanh.
          </Text>
          <Text style={page.fieldHint}>Mức tham khảo</Text>
          <View style={page.presets}>
            {budgetPresets.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: monthlyBudget === value }}
                onPress={() => setMonthlyBudget(value)}
                style={[
                  page.choice,
                  monthlyBudget === value && page.choiceActive,
                ]}
              >
                <Text
                  style={[
                    page.choiceText,
                    monthlyBudget === value && page.choiceTextActive,
                  ]}
                >
                  {money(value)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: needsDomain }}
          onPress={() => setNeedsDomain((current) => !current)}
          style={[page.check, needsDomain && page.checkActive]}
        >
          <Feather
            name={needsDomain ? "check" : "circle"}
            size={16}
            color={colors.primary}
          />
          <Text style={page.checkText}>Tôi cần mua tên miền mới</Text>
        </Pressable>
        {error ? <Text style={page.error}>{error}</Text> : null}
        <Button
          label={
            busy
              ? "AI đang dựng và kiểm chứng · có thể mất 1–2 phút…"
              : "Tạo trang web và chọn nơi lưu trữ"
          }
          icon={busy ? "loader" : "send"}
          disabled={!ready || busy}
          onPress={generate}
        />
        {missingRequirements.length > 0 ? (
          <Text accessibilityLiveRegion="polite" style={page.fieldHint}>
            Để bật nút tạo, hãy nhập {missingRequirements.join("; ")}.
          </Text>
        ) : null}
        {busy ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : null}
        <Text style={page.privacy}>
          Không nhập số điện thoại, email hoặc thông tin bí mật.
        </Text>
      </ScrollReveal>

      {result ? (
        <View
          onLayout={({ nativeEvent }) => {
            const y = nativeEvent.layout.y;
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, y - 96),
                animated: true,
              }),
            );
          }}
        >
          <StudioResult
            result={result}
            brand={brand}
            color={color}
            goal={goal}
            onResult={setResult}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function StudioResult({
  result,
  brand,
  color,
  goal,
  onResult,
}: {
  result: Result;
  brand: string;
  color: Accent;
  goal: Goal;
  onResult: (result: Result) => void;
}) {
  const [revision, setRevision] = useState("");
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState("");
  const [previewView, setPreviewView] = useState<PreviewView>("home");

  async function openProjectLink(path: string) {
    const base = await getApiBase();
    if (base) await Linking.openURL(`${base}${path}`);
  }

  async function revise() {
    if (revisionBusy || revision.trim().length < 3) return;
    setRevisionBusy(true);
    setRevisionNotice("");
    try {
      const updated = await postJson<{
        brief: Brief;
        publishMessage?: string | null;
      }>(`/api/ai/site-studio/${result.project.id}`, { message: revision });
      onResult({ ...result, brief: updated.brief });
      setRevision("");
      setRevisionNotice(
        updated.publishMessage ?? "Đã cập nhật nội dung trang web.",
      );
    } catch (cause) {
      setRevisionNotice(
        cause instanceof Error ? cause.message : "Chưa thể lưu thay đổi.",
      );
    } finally {
      setRevisionBusy(false);
    }
  }

  return (
    <View style={page.results}>
      <View style={page.preview}>
        <View style={page.previewTop}>
          <Text style={page.previewBrand}>{brand.toUpperCase()}</Text>
          <Text style={page.previewNav}>BẢN XEM NHANH</Text>
        </View>
        <View style={page.previewTabs} accessibilityRole="tablist">
          {(
            [
              ["home", "Trang đầu"],
              ["about", "Giới thiệu"],
              ["contact", "Liên hệ"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: previewView === value }}
              accessibilityLabel={`Xem ${label.toLowerCase()} trong trang web mẫu`}
              onPress={() => setPreviewView(value)}
              style={[
                page.previewTab,
                previewView === value && page.previewTabActive,
              ]}
            >
              <Text
                style={[
                  page.previewTabText,
                  previewView === value && page.previewTabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {previewView === "home" ? (
          <View style={page.previewContent}>
            <Text style={[page.previewKicker, { color }]}>
              BẢN DEMO WEBSITE
            </Text>
            <Text style={page.previewTitle} numberOfLines={4}>
              {result.brief.headline}
            </Text>
            <Text style={page.previewCopy} numberOfLines={4}>
              {result.brief.subheadline}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={result.brief.ctaLabel}
              onPress={() =>
                setPreviewView(
                  goal === "contact" || goal === "book" ? "contact" : "about",
                )
              }
              style={[page.previewButton, { backgroundColor: color }]}
            >
              <Text style={page.previewButtonText}>
                {result.brief.ctaLabel}
              </Text>
            </Pressable>
            <View style={[page.previewVisual, { backgroundColor: color }]}>
              <Text style={page.previewVisualText}>
                {result.brief.aboutTitle}
              </Text>
            </View>
          </View>
        ) : previewView === "about" ? (
          <View style={page.previewContent}>
            <Text style={[page.previewKicker, { color }]}>GIỚI THIỆU</Text>
            <Text style={page.previewSectionTitle} numberOfLines={3}>
              {result.brief.aboutTitle}
            </Text>
            <Text style={page.previewAbout} numberOfLines={6}>
              {result.brief.aboutCopy}
            </Text>
            {result.brief.features.map((item) => (
              <View key={item.title} style={page.previewFeature}>
                <Feather name="check" size={14} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={page.previewFeatureTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={page.previewFeatureCopy} numberOfLines={1}>
                    {item.copy}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={page.previewContact}>
            <Text style={[page.previewKicker, { color }]}>BƯỚC TIẾP THEO</Text>
            <Text style={page.previewSectionTitle}>
              {result.brief.ctaLabel}
            </Text>
            <Text style={page.previewAbout}>
              Đây là bản xem trước. Bạn có thể bổ sung thông tin liên hệ và cách
              phục vụ chính thức trước khi xuất bản trang web.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPreviewView("home")}
              style={[page.previewButton, { backgroundColor: color }]}
            >
              <Text style={page.previewButtonText}>Quay lại trang đầu</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text style={page.notice}>{result.notice}</Text>
      <View style={page.delivery}>
        <Text style={page.deliveryTitle}>Đường dẫn và tệp trang web</Text>
        <Text style={page.deliveryLink} numberOfLines={2}>
          {result.project.url}
        </Text>
        <Button
          label="Mở trang web"
          variant="secondary"
          icon="external-link"
          onPress={() => void openProjectLink(result.project.url)}
        />
        <Button
          label="Tải mã nguồn ZIP"
          variant="secondary"
          icon="download"
          onPress={() => void openProjectLink(result.project.downloadUrl)}
        />
        <Text style={page.deliveryStatus}>{result.project.publishMessage}</Text>
        {result.project.repositoryUrl ? (
          <Text style={page.deliveryLink} selectable>
            Repo riêng: {result.project.repositoryUrl}
          </Text>
        ) : null}
      </View>
      <Eyebrow>Hosting phù hợp</Eyebrow>
      <Title style={page.resultTitle}>Nơi đặt trang web của bạn</Title>
      {result.recommendations.map((item, index) => (
        <View key={item.id} style={[page.plan, index === 0 && page.planBest]}>
          <View style={page.planTop}>
            <Text style={page.planLabel}>
              {item.eligibility === "eligible" ? index === 0 ? "ƯU TIÊN THEO NGÂN SÁCH LƯU TRỮ" : `PHƯƠNG ÁN ${index + 1}` : "CHỈ ĐỂ THAM KHẢO"}
            </Text>
            <Text style={page.planScore}>{item.score}/100</Text>
          </View>
          <Text style={page.planProvider}>{item.provider}</Text>
          <Text style={page.planName}>{item.name}</Text>
          <Text style={page.planPrice}>
            {money(item.promoMonthlyVnd)}
            <Text style={page.planUnit}> / tháng</Text>
          </Text>
          <Text style={page.planFine}>
            Kỳ {item.billingMonths} tháng · Gia hạn{" "}
            {money(item.renewalMonthlyVnd)}
          </Text>
          <Text style={page.planFine}>Tiền lưu trữ kỳ đầu: {money(item.upfrontVnd).replace("/tháng", "")}. Chưa gồm thuế và tên miền.</Text>
          {item.reasons.map((reason) => (
            <Text key={reason} style={page.planReason}>
              + {reason}
            </Text>
          ))}
          <Button
            label="Đặt mua qua HOSTORA"
            variant="primary"
            icon="shopping-bag"
            onPress={() => router.push("/(tabs)/products?category=hosting")}
          />
        </View>
      ))}
      <View style={page.revision}>
        <Text style={page.deliveryTitle}>Muốn đổi gì trên trang web?</Text>
        <Text style={page.deliveryStatus}>
          Viết yêu cầu, HOSTORA cập nhật nội dung và giữ nguyên phần còn lại.
        </Text>
        <TextInput
          accessibilityLabel="Yêu cầu chỉnh sửa trang web"
          value={revision}
          onChangeText={setRevision}
          maxLength={500}
          multiline
          placeholder="Ví dụ: đổi tiêu đề ngắn hơn, giọng thân thiện hơn…"
          placeholderTextColor={colors.faint}
          style={[page.input, page.revisionInput]}
        />
        {revisionNotice ? (
          <Text style={page.deliveryStatus}>{revisionNotice}</Text>
        ) : null}
        <Button
          label={revisionBusy ? "Đang chỉnh…" : "Cập nhật trang web"}
          icon={revisionBusy ? "loader" : "send"}
          disabled={revisionBusy || revision.trim().length < 3}
          onPress={() => void revise()}
        />
      </View>
    </View>
  );
}

function Question({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <ScrollReveal style={page.question}>
      <Text style={page.questionNumber}>{number}</Text>
      <View style={{ flex: 1 }}>
        <Text style={page.questionTitle}>{title}</Text>
        <Text style={page.questionCopy}>{copy}</Text>
      </View>
    </ScrollReveal>
  );
}
function Field({
  label,
  multiline = false,
  maxLength,
  ...props
}: {
  label: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <View style={page.field}>
      <Text style={page.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        maxLength={maxLength ?? (multiline ? 1000 : 160)}
        placeholderTextColor={colors.faint}
        style={[page.input, multiline && page.textarea]}
      />
    </View>
  );
}
function ChoiceGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [Value, string])[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <View style={page.field}>
      <Text style={page.label}>{label}</Text>
      <View style={page.choices}>
        {options.map(([option, title]) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option }}
            onPress={() => onChange(option)}
            style={[page.choice, value === option && page.choiceActive]}
          >
            <Text
              style={[
                page.choiceText,
                value === option && page.choiceTextActive,
              ]}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const page = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    backgroundColor: colors.ink,
    padding: 24,
    borderRadius: 24,
    overflow: "hidden",
  },
  heroOrbit: {
    position: "absolute",
    right: -78,
    top: -58,
    width: 218,
    height: 218,
    borderRadius: 109,
    borderWidth: 1,
    borderColor: "#A6EBD166",
    justifyContent: "center",
    alignItems: "center",
  },
  heroOrbitInner: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1,
    borderColor: "#A6EBD13D",
    transform: [{ scaleX: 0.65 }],
  },
  heroTitle: { marginTop: 9, fontSize: 31, lineHeight: 37 },
  heroAccent: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_400Regular",
    fontStyle: "italic",
  },
  heroCopy: { marginTop: 13, fontSize: 12, lineHeight: 20 },
  form: { padding: 20, gap: 14 },
  question: { flexDirection: "row", gap: 11, marginTop: 17, marginBottom: 2 },
  questionNumber: {
    width: 30,
    height: 30,
    textAlign: "center",
    textAlignVertical: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  questionTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
  },
  questionCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  field: { gap: 7 },
  label: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
  },
  textarea: { minHeight: 105, paddingTop: 12, textAlignVertical: "top" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    minHeight: 43,
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  choiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  choiceText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  choiceTextActive: { color: "white" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  fieldHint: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  check: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 13,
  },
  checkActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  checkText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 11,
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 11,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 11,
  },
  privacy: {
    color: colors.faint,
    textAlign: "center",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
  },
  results: { paddingHorizontal: 20, gap: 16, paddingBottom: 24 },
  delivery: {
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  deliveryTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
  },
  deliveryLink: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 12,
    lineHeight: 19,
  },
  deliveryStatus: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  revision: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  revisionInput: { minHeight: 88, textAlignVertical: "top" },
  preview: {
    borderWidth: 10,
    borderColor: colors.ink,
    backgroundColor: "#FFF8EF",
    padding: 18,
    height: 560,
    overflow: "hidden",
  },
  previewTabs: { flexDirection: "row", gap: 3, marginTop: 16 },
  previewTab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C8D6CF",
  },
  previewTabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  previewTabText: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  previewTabTextActive: { color: "#FFFFFF" },
  previewContent: { flex: 1 },
  previewContact: { flex: 1, justifyContent: "center" },
  previewSectionTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 25,
    lineHeight: 31,
    marginTop: 12,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E1D8CC",
    paddingBottom: 13,
  },
  previewBrand: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 12,
    letterSpacing: 1,
  },
  previewNav: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 7,
  },
  previewKicker: {
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 22,
  },
  previewTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -1.2,
    marginTop: 10,
  },
  previewCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
  },
  previewButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 14,
  },
  previewButtonText: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  previewVisual: {
    minHeight: 102,
    justifyContent: "flex-end",
    padding: 19,
    marginTop: 16,
  },
  previewVisualText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 20,
  },
  previewAbout: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    marginTop: 12,
  },
  previewFeature: {
    flexDirection: "row",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "#E1D8CC",
    paddingTop: 8,
    marginTop: 8,
  },
  previewFeatureTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  previewFeatureCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 8.5,
    lineHeight: 13,
    marginTop: 2,
  },
  notice: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
  },
  resultTitle: { fontSize: 28, lineHeight: 34 },
  plan: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 8,
  },
  planBest: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  planTop: { flexDirection: "row", justifyContent: "space-between" },
  planLabel: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  planScore: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
  },
  planProvider: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    textTransform: "uppercase",
    marginTop: 10,
  },
  planName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 19,
  },
  planPrice: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 22,
  },
  planUnit: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
  },
  planFine: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  planReason: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
});
