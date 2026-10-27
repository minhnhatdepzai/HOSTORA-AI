export const colors = {
  ink: "#071827",
  inkSoft: "#183142",
  primary: "#11695E",
  primarySoft: "#E2F2EC",
  mint: "#B5EFD2",
  mintStrong: "#4CBFA3",
  canvas: "#F6F7F4",
  surface: "#FFFFFF",
  surfaceAlt: "#EAF0EC",
  text: "#132B38",
  muted: "#5D7078",
  faint: "#81949A",
  line: "#D7E2DE",
  success: "#11695E",
  successSoft: "#E2F2EC",
  warning: "#A85D00",
  warningSoft: "#FFF4DA",
  danger: "#C53030",
  dangerSoft: "#FFF0F0",
} as const;

export const shadows = {
  card: {
    shadowColor: "#071827",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 13,
    elevation: 3,
  },
} as const;

export const radii = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 } as const;
