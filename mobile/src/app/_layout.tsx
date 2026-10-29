import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
  useFonts,
} from "@expo-google-fonts/be-vietnam-pro";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { MotionContext } from "@/components/motion";
import { BrandFilm } from "@/components/brand-film";
import { Onboarding } from "@/components/onboarding";
import { AppProvider } from "@/context/app-context";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { NotificationCenter } from "@/components/notification-center";
import {
  ONBOARDING_COMPLETED_VALUE,
  ONBOARDING_STORAGE_KEY,
  shouldShowOnboarding,
} from "@/lib/onboarding";
import { getRoutedContentAccessibility } from "@/lib/app-accessibility";

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
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(true))
      .finally(() => setMotionReady(true));
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setShowOnboarding(shouldShowOnboarding(value)))
      .catch(() => setShowOnboarding(true))
      .finally(() => setOnboardingReady(true));
  }, []);

  useEffect(() => {
    if (loaded && onboardingReady && motionReady) void SplashScreen.hideAsync();
  }, [loaded, onboardingReady, motionReady]);

  if (!loaded || !onboardingReady || !motionReady) return null;

  const playingIntro = showIntro && !reduceMotion;
  const routedContentAccessibility = getRoutedContentAccessibility(
    playingIntro || showOnboarding,
  );

  function finishOnboarding() {
    setShowOnboarding(false);
    void AsyncStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      ONBOARDING_COMPLETED_VALUE,
    );
  }

  return (
    <SafeAreaProvider>
      <MotionContext.Provider value={reduceMotion}>
        <AppProvider>
          <CustomerAuthProvider>
          <View style={{ flex: 1 }}>
            <StatusBar
              style={showOnboarding || playingIntro ? "light" : "dark"}
              hidden={playingIntro}
            />
            <View style={styles.routedContent} {...routedContentAccessibility}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.canvas },
                  animation: reduceMotion ? "none" : "fade_from_bottom",
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="recommendations" />
                <Stack.Screen name="domain" />
                <Stack.Screen name="analyzer" />
                <Stack.Screen name="knowledge" />
                <Stack.Screen name="journal" />
                <Stack.Screen name="seo" />
                <Stack.Screen name="readiness" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="orders" />
                <Stack.Screen name="studio" />
                <Stack.Screen name="account" />
                <Stack.Screen name="account-login" />
                <Stack.Screen name="account-register" />
                <Stack.Screen name="account-forgot" />
              </Stack>
            </View>
            {playingIntro ? (
              <BrandFilm onFinish={() => setShowIntro(false)} />
            ) : showOnboarding ? (
              <View style={StyleSheet.absoluteFill}>
                <Onboarding onFinish={finishOnboarding} />
              </View>
            ) : null}
            {!showOnboarding && !playingIntro ? <NotificationCenter /> : null}
          </View>
          </CustomerAuthProvider>
        </AppProvider>
      </MotionContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  routedContent: { flex: 1 },
});
