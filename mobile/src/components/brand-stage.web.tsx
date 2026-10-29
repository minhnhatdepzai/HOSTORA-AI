import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useMotionPreference } from "./motion";
import scene from "../../assets/brand-scene.json";
export function BrandStage() {
  const reduced = useMotionPreference();
  return (
    <View style={styles.stage}>
      {reduced ? (
        <Image
          source={require("../../assets/images/hostora-stage.png")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <iframe
          title="Sân khấu HOSTORA 3D"
          srcDoc={scene.html}
          sandbox="allow-scripts"
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  stage: {
    height: 260,
    marginHorizontal: -24,
    marginBottom: 20,
    backgroundColor: "#080d10",
    overflow: "hidden",
  },
});
