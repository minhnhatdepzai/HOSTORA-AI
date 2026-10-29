import { useEffect, useRef, useState, useContext } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { useIsFocused } from "expo-router";
import { ScrollMotionContext, useMotionPreference } from "./motion";
import scene from "../../assets/brand-scene.json";

/** Bundled offline artwork. No navigation, remote images, or customer data in this WebView. */
export function BrandStage() {
  const ref = useRef<WebView<object>>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const focused = useIsFocused();
  const reduced = useMotionPreference();
  const { scrollY } = useContext(ScrollMotionContext);
  const shown = useRef(true);
  useEffect(() => {
    const update = () =>
      ref.current?.postMessage(
        JSON.stringify({
          type: "activity",
          active:
            focused &&
            shown.current &&
            AppState.currentState === "active" &&
            !reduced,
        }),
      );
    update();
    const subscription = AppState.addEventListener("change", update);
    const id = scrollY?.addListener(({ value }) => {
      const visible = value < 600;
      if (visible !== shown.current) {
        shown.current = visible;
        update();
      }
    });
  return () => {
      subscription.remove();
      if (id) scrollY?.removeListener(id);
    };
  }, [focused, reduced, ready, scrollY]);
  useEffect(() => {
    if (ready || reduced || failed) return;
    const timeout = setTimeout(() => setFailed(true), 8000);
    return () => clearTimeout(timeout);
  }, [ready, reduced, failed]);
  return (
    <View style={styles.stage}>
      <Image
        source={require("../../assets/images/hostora-stage.png")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Linh vật robot bên chữ HOSTORA 3D"
      />
      {!reduced && !failed && (
        <WebView<object>
          ref={ref}
          source={{ html: scene.html }}
          style={[styles.web, !ready && styles.hidden]}
          originWhitelist={["about:blank"]}
          onShouldStartLoadWithRequest={(r) => r.url === "about:blank"}
          javaScriptEnabled
          domStorageEnabled={false}
          scrollEnabled={false}
          bounces={false}
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          onError={() => setFailed(true)}
          onContentProcessDidTerminate={() => setFailed(true)}
          onMessage={(event) => {
            try {
              if (JSON.parse(event.nativeEvent.data).type === "ready")
                setReady(true);
            } catch {}
          }}
          accessibilityLabel="Sân khấu HOSTORA 3D, vuốt ngang để xoay"
        />
      )}
      <View pointerEvents="none" style={styles.label}>
        <Text style={styles.labelText}>H / MỘT KHỞI ĐẦU</Text>
        <Text style={styles.labelText}>HOSTORA</Text>
      </View>
      <Text pointerEvents="none" style={styles.hint}>
        {reduced || failed
          ? "MỘT THẾ GIỚI CỦA RIÊNG BẠN"
          : "KÉO NGANG ĐỂ KHÁM PHÁ"}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  stage: {
    height: 260,
    backgroundColor: "#080d10",
    overflow: "hidden",
    marginHorizontal: -24,
    marginBottom: 20,
  },
  web: { flex: 1, backgroundColor: "#080d10" },
  hidden: { opacity: 0 },
  label: {
    position: "absolute",
    top: 20,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelText: {
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#94aaa0",
  },
  hint: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    fontSize: 8,
    letterSpacing: 1.4,
    color: "#9bb7a7",
  },
});
