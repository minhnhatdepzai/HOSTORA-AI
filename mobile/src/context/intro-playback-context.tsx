import { createContext, use } from "react";

export type IntroPlaybackController = {
  canReplayIntro: boolean;
  replayIntro: () => void;
};

export const IntroPlaybackContext =
  createContext<IntroPlaybackController | null>(null);

export function useIntroPlayback() {
  const controller = use(IntroPlaybackContext);
  if (!controller) {
    throw new Error(
      "useIntroPlayback must be used inside IntroPlaybackContext",
    );
  }
  return controller;
}
