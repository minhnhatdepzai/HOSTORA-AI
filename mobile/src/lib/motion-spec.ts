export type MotionProfile = {
  pressInMs: number;
  pressOutMs: number;
  enterMs: number;
  stepMs: number;
  distance: number;
  pressScale: number;
};

const ACTIVE_MOTION: MotionProfile = {
  pressInMs: 90,
  pressOutMs: 140,
  enterMs: 360,
  stepMs: 320,
  distance: 18,
  pressScale: 0.975,
};

const STATIC_MOTION: MotionProfile = {
  pressInMs: 0,
  pressOutMs: 0,
  enterMs: 0,
  stepMs: 0,
  distance: 0,
  pressScale: 1,
};

export function getMotionProfile(reduced: boolean): MotionProfile {
  return reduced ? STATIC_MOTION : ACTIVE_MOTION;
}

export function getStepDirection(previous: number, next: number) {
  return next < previous ? "backward" : "forward";
}

export function progressForStep(step: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (step + 1) / total));
}

export function getStaggerDelay(index: number, reduced: boolean) {
  return reduced ? 0 : Math.min(Math.max(0, index) * 60, 240);
}
