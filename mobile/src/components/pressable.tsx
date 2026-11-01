import * as Haptics from "expo-haptics";
import {
  Platform,
  Pressable as NativePressable,
  type PressableProps,
  StyleSheet,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMotionPreference } from "./motion";
import { getMotionProfile } from "@/lib/motion-spec";

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

/** Shared tap target: native layout, visual press feedback and a quiet haptic cue. */
export function Pressable({
  style,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const reduced = useMotionPreference();
  const profile = getMotionProfile(reduced);
  const pressed = useSharedValue(0);
  const feedbackStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.1,
    transform: [{ scale: 1 - pressed.value * (1 - profile.pressScale) }],
  }));
  const baseStyle =
    typeof style === "function"
      ? style({ pressed: false, hovered: false })
      : style;
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.value = withTiming(1, {
          duration: profile.pressInMs,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withTiming(0, {
          duration: profile.pressOutMs,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        });
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (!reduced && Platform.OS !== "web")
          void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      style={[baseStyle, feedbackStyle, disabled && styles.disabled]}
    />
  );
}
const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});
