import { Image } from "expo-image";
import { useEffect, useMemo } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useMotionPreference } from "./motion";

export function BrandOrbit() {
  const reduced = useMotionPreference();
  const float = useSharedValue(0);
  const spin = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const responder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !reduced,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !reduced && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        dragX.set(Math.max(-26, Math.min(26, gesture.dy * -0.28)));
        dragY.set(Math.max(-34, Math.min(34, gesture.dx * 0.34)));
      },
      onPanResponderRelease: () => {
        dragX.set(withSpring(0, { damping: 12, stiffness: 110 }));
        dragY.set(withSpring(0, { damping: 12, stiffness: 110 }));
      },
      onPanResponderTerminate: () => {
        dragX.set(withSpring(0));
        dragY.set(withSpring(0));
      },
    }), [reduced, dragX, dragY]);
  useEffect(() => {
    if (!reduced) {
      float.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
      spin.set(withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false));
    }
    return () => { cancelAnimation(float); cancelAnimation(spin); };
  }, [float, reduced, spin]);
  const movement = useAnimatedStyle(() => ({ transform: [{ perspective: 520 }, { translateY: float.get() * -7 }, { rotateX: `${dragX.get()}deg` }, { rotateY: `${dragY.get()}deg` }, { rotate: `${float.get() * 3 - 1.5}deg` }] }));
  const orbitMovement = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const counterOrbitMovement = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.get() * .65}deg` }] }));
  return <View
    style={styles.stage}
    accessible
    accessibilityRole="image"
    accessibilityLabel="Biểu tượng HOSTORA ba chiều, có thể kéo để xoay"
    {...responder.panHandlers}
  >
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
