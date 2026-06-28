import { useState, useCallback, useMemo } from "react";
import { useToolRegistry } from "@app/contexts/ToolRegistryContext";
import { usePreferences } from "@app/contexts/PreferencesContext";
import {
  type ToolRegistryEntry,
  type ToolRegistry,
} from "@app/data/toolsTaxonomy";
import { FileId } from "@app/types/file";
import { ToolId } from "@app/types/toolId";

export type ToolDisableCause =
  | "disabledByAdmin"
  | "missingDependency"
  | "unknown"
  | "selfHostedOffline";

export interface ToolAvailabilityInfo {
  available: boolean;
  reason?: ToolDisableCause;
}

export type ToolAvailabilityMap = Partial<Record<ToolId, ToolAvailabilityInfo>>;

interface ToolManagementResult {
  selectedTool: ToolRegistryEntry | null;
  toolSelectedFileIds: FileId[];
  toolRegistry: Partial<ToolRegistry>;
  setToolSelectedFileIds: (fileIds: FileId[]) => void;
  getSelectedTool: (toolKey: ToolId | null) => ToolRegistryEntry | null;
  toolAvailability: ToolAvailabilityMap;
}

export const useToolManagement = (): ToolManagementResult => {
  const [toolSelectedFileIds, setToolSelectedFileIds] = useState<FileId[]>([]);

  const { allTools } = useToolRegistry();
  const baseRegistry = allTools;
  const { preferences } = usePreferences();

  // All tools are always available. Endpoint availability, SaaS mode, and
  // self-hosted offline status no longer lock tools at the picker level.
  // Tools that need an external backend program (e.g. LibreOffice for
  // .docx→.pdf) simply error at run time if the required program is missing.
  const toolAvailability: ToolAvailabilityMap = useMemo(() => ({}), []);

  const toolRegistry: Partial<ToolRegistry> = useMemo(() => {
    const availableToolRegistry: Partial<ToolRegistry> = {};
    (Object.keys(baseRegistry) as ToolId[]).forEach((toolKey) => {
      const baseTool = baseRegistry[toolKey];
      if (!baseTool) return;

      // Check if tool is "coming soon" (has no component and no link)
      const isComingSoon =
        !baseTool.component &&
        !baseTool.link &&
        toolKey !== "read" &&
        toolKey !== "multiTool";

      if (preferences.hideUnavailableTools && isComingSoon) {
        return;
      }
      availableToolRegistry[toolKey] = baseTool;
    });
    return availableToolRegistry;
  }, [baseRegistry, preferences.hideUnavailableTools]);

  const getSelectedTool = useCallback(
    (toolKey: ToolId | null): ToolRegistryEntry | null => {
      return toolKey ? toolRegistry[toolKey] || null : null;
    },
    [toolRegistry],
  );

  return {
    selectedTool: getSelectedTool(null),
    toolSelectedFileIds,
    toolRegistry,
    setToolSelectedFileIds,
    getSelectedTool,
    toolAvailability,
  };
};
