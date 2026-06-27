import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Space, SpaceId } from "@app/types/space";
import { SPACE_COLORS } from "@app/types/space";

export interface SpaceContextValue {
  spaces: Space[];
  activeSpaceId: SpaceId | null;
  collapsedSpaceIds: Set<SpaceId>;
  defaultCollapsed: boolean;
  /** fileId → spaceId for files that have been assigned to a space */
  fileSpaceMap: Record<string, SpaceId>;
  createSpace: (name: string) => void;
  renameSpace: (id: SpaceId, name: string) => void;
  deleteSpace: (id: SpaceId) => void;
  setActiveSpaceId: (id: SpaceId | null) => void;
  toggleSpaceCollapsed: (id: SpaceId) => void;
  toggleDefaultCollapsed: () => void;
  changeSpaceColor: (id: SpaceId, color: string) => void;
  assignFileToSpace: (fileId: string, spaceId: SpaceId | null) => void;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

const SPACES_KEY = "stirling.spaces.v1";
const FILE_SPACE_MAP_KEY = "stirling.fileSpaceMap.v1";
const COLLAPSED_KEY = "stirling.spacesCollapsed.v1";
const DEFAULT_COLLAPSED_KEY = "stirling.defaultCollapsed.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode - silently skip
  }
}

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>(() =>
    readJson<Space[]>(SPACES_KEY, []),
  );
  const [fileSpaceMap, setFileSpaceMap] = useState<Record<string, SpaceId>>(
    () => readJson<Record<string, SpaceId>>(FILE_SPACE_MAP_KEY, {}),
  );
  const [collapsedSpaceIds, setCollapsedSpaceIds] = useState<Set<SpaceId>>(
    () => new Set<SpaceId>(readJson<SpaceId[]>(COLLAPSED_KEY, [])),
  );
  const [defaultCollapsed, setDefaultCollapsed] = useState<boolean>(() =>
    readJson<boolean>(DEFAULT_COLLAPSED_KEY, false),
  );
  const [activeSpaceId, setActiveSpaceIdState] = useState<SpaceId | null>(null);

  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;

  useEffect(() => {
    writeJson(SPACES_KEY, spaces);
  }, [spaces]);

  useEffect(() => {
    writeJson(FILE_SPACE_MAP_KEY, fileSpaceMap);
  }, [fileSpaceMap]);

  useEffect(() => {
    writeJson(COLLAPSED_KEY, [...collapsedSpaceIds]);
  }, [collapsedSpaceIds]);

  useEffect(() => {
    writeJson(DEFAULT_COLLAPSED_KEY, defaultCollapsed);
  }, [defaultCollapsed]);

  const createSpace = useCallback((name: string) => {
    const colorIndex = spacesRef.current.length % SPACE_COLORS.length;
    const space: Space = {
      id: `space-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || "Untitled Space",
      color: SPACE_COLORS[colorIndex],
      createdAt: Date.now(),
    };
    setSpaces((prev) => [...prev, space]);
    setActiveSpaceIdState(space.id);
  }, []);

  const renameSpace = useCallback((id: SpaceId, name: string) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)),
    );
  }, []);

  const deleteSpace = useCallback((id: SpaceId) => {
    setSpaces((prev) => prev.filter((s) => s.id !== id));
    setFileSpaceMap((prev) => {
      const next = { ...prev };
      for (const fileId of Object.keys(next)) {
        if (next[fileId] === id) delete next[fileId];
      }
      return next;
    });
    setActiveSpaceIdState((prev) => (prev === id ? null : prev));
  }, []);

  const setActiveSpaceId = useCallback((id: SpaceId | null) => {
    setActiveSpaceIdState(id);
  }, []);

  const toggleSpaceCollapsed = useCallback((id: SpaceId) => {
    setCollapsedSpaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDefaultCollapsed = useCallback(() => {
    setDefaultCollapsed((prev) => !prev);
  }, []);

  const changeSpaceColor = useCallback((id: SpaceId, color: string) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === id ? { ...s, color } : s)),
    );
  }, []);

  const assignFileToSpace = useCallback(
    (fileId: string, spaceId: SpaceId | null) => {
      setFileSpaceMap((prev) => {
        const next = { ...prev };
        if (spaceId === null) {
          delete next[fileId];
        } else {
          next[fileId] = spaceId;
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<SpaceContextValue>(
    () => ({
      spaces,
      activeSpaceId,
      collapsedSpaceIds,
      defaultCollapsed,
      fileSpaceMap,
      createSpace,
      renameSpace,
      deleteSpace,
      setActiveSpaceId,
      toggleSpaceCollapsed,
      toggleDefaultCollapsed,
      changeSpaceColor,
      assignFileToSpace,
    }),
    [
      spaces,
      activeSpaceId,
      collapsedSpaceIds,
      defaultCollapsed,
      fileSpaceMap,
      createSpace,
      renameSpace,
      deleteSpace,
      setActiveSpaceId,
      toggleSpaceCollapsed,
      toggleDefaultCollapsed,
      changeSpaceColor,
      assignFileToSpace,
    ],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpaces(): SpaceContextValue {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpaces must be used inside SpaceProvider");
  return ctx;
}
