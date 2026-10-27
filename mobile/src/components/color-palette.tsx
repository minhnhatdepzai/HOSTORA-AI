import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "@/constants/theme";

type HSV = { h: number; s: number; v: number };
const hueStops = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"] as const;
const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

function hexToHsv(hex: string): HSV {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  return { h: (h + 360) % 360, s: max ? delta / max : 0, v: max };
}

function hsvToHex({ h, s, v }: HSV) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const segments = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${segments.map((part) => Math.round((part + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function ColorPalette({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [paletteSize, setPaletteSize] = useState({ width: 1, height: 1 });
  const [hueWidth, setHueWidth] = useState(1);
  const selectedColor = isHex(value) ? value : "#11695e";
  const hsv = useMemo(() => hexToHsv(selectedColor), [selectedColor]);

  const updateSaturationValue = (x: number, y: number) => {
    const next = {
      ...hsv,
      s: Math.min(1, Math.max(0, x / paletteSize.width)),
      v: 1 - Math.min(1, Math.max(0, y / paletteSize.height)),
    };
    onChange(hsvToHex(next));
  };
  const updateHue = (x: number) => {
    const next = { ...hsv, h: Math.min(1, Math.max(0, x / hueWidth)) * 360 };
    onChange(hsvToHex(next));
  };

  const paletteResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => updateSaturationValue(event.nativeEvent.locationX, event.nativeEvent.locationY),
    onPanResponderMove: (event) => updateSaturationValue(event.nativeEvent.locationX, event.nativeEvent.locationY),
  // The callbacks intentionally read the latest color and measured canvas size.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [hsv, paletteSize]);
  const hueResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => updateHue(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateHue(event.nativeEvent.locationX),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [hsv, hueWidth]);

  return (
    <>
      <View style={styles.field}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở bảng mã màu"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.colorButton, pressed && styles.pressed]}
        >
          <View style={[styles.swatch, { backgroundColor: selectedColor }]}>
            <Feather name="sliders" size={15} color={hsv.v < 0.55 ? "white" : colors.ink} />
          </View>
          <Text style={styles.openLabel}>Mở bảng màu</Text>
          <Feather name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <TextInput
          accessibilityLabel="Mã màu HEX tùy chỉnh"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          value={value}
          onChangeText={onChange}
          placeholder="#11695E"
          placeholderTextColor={colors.faint}
          style={styles.hexInput}
        />
      </View>
      {!isHex(value) ? <Text style={styles.hint}>Nhập mã gồm # và 6 ký tự, ví dụ #11695E.</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>TÙY CHỈNH THƯƠNG HIỆU</Text>
                <Text style={styles.modalTitle}>Chọn màu của bạn</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng bảng màu" onPress={() => setOpen(false)} style={styles.close}>
                <Feather name="x" size={19} color={colors.ink} />
              </Pressable>
            </View>

            <View
              onLayout={(event) => setPaletteSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
              {...paletteResponder.panHandlers}
              style={[styles.palette, { backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }]}
              accessibilityLabel="Vùng chọn độ bão hòa và độ sáng"
            >
              <LinearGradient colors={["#fff", "#ffffff00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={["#00000000", "#000"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[styles.marker, { left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }]} />
            </View>

            <Text style={styles.hueLabel}>Sắc độ</Text>
            <View onLayout={(event) => setHueWidth(event.nativeEvent.layout.width)} {...hueResponder.panHandlers} style={styles.hueRail}>
              <LinearGradient colors={[...hueStops]} locations={[0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[styles.hueMarker, { left: `${(hsv.h / 360) * 100}%` }]} />
            </View>

            <View style={styles.modalFooter}>
              <View style={[styles.preview, { backgroundColor: selectedColor }]} />
              <TextInput accessibilityLabel="Mã HEX trong bảng màu" autoCapitalize="characters" maxLength={7} value={value} onChangeText={onChange} style={styles.modalHex} />
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.done}>
                <Text style={styles.doneText}>Dùng màu này</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 52, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 5, gap: 8 },
  colorButton: { minHeight: 40, flex: 1, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 6 },
  swatch: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#102c3830" },
  openLabel: { flex: 1, color: colors.text, fontFamily: "BeVietnamPro_700Bold", fontSize: 10 },
  hexInput: { width: 94, minHeight: 40, borderLeftWidth: 1, borderColor: colors.line, paddingHorizontal: 10, color: colors.text, fontFamily: "BeVietnamPro_700Bold", fontSize: 11 },
  pressed: { opacity: 0.72 },
  hint: { color: colors.faint, fontFamily: "BeVietnamPro_400Regular", fontSize: 9, lineHeight: 15 },
  scrim: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#071827aa" },
  modal: { width: "100%", maxWidth: 480, alignSelf: "center", borderRadius: 22, backgroundColor: colors.surface, padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  modalEyebrow: { color: colors.primary, fontFamily: "BeVietnamPro_700Bold", fontSize: 8, letterSpacing: 1.1 },
  modalTitle: { marginTop: 4, color: colors.ink, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 19 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  palette: { height: 230, overflow: "hidden", borderRadius: 8 },
  marker: { position: "absolute", width: 20, height: 20, marginLeft: -10, marginTop: -10, borderRadius: 10, borderWidth: 3, borderColor: "white", backgroundColor: "transparent", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 3, elevation: 2 },
  hueLabel: { color: colors.muted, fontFamily: "BeVietnamPro_700Bold", fontSize: 9 },
  hueRail: { height: 24, overflow: "visible", borderRadius: 12 },
  hueMarker: { position: "absolute", top: -3, width: 10, height: 30, marginLeft: -5, borderWidth: 2, borderColor: "white", borderRadius: 6, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 2, elevation: 2 },
  modalFooter: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 4 },
  preview: { width: 38, height: 42, borderWidth: 1, borderColor: colors.line },
  modalHex: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, color: colors.ink, fontFamily: "BeVietnamPro_700Bold", fontSize: 12 },
  done: { minHeight: 44, justifyContent: "center", paddingHorizontal: 13, backgroundColor: colors.primary },
  doneText: { color: "white", fontFamily: "BeVietnamPro_700Bold", fontSize: 10 },
});
