import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useMotionPreference } from "./motion";

export function BrandOrbit() {
  const reduced = useMotionPreference();
  const float = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!reduced) {
      float.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
      spin.set(withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false));
    }
    return () => { cancelAnimation(float); cancelAnimation(spin); };
  }, [float, reduced, spin]);
  const movement = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() * -7 }, { rotate: `${float.get() * 3 - 1.5}deg` }] }));
  const orbitMovement = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const counterOrbitMovement = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.get() * .65}deg` }] }));
  return <View style={styles.stage} accessible={false} importantForAccessibility="no-hide-descendants">
    <Animated.View style={[styles.orbit, orbitMovement]}><View style={styles.orbitPoint} /></Animated.View>
    <Animated.View style={[styles.counterOrbit, counterOrbitMovement]}><View style={styles.counterPoint} /></Animated.View>
    <Animated.View style={[styles.logo, movement]}>
      <Image source={require("../../assets/images/hostora-icon-source.png")} style={styles.image} contentFit="cover" />
    </Animated.View>
    <View style={styles.star} /><View style={[styles.star, styles.secondStar]} />
  </View>;
}
const styles = StyleSheet.create({
  stage: { height: 142, alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: "#B5EFD244" },
  orbitPoint: { position: "absolute", top: 15, right: 15, width: 7, height: 7, borderRadius: 4, backgroundColor: "#B5EFD2", shadowColor: "#B5EFD2", shadowOpacity: .9, shadowRadius: 8 },
  counterOrbit: { position: "absolute", width: 102, height: 102, borderRadius: 51, borderWidth: 1, borderStyle: "dashed", borderColor: "#B5EFD21F" },
  counterPoint: { position: "absolute", left: 10, bottom: 14, width: 4, height: 4, borderRadius: 2, backgroundColor: "#9BDFC3", opacity: .8 },
  logo: { width: 76, height: 76, borderRadius: 23, borderColor: "#B5EFD255", borderWidth: 1, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  star: { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: "#B5EFD2", top: 32, right: "23%" },
  secondStar: { width: 3, height: 3, top: 112, left: "24%", opacity: .5 },
});
