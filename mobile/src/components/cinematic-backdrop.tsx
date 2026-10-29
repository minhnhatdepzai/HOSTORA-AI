import { useCallback, useContext, useEffect, useState } from "react";
import { Animated, AppState, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Canvas, Fill, Shader, Skia, useClock } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { ScrollMotionContext, useMotionPreference } from "./motion";

// Original HOSTORA scene: a softly lit orbital lens in the brand's mint/navy.
const lens = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;
half4 main(float2 pixel) {
  float2 uv = pixel / resolution;
  float2 p = (pixel - float2(resolution.x * .5, 88.0)) / resolution.x;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float breathe = sin(time * .65) * .008;
  float wave = sin(angle * 3.0 + time * .4) * .008;
  float halo = exp(-r * r * 17.0);
  float ring = exp(-abs(r - .205 - breathe - wave) * 360.0);
  float rim = exp(-abs(r - .27 - breathe) * 520.0) * .2;
  float sweep = pow(max(0.0, cos(angle - time * .3)), 5.0);
  float3 base = mix(float3(.027,.094,.153), float3(.035,.16,.18), halo * .8);
  float3 mint = float3(.54,.94,.77);
  float fade = 1.0 - smoothstep(.3, .72, uv.y);
  float3 light = mint * (halo * .12 + ring * (.23 + sweep * .6) + rim) * fade;
  return half4(base + light, 1.0);
}`);

function LiveLens({ width, height }: { width: number; height: number }) {
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({ resolution: [width, height], time: clock.value / 1000 }));
  if (!lens) return null;
  return <Canvas style={StyleSheet.absoluteFill}><Fill><Shader source={lens} uniforms={uniforms} /></Fill></Canvas>;
}

export function CinematicBackdrop() {
  const reduced = useMotionPreference();
  const { scrollY } = useContext(ScrollMotionContext);
  const drift = scrollY?.interpolate({
    inputRange: [0, 720],
    outputRange: [0, 104],
    extrapolate: "clamp",
  });
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [size, setSize] = useState({ width: 360, height: 480 });
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return (
    <Animated.View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.stage, !reduced && drift ? { transform: [{ translateY: drift }] } : null]} onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}>
      {focused && active && !reduced && <LiveLens {...size} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ stage: { position: "absolute", left: 0, right: 0, top: 0, height: 300, overflow: "hidden", backgroundColor: "#071827" } });
