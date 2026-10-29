import { createContext, useContext, useState, type PropsWithChildren } from "react";
import {
  Animated as NativeAnimated,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type TextProps,
  type ViewStyle,
} from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

export const MotionContext = createContext(false);
export const useMotionPreference = () => useContext(MotionContext);
export const ScrollMotionContext = createContext<{
  scrollY: NativeAnimated.Value | null;
  viewportHeight: number;
  baseTop: number;
}>({ scrollY: null, viewportHeight: 0, baseTop: 0 });

export function ScrollParallax({
  children,
  style,
  distance = 72,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  distance?: number;
}>) {
  const reduced = useMotionPreference();
  const { scrollY } = useContext(ScrollMotionContext);
  const translateY = scrollY?.interpolate({
    inputRange: [0, 720],
    outputRange: [0, distance],
    extrapolate: "clamp",
  });
  return (
    <NativeAnimated.View
      pointerEvents="box-none"
      style={[
        style,
        !reduced && translateY ? { transform: [{ translateY }] } : null,
      ]}
    >
      {children}
    </NativeAnimated.View>
  );
}

export function ScrollRevealText({
  children,
  onLayout,
  style,
  ...props
}: TextProps) {
  const reduced = useMotionPreference();
  const parent = useContext(ScrollMotionContext);
  const [localTop, setLocalTop] = useState<number | null>(null);
  const top = parent.baseTop + (localTop ?? 0);
  const viewportHeight = Math.max(1, parent.viewportHeight);
  const start = top - viewportHeight * 0.88;
  const end = Math.max(start + 1, top - viewportHeight * 0.72);
  const opacity = parent.scrollY?.interpolate({
    inputRange: [start, end],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const translateY = parent.scrollY?.interpolate({
    inputRange: [start, end],
    outputRange: [12, 0],
    extrapolate: "clamp",
  });
  const handleLayout = (event: LayoutChangeEvent) => {
    setLocalTop(event.nativeEvent.layout.y);
    onLayout?.(event);
  };

  return (
    <NativeAnimated.Text
      {...props}
      onLayout={handleLayout}
      style={[
        style,
        !reduced && localTop !== null && opacity && translateY
          ? { opacity, transform: [{ translateY }] }
          : null,
      ]}
    >
      {children}
    </NativeAnimated.Text>
  );
}

export function Reveal({
  children,
  delay = 0,
  style,
}: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useMotionPreference();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View
      entering={FadeInDown.duration(480)
        .delay(delay)
        .reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Reveals a section as it enters the phone viewport using native scroll values. */
export function ScrollReveal({
  children,
  style,
  animate = true,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  animate?: boolean;
}>) {
  const reduced = useMotionPreference();
  const parent = useContext(ScrollMotionContext);
  const [localTop, setLocalTop] = useState<number | null>(null);
  const top = parent.baseTop + (localTop ?? 0);
  const viewportHeight = Math.max(1, parent.viewportHeight);
  const start = top - viewportHeight * 0.88;
  const end = Math.max(start + 1, top - viewportHeight * 0.72);
  const opacity = parent.scrollY?.interpolate({
    inputRange: [start, end],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const translateY = parent.scrollY?.interpolate({
    inputRange: [start, end],
    outputRange: [24, 0],
    extrapolate: "clamp",
  });
  const childMotion = {
    ...parent,
    baseTop: top,
  };

  return (
    <ScrollMotionContext.Provider value={childMotion}>
      <NativeAnimated.View
        onLayout={({ nativeEvent }) => setLocalTop(nativeEvent.layout.y)}
        style={[
          style,
          animate && !reduced && localTop !== null && opacity && translateY
            ? { opacity, transform: [{ translateY }] }
            : null,
        ]}
      >
        {children}
      </NativeAnimated.View>
    </ScrollMotionContext.Provider>
  );
}

type TextSegment = { text: string; style?: StyleProp<TextStyle> };

/** Word-by-word reveal keeps native text wrapping and screen-reader reading order. */
export function RevealWords({
  segments,
  style,
  delay = 0,
}: {
  segments: TextSegment[];
  style?: StyleProp<TextStyle>;
  delay?: number;
}) {
  const reduced = useMotionPreference();
  let wordIndex = 0;

  return (
    <Text
      accessibilityLabel={segments.map(({ text }) => text).join("")}
      style={style}
    >
      {segments.map((segment, segmentIndex) => (
        <Text key={segmentIndex} style={segment.style}>
          {segment.text.split(/(\s+)/).map((part, partIndex) => {
            if (/^\s+$/.test(part)) return part;
            const order = wordIndex++;
            return reduced ? (
              <Text key={partIndex}>{part}</Text>
            ) : (
              <Animated.Text
                key={partIndex}
                entering={FadeInDown.duration(420)
                  .delay(delay + order * 75)
                  .reduceMotion(ReduceMotion.System)}
              >
                {part}
              </Animated.Text>
            );
          })}
        </Text>
      ))}
    </Text>
  );
}
