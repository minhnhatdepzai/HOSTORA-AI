export type AppNotificationKind = "order" | "payment" | "refund" | "voucher";

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  route?: string;
};

type AppNotificationInput = Omit<AppNotification, "createdAt" | "read"> &
  Partial<Pick<AppNotification, "createdAt" | "read">>;

const MAX_NOTIFICATIONS = 40;

export function createAppNotification(
  input: AppNotificationInput,
  now = new Date().toISOString(),
): AppNotification {
  return {
    ...input,
    createdAt: now,
    read: input.read ?? false,
  };
}

export function mergeAppNotifications(
  current: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
}

export function markNotificationRead(
  notifications: AppNotification[],
  id: string,
): AppNotification[] {
  return notifications.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
}

export function countUnreadNotifications(notifications: AppNotification[]) {
  return notifications.reduce((total, item) => total + Number(!item.read), 0);
}
