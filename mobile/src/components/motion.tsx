import { createContext, useContext, type PropsWithChildren } from "react";
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

export const MotionContext = createContext(false);
export const useMotionPreference = () => useContext(MotionContext);

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
