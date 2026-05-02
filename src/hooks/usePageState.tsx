import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { Section } from "@/components/AppSidebar";
import type { ViewKey } from "@/hooks/useProjectViews";

type PageState = {
  section: Section;
  selectedProjectId: string | null;
  view: ViewKey;
  setSection: (s: Section) => void;
  setSelectedProjectId: (id: string | null) => void;
  setView: (v: ViewKey) => void;
};

const Ctx = createContext<PageState | null>(null);

export const PageStateProvider = ({ children }: { children: ReactNode }) => {
  const [section, setSection] = useState<Section>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("table");

  return (
    <Ctx.Provider value={{ section, selectedProjectId, view, setSection, setSelectedProjectId, setView }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePageState = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePageState must be used within PageStateProvider");
  return c;
};
