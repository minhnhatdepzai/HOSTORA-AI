import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
  useFonts,
} from "@expo-google-fonts/be-vietnam-pro";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { AppProvider } from "@/context/app-context";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    BeVietnamPro_900Black,
  });

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recommendations" />
          <Stack.Screen name="domain" />
          <Stack.Screen name="analyzer" />
          <Stack.Screen name="knowledge" />
          <Stack.Screen name="products" />
          <Stack.Screen name="seo" />
          <Stack.Screen name="readiness" />
          <Stack.Screen name="settings" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
