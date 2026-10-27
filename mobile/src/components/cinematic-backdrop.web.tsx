import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

// The browser preview uses the same palette without shipping CanvasKit/WASM.
export function CinematicBackdrop() {
  return <View pointerEvents="none" accessible={false} style={styles.stage}>
    <LinearGradient colors={["#123C42", "#071827", "#071827"]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", width: 180, height: 180, top: 0, alignSelf: "center", borderRadius: 90, borderWidth: 1, borderColor: "#B5EFD250" }} />
  </View>;
}

const styles = StyleSheet.create({ stage: { position: "absolute", left: 0, right: 0, top: 0, height: 300, overflow: "hidden" } });
