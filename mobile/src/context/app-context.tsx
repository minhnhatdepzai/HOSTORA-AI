import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultRequirements, type Requirements } from "@/lib/catalog";

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
};

const AppContext = createContext<AppState | null>(null);
const REQUIREMENTS_KEY = "hostora:mobile:requirements";
const LEADS_KEY = "hostora:mobile:leads";

export function AppProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [requirements, setRequirementsState] = useState(defaultRequirements);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(REQUIREMENTS_KEY),
      AsyncStorage.getItem(LEADS_KEY),
    ])
      .then(([savedRequirements, savedLeads]) => {
        if (savedRequirements)
          setRequirementsState({
            ...defaultRequirements,
            ...JSON.parse(savedRequirements),
          });
        if (savedLeads) setLeads(JSON.parse(savedLeads));
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
        const next = [
          {
            ...input,
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
    }),
    [hydrated, leads, requirements],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp phải nằm trong AppProvider");
  return value;
}
