import { DetailHeader } from "@/components/detail-header";
import { Button, CinematicScrollView } from "@/components/ui";
import { colors } from "@/constants/theme";
import { ApiError, getApiBase, postJson } from "@/lib/api";
import { createAppNotification } from "@/lib/app-notifications";
import { useApp } from "@/context/app-context";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Invoice = {
  id: string; title: string; description: string; amountVnd: number; saleType: "hostora_service" | "partner_service";
  partnerProvider: string | null; status: "pending" | "cancel_requested" | "paid" | "refund_requested" | "refund_pending" | "refunded" | "cancelled";
  provider: "stripe" | "vnpay" | "demo" | null;
  subtotalVnd: number; discountVnd: number; voucherCode: string | null;
  earnedVoucherCode: string | null; earnedVoucherAmountVnd: number | null; earnedVoucherExpiresAt: string | null;
};
type SaleRequest = { id: string; productName: string; provider: string; status: "new" | "invoiced" | "declined" | "cancelled"; profile: { customerName: string; companyName: string; websiteGoal: string }; consultationPreference: "scheduled" | "ai"; consultationAt: string | null };
type Detail = { invoice: Invoice; events: { id: string; detail: string; createdAt: string }[]; gateways: { stripe: boolean; vnpay: boolean; mode: "demo" | "sandbox" } };
const status: Record<Invoice["status"], string> = {
  pending: "Chờ thanh toán", cancel_requested: "Đang kiểm tra yêu cầu hủy", paid: "Đã thanh toán",
  refund_requested: "Chờ duyệt hoàn tiền", refund_pending: "Đang hoàn tiền", refunded: "Đã hoàn tiền", cancelled: "Đã hủy",
};

