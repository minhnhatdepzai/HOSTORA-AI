import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeContact } from "@/lib/contact";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultRequirements, type Requirements } from "@/lib/catalog";
import {
  countUnreadNotifications,
  markNotificationRead as markRead,
  mergeAppNotifications,
  type AppNotification,
} from "@/lib/app-notifications";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  plan: string;
  planId?: string;
  createdAt: string;
};

type AppState = {
  hydrated: boolean;
  requirements: Requirements;
  setRequirements: (value: Requirements) => void;
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => void;
  removeLead: (id: string) => void;
  notifications: AppNotification[];
  unreadNotifications: number;
  pushNotification: (notification: AppNotification) => void;
  markNotificationRead: (id: string) => void;
};

const AppContext = createContext<AppState | null>(null);
const REQUIREMENTS_KEY = "hostora:mobile:requirements";
const LEADS_KEY = "hostora:mobile:leads";
const NOTIFICATIONS_KEY = "hostora:mobile:notifications:v1";

export function AppProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [requirements, setRequirementsState] = useState(defaultRequirements);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(REQUIREMENTS_KEY),
      AsyncStorage.getItem(LEADS_KEY),
      AsyncStorage.getItem(NOTIFICATIONS_KEY),
    ])
      .then(([savedRequirements, savedLeads, savedNotifications]) => {
        if (savedRequirements)
          setRequirementsState({
            ...defaultRequirements,
            ...JSON.parse(savedRequirements),
          });
        if (savedLeads) setLeads(JSON.parse(savedLeads));
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications) as AppNotification[];
          setNotifications(mergeAppNotifications([], parsed));
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      hydrated,
      requirements,
      setRequirements(next) {
        setRequirementsState(next);
        void AsyncStorage.setItem(REQUIREMENTS_KEY, JSON.stringify(next));
      },
      leads,
      addLead(input) {
        const contact = normalizeContact(input);
        if (contact.error) throw new Error(contact.error);
        const next = [
          {
            ...input,
            name: contact.name,
            phone: contact.phone,
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
          },
          ...leads,
        ];
        setLeads(next);
        void AsyncStorage.setItem(LEADS_KEY, JSON.stringify(next));
      },
      removeLead(id) {
        const next = leads.filter((lead) => lead.id !== id);
        setLeads(next);
        void AsyncStorage.setItem(LEADS_KEY, JSON.stringify(next));
      },
      notifications,
      unreadNotifications: countUnreadNotifications(notifications),
      pushNotification(notification) {
        setNotifications((current) => {
          const next = mergeAppNotifications(current, [notification]);
          void AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
          return next;
        });
      },
      markNotificationRead(id) {
        setNotifications((current) => {
          const next = markRead(current, id);
          void AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [hydrated, leads, notifications, requirements],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp phải nằm trong AppProvider");
  return value;
}
