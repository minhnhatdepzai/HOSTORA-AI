export const colors = {
  ink: "#07111F",
  inkSoft: "#102036",
  primary: "#244BD8",
  primarySoft: "#EAF0FF",
  mint: "#B8F3D6",
  mintStrong: "#45C993",
  canvas: "#F3F6F4",
  surface: "#FFFFFF",
  surfaceAlt: "#E9EFEC",
  text: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  line: "#DDE6E2",
  success: "#087A55",
  successSoft: "#E7F8F1",
  warning: "#A85D00",
  warningSoft: "#FFF4DA",
  danger: "#C53030",
  dangerSoft: "#FFF0F0",
} as const;

export const shadows = {
  card: {
    shadowColor: "#07111F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 4,
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
} as const;

export const radii = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;
