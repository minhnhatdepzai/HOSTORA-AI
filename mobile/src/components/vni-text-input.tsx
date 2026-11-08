import { forwardRef, useEffect, useRef } from "react";
import {
  TextInput as NativeTextInput,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";
import { applyVniInputEdit } from "@/lib/vni-input";

type Props = TextInputProps & { vniEnabled?: boolean };

const nonTextKeyboards = new Set([
  "decimal-pad",
  "email-address",
  "name-phone-pad",
  "number-pad",
  "numeric",
  "phone-pad",
  "url",
]);

export const VniTextInput = forwardRef<TextInputInstance, Props>(
  function VniTextInput(
    {
      autoCapitalize,
      keyboardType,
      onChangeText,
      secureTextEntry,
      value,
      vniEnabled,
      ...props
    },
    ref,
  ) {
    const lastValue = useRef(typeof value === "string" ? value : "");
    useEffect(() => {
      if (typeof value === "string") lastValue.current = value;
    }, [value]);

    const enabled =
      vniEnabled ??
      (!secureTextEntry &&
        autoCapitalize !== "characters" &&
        !nonTextKeyboards.has(keyboardType ?? "default"));

    return (
      <NativeTextInput
        {...props}
        ref={ref}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={(next) => {
          const converted = enabled
            ? applyVniInputEdit(lastValue.current, next)
            : next;
          lastValue.current = converted;
          onChangeText?.(converted);
        }}
      />
    );
  },
);

VniTextInput.displayName = "VniTextInput";
