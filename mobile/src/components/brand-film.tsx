import { Pressable } from "@/components/pressable";
import { colors } from "@/constants/theme";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INTRO_SOURCE = require("../../assets/video/hostora-intro.mp4");

/** Plays once at launch, then hands control to the existing onboarding or home. */
export function BrandFilm({ onFinish }: { onFinish: () => void }) {
  const [firstFrame, setFirstFrame] = useState(false);
  const finished = useRef(false);
  const player = useVideoPlayer(INTRO_SOURCE, (video) => {
    video.loop = false;
    video.muted = true;
  });

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    player.pause();
    onFinish();
  }, [onFinish, player]);

  useEffect(() => {
    const ended = player.addListener("playToEnd", finish);
    const failed = player.addListener("statusChange", ({ status }) => {
      if (status === "error") finish();
    });
    // A damaged or unsupported video must never trap the user at launch.
    const safetyTimer = setTimeout(finish, 11_000);
    player.play();
    return () => {
      ended.remove();
      failed.remove();
      clearTimeout(safetyTimer);
    };
  }, [finish, player]);

  return (
    <View style={styles.screen} accessibilityLabel="Video mở đầu HOSTORA">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        surfaceType="textureView"
        onFirstFrameRender={() => setFirstFrame(true)}
      />
      {!firstFrame && <View style={styles.cover} />}
      <SafeAreaView style={styles.controls} edges={["top", "bottom"]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bỏ qua video mở đầu"
          onPress={finish}
          style={styles.skip}
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </Pressable>
        <Text style={styles.hint}>HOSTORA AI</Text>
      </SafeAreaView>
    </View>
  );
}

const fill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };

const styles = StyleSheet.create({
  screen: { ...fill, backgroundColor: colors.ink },
  video: { ...fill, width: "100%", height: "100%" },
  cover: { ...fill, backgroundColor: colors.ink },
  controls: {
    ...fill,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  skip: {
    minWidth: 78,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#b5efd266",
    backgroundColor: "#071827aa",
  },
  skipText: {
    color: "#f7faf8",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  hint: {
    alignSelf: "center",
    color: "#b5efd299",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
    letterSpacing: 2.2,
  },
});
