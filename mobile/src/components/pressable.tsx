import * as Haptics from "expo-haptics";
import { Platform, Pressable as NativePressable, type PressableProps, StyleSheet } from "react-native";
import { useMotionPreference } from "./motion";

/** Shared tap target: native layout, visual press feedback and a quiet haptic cue. */
export function Pressable({ style, disabled, onPress, ...props }: PressableProps) {
  const reduced = useMotionPreference();
  return (
    <NativePressable
      {...props}
      disabled={disabled}
      onPress={(event) => {
        if (!reduced && Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed && !disabled && !reduced && styles.pressed,
        disabled && styles.disabled,
      ]}
    />
  );
}
const styles = StyleSheet.create({
  pressed: { opacity: 0.86, transform: [{ scale: 0.975 }] },
  disabled: { opacity: 0.45 },
});