export default function OrdersScreen() {
  const { pushNotification } = useApp();
  const params = useLocalSearchParams<{ requestId?: string; requestCode?: string }>();
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saleRequest, setSaleRequest] = useState<SaleRequest | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const activeOrder = useRef<{ id: string; code: string } | null>(null);
  const knownStatuses = useRef<Record<string, Invoice["status"]>>({});

  const applyOrderDetail = useCallback((result: Detail) => {
    const previousStatus = knownStatuses.current[result.invoice.id];
    knownStatuses.current[result.invoice.id] = result.invoice.status;
    if (previousStatus && previousStatus !== result.invoice.status) {
      const kind = result.invoice.status === "paid" ? "payment" : result.invoice.status.includes("refund") ? "refund" : "order";
      pushNotification(createAppNotification({
        id: `invoice-${result.invoice.id}-${result.invoice.status}`,
        kind,
        title: status[result.invoice.status],
        message: `${result.invoice.title} vừa chuyển sang trạng thái “${status[result.invoice.status]}”.`,
        route: "/orders",
      }));
      if (result.invoice.earnedVoucherCode) {
        pushNotification(createAppNotification({
          id: `voucher-${result.invoice.earnedVoucherCode}`,
          kind: "voucher",
          title: "Bạn có voucher mới",
          message: `Mã ${result.invoice.earnedVoucherCode} đã sẵn sàng cho đơn tiếp theo.`,
          route: "/orders",
        }));
      }
    }
    setDetail(result);
  }, [pushNotification]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const saved = activeOrder.current;
      if (state !== "active" || !saved) return;
      void postJson<Detail>("/api/payments/orders", { id: saved.id, accessCode: saved.code })
        .then(applyOrderDetail).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [applyOrderDetail]);

  useEffect(() => {
    if (!params.requestId || !params.requestCode) return;
    void postJson<{ request: SaleRequest }>("/api/payments/requests/lookup", { id: params.requestId, accessCode: params.requestCode })
      .then((result) => setSaleRequest(result.request))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Không thể mở yêu cầu mua."));
  }, [params.requestCode, params.requestId]);

  async function cancelSaleRequest() {
    if (!saleRequest || !params.requestCode) return;
    setBusy(true); setMessage("");
    try {
      const result = await postJson<{ request: SaleRequest }>(`/api/payments/requests/${saleRequest.id}/cancel`, { accessCode: params.requestCode, reason: requestReason });
      setSaleRequest(result.request); setRequestReason(""); setMessage("Đã hủy yêu cầu và gửi email xác nhận.");
      pushNotification(createAppNotification({ id: `request-${result.request.id}-cancelled`, kind: "order", title: "Yêu cầu mua đã hủy", message: `${result.request.productName} đã được hủy và không phát hành hóa đơn.`, route: "/orders" }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể hủy yêu cầu."); }
    finally { setBusy(false); }
  }

  const lookup = useCallback(async (quiet = false) => {
    if (!id.trim() || !code.trim()) return;
    if (!quiet) setBusy(true);
    try {
      const result = await postJson<Detail>("/api/payments/orders", { id: id.trim().toUpperCase(), accessCode: code });
      applyOrderDetail(result); activeOrder.current = { id: id.trim().toUpperCase(), code }; if (!quiet) setMessage("");
    } catch (error) { if (!quiet) { setDetail(null); setMessage(error instanceof Error ? error.message : "Không thể xem đơn hàng."); } }
    finally { if (!quiet) setBusy(false); }
  }, [applyOrderDetail, id, code]);

  async function mutate(path: string, body: object) {
    if (!detail) return;
    setBusy(true); setMessage("");
    try {
      const result = await postJson<{ url?: string; mode?: "demo" | "sandbox" }>(`/api/payments/orders/${detail.invoice.id}/${path}`, { accessCode: code, ...body });
      if (result.url) {
        const apiBase = await getApiBase();
        const url = new URL(result.url, `${apiBase.replace(/\/$/, "")}/`);
        const apiOrigin = new URL(apiBase).origin;
        const isHostedGateway = url.protocol === "https:" && ["checkout.stripe.com", "sandbox.vnpayment.vn"].includes(url.hostname);
        const isHostoraDemo = result.mode === "demo" && url.origin === apiOrigin && url.pathname === "/payments/demo";
        if (!isHostedGateway && !isHostoraDemo) throw new Error("Địa chỉ thanh toán không hợp lệ.");
        await Linking.openURL(url.toString());
      } else { setReason(""); await lookup(true); setMessage("HOSTORA đã ghi nhận yêu cầu của bạn."); }
    } catch (error) {
      if (path === "refund-request" && error instanceof ApiError && error.status === 401) {
        Alert.alert("Cần đăng nhập", "Đăng nhập bằng email nhận hóa đơn để xác minh quyền yêu cầu hoàn tiền.", [{ text: "Để sau", style: "cancel" }, { text: "Đăng nhập", onPress: () => router.push({ pathname: "/account-login", params: { next: "/orders" } }) }]);
      }
      setMessage(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.");
    }
    finally { setBusy(false); }
  }

  const invoice = detail?.invoice;
  return <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
    <DetailHeader title="Đơn hàng của bạn" />
    <CinematicScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.intro}><Text style={[styles.eyebrow, styles.introEyebrow]}>THEO DÕI & THANH TOÁN</Text><Text style={styles.title}>Mọi khoản tiền, rõ từng bước.</Text><Text style={[styles.copy, styles.introCopy]}>Nhập mã riêng trên hóa đơn để xem trạng thái và yêu cầu hỗ trợ.</Text></View>
      <View style={styles.lookup}><Text style={styles.label}>Mã đơn hàng</Text><TextInput accessibilityLabel="Mã đơn hàng" style={styles.input} placeholder="HST-..." placeholderTextColor={colors.muted} autoCapitalize="characters" value={id} onChangeText={setId} /><Text style={styles.label}>Mã truy cập riêng</Text><TextInput accessibilityLabel="Mã truy cập riêng" style={styles.input} placeholder="Mã được gửi cùng hóa đơn" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" value={code} onChangeText={setCode} /><Button label={busy ? "Đang kiểm tra" : "Xem đơn hàng"} disabled={busy || !id.trim() || !code.trim()} onPress={() => void lookup()} /></View>
      {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} />}
      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      {saleRequest ? <View style={styles.detail}><Text style={styles.eyebrow}>YÊU CẦU {saleRequest.id}</Text><Text style={styles.service}>{saleRequest.productName}</Text><Text style={styles.provider}>{saleRequest.provider} · {saleRequest.profile.companyName || saleRequest.profile.customerName}</Text><Text style={styles.status}>{saleRequest.status === "new" ? "Đang chờ báo giá" : saleRequest.status === "cancelled" ? "Đã hủy" : saleRequest.status === "invoiced" ? "Đã tạo hóa đơn" : "Đã từ chối"}</Text><View style={styles.section}><Text style={styles.sectionTitle}>Mục tiêu website</Text><Text style={styles.copy}>{saleRequest.profile.websiteGoal}</Text><Text style={styles.sectionTitle}>Cách tư vấn</Text><Text style={styles.copy}>{saleRequest.consultationPreference === "ai" ? "AI HOSTORA tư vấn" : saleRequest.consultationAt ? new Date(saleRequest.consultationAt).toLocaleString("vi-VN") : "Chờ xác nhận lịch"}</Text></View>{saleRequest.status === "new" ? <View style={styles.section}><Text style={styles.sectionTitle}>Hủy yêu cầu mua</Text><TextInput accessibilityLabel="Lý do hủy yêu cầu mua" multiline style={[styles.input, styles.reason]} value={requestReason} onChangeText={setRequestReason} maxLength={500} placeholder="Nhập lý do hủy" placeholderTextColor={colors.muted} /><Button label="Hủy yêu cầu" variant="secondary" icon="x-circle" disabled={busy || requestReason.trim().length < 5} onPress={() => Alert.alert("Hủy yêu cầu mua?", "HOSTORA sẽ không tạo hóa đơn từ yêu cầu này.", [{ text: "Giữ lại", style: "cancel" }, { text: "Hủy yêu cầu", style: "destructive", onPress: () => void cancelSaleRequest() }])} /></View> : null}</View> : null}
      {invoice ? <View style={styles.detail}><Text style={styles.eyebrow}>HÓA ĐƠN {invoice.id}</Text><Text style={styles.service}>{invoice.title}</Text><Text style={styles.provider}>{invoice.saleType === "partner_service" ? `Dịch vụ đối tác · ${invoice.partnerProvider}` : "Dịch vụ HOSTORA"}</Text>{invoice.description ? <Text style={styles.copy}>{invoice.description}</Text> : null}<Text style={styles.status}>{invoice.provider === "demo" && invoice.status === "paid" ? "Đã ghi nhận thanh toán" : invoice.provider === "demo" && invoice.status === "refunded" ? "Đã ghi nhận hoàn tiền" : status[invoice.status]}</Text><View style={styles.total}><Text style={styles.totalLabel}>Tổng tiền đã thỏa thuận</Text><Text style={styles.amount}>{new Intl.NumberFormat("vi-VN").format(invoice.amountVnd)} ₫</Text></View>
        {invoice.discountVnd > 0 ? <Text style={styles.notice}>Voucher {invoice.voucherCode}: giảm {new Intl.NumberFormat("vi-VN").format(invoice.discountVnd)}đ từ giá {new Intl.NumberFormat("vi-VN").format(invoice.subtotalVnd)}đ.</Text> : null}
        {invoice.earnedVoucherCode ? <View style={styles.voucher}><Text style={styles.sectionTitle}>Voucher cho lần mua tiếp theo</Text><Text style={styles.voucherCode}>{invoice.earnedVoucherCode}</Text><Text style={styles.copy}>Giảm {new Intl.NumberFormat("vi-VN").format(invoice.earnedVoucherAmountVnd ?? 0)}đ cho đơn từ 1 triệu.</Text></View> : null}
        {invoice.status === "paid" ? <View style={styles.section}><Text style={styles.sectionTitle}>Bước tiếp theo cho website</Text><Text style={styles.copy}>Xem checklist ra mắt và kiểm tra các nút, nội dung trước khi gửi đường dẫn cho khách.</Text><Button label="Mở checklist ra mắt" variant="secondary" icon="book-open" onPress={() => router.push("/journal?slug=dua-website-len-mang" as Href)} /></View> : null}
        {invoice.status === "pending" ? <View style={styles.section}><Text style={styles.sectionTitle}>Thanh toán</Text><Text style={styles.copy}>{detail?.gateways.mode === "demo" ? "Ở bước kế tiếp, Stripe yêu cầu nhập thông tin thẻ thử nghiệm; VNPay yêu cầu chọn ngân hàng và nhập OTP thử nghiệm. Tuyệt đối không dùng thông tin thật." : "Sau khi trở lại ứng dụng, bấm Tải lại để kiểm tra kết quả từ cổng."}</Text><Button label="Tải lại trạng thái" variant="secondary" icon="refresh-cw" onPress={() => void lookup()} disabled={busy} />{detail?.gateways.stripe && (!invoice.provider || invoice.provider === "stripe") ? <Button label="Thanh toán với Stripe" onPress={() => void mutate("checkout", { provider: "stripe" })} disabled={busy} /> : null}{detail?.gateways.vnpay && (!invoice.provider || invoice.provider === "vnpay") ? <Button label="Thanh toán với VNPay" onPress={() => void mutate("checkout", { provider: "vnpay" })} disabled={busy} /> : null}{detail?.gateways.mode === "demo" ? <Text style={styles.notice}>Môi trường kiểm thử: đơn, email và voucher được cập nhật nhưng không thu tiền thật.</Text> : !detail?.gateways.stripe && !detail?.gateways.vnpay ? <Text style={styles.notice}>Cổng thanh toán thử nghiệm chưa được cấu hình. Bạn chưa bị tính tiền.</Text> : null}</View> : null}
        {invoice.status === "pending" || invoice.status === "paid" ? <View style={styles.section}><Text style={styles.sectionTitle}>{invoice.status === "pending" ? "Hủy đơn" : "Yêu cầu hoàn tiền"}</Text><Text style={styles.copy}>Nêu lý do để HOSTORA kiểm tra và xử lý.</Text><TextInput accessibilityLabel="Lý do yêu cầu" multiline style={[styles.input, styles.reason]} value={reason} onChangeText={setReason} maxLength={500} placeholder="Nhập lý do của bạn" placeholderTextColor={colors.muted} /><Button label={invoice.status === "pending" ? "Gửi yêu cầu hủy" : "Gửi yêu cầu hoàn tiền"} variant="secondary" icon="rotate-ccw" disabled={busy || reason.trim().length < (invoice.status === "pending" ? 5 : 8)} onPress={() => Alert.alert("Xác nhận yêu cầu", "HOSTORA sẽ ghi nhận và xem xét yêu cầu này.", [{ text: "Để sau", style: "cancel" }, { text: "Gửi yêu cầu", onPress: () => void mutate(invoice.status === "pending" ? "cancel" : "refund-request", { reason }) }])} /></View> : null}
        <View style={styles.section}><Text style={styles.sectionTitle}>Lịch sử</Text>{detail?.events.map((event) => <View key={event.id} style={styles.event}><View style={styles.dot} /><View style={{ flex: 1 }}><Text style={styles.eventText}>{event.detail}</Text><Text style={styles.eventTime}>{new Date(event.createdAt).toLocaleString("vi-VN")}</Text></View></View>)}</View>
      </View> : !saleRequest ? <Text style={styles.help}>Giá dịch vụ đối tác trên danh mục chỉ để tham khảo. Hóa đơn HOSTORA ghi số tiền đã thỏa thuận riêng.</Text> : null}
    </CinematicScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { paddingHorizontal: 20, paddingBottom: 40, width: "100%", maxWidth: 680, alignSelf: "center", gap: 20 },
  intro: { backgroundColor: colors.ink, borderRadius: 22, padding: 23, gap: 8 }, eyebrow: { color: colors.primary, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 10, letterSpacing: 1.2 }, title: { color: "white", fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 23, lineHeight: 31 }, copy: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 12, lineHeight: 20 },
  introEyebrow: { color: colors.mint }, introCopy: { color: "#D0DDD9" },
  lookup: { gap: 9, backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 19 }, label: { color: colors.text, fontFamily: "BeVietnamPro_700Bold", fontSize: 12, marginTop: 5 }, input: { minHeight: 47, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, color: colors.text, fontFamily: "BeVietnamPro_500Medium", fontSize: 13, backgroundColor: "white" },
  message: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 10, padding: 12, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, lineHeight: 19 }, detail: { borderTopWidth: 2, borderColor: colors.primary, paddingTop: 18, gap: 8 }, service: { color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 22, lineHeight: 29 }, provider: { color: colors.muted, fontFamily: "BeVietnamPro_500Medium", fontSize: 12 }, status: { alignSelf: "flex-start", backgroundColor: colors.primarySoft, color: colors.primary, overflow: "hidden", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, fontFamily: "BeVietnamPro_700Bold", fontSize: 11, marginTop: 5 },
  voucher: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 13, padding: 14, marginTop: 10, gap: 5 }, voucherCode: { color: colors.primary, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 18, letterSpacing: 1 },
  total: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 16, marginTop: 13 }, totalLabel: { color: colors.muted, fontFamily: "BeVietnamPro_500Medium", fontSize: 11 }, amount: { color: colors.primary, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 27, marginTop: 4 }, section: { borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 18, gap: 10 }, sectionTitle: { color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 16 }, reason: { minHeight: 85, textAlignVertical: "top", paddingTop: 12 }, notice: { color: "#835B13", backgroundColor: "#FFF2D8", borderRadius: 9, padding: 11, fontFamily: "BeVietnamPro_500Medium", fontSize: 11, lineHeight: 18 }, event: { flexDirection: "row", gap: 10, paddingVertical: 8 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 }, eventText: { color: colors.text, fontFamily: "BeVietnamPro_600SemiBold", fontSize: 12, lineHeight: 18 }, eventTime: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 10, marginTop: 3 }, help: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 11, lineHeight: 18 },
});
