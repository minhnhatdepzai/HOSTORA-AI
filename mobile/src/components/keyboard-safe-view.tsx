import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  StyleSheet,
  type KeyboardAvoidingViewProps,
} from "react-native";

export function KeyboardSafeView({
  children,
  style,
  ...props
}: PropsWithChildren<KeyboardAvoidingViewProps>) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.root, style]}
      {...props}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
