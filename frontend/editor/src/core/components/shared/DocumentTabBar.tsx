import { useCallback, useRef, useEffect } from "react";
import { Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useFileState, useFileActions } from "@app/contexts/FileContext";
import { useViewer } from "@app/contexts/ViewerContext";
import {
  useNavigationState,
  useNavigationActions,
} from "@app/contexts/NavigationContext";
import { useSpaces } from "@app/contexts/SpaceContext";
import "@app/components/shared/DocumentTabBar.css";

export function DocumentTabBar() {
  const { t } = useTranslation();
  const { selectors } = useFileState();
  const { actions: fileActions } = useFileActions();
  const { activeFileId, setActiveFileId } = useViewer();
  const { workbench } = useNavigationState();
  const { actions: navActions } = useNavigationActions();
  const { activeSpaceId, fileSpaceMap } = useSpaces();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allFiles = selectors.getFiles();

  // When a space is active, only show files assigned to that space
  const visibleFiles =
    activeSpaceId !== null
      ? allFiles.filter(
          (f) => fileSpaceMap[f.fileId as string] === activeSpaceId,
        )
      : allFiles;

  // Scroll the active tab into view
  useEffect(() => {
    if (!scrollRef.current || !activeFileId) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>(
      `[data-file-id="${CSS.escape(activeFileId as string)}"]`,
    );
    activeEl?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeFileId]);

  const handleTabClick = useCallback(
    (fileId: string) => {
      setActiveFileId(fileId);
      navActions.setWorkbench("viewer");
    },
    [setActiveFileId, navActions],
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      void fileActions.removeFiles([fileId as any], false);
      // If we closed the active file, switch away from viewer to avoid stale state
      if (activeFileId === fileId) {
        const remaining = allFiles.filter((f) => (f.fileId as string) !== fileId);
        if (remaining.length > 0) {
          setActiveFileId(remaining[0].fileId as string);
          navActions.setWorkbench("viewer");
        } else {
          navActions.setWorkbench("fileEditor");
        }
      }
    },
    [fileActions, activeFileId, allFiles, setActiveFileId, navActions],
  );

  if (visibleFiles.length === 0 || workbench === "myFiles") return null;

  return (
    <div className="doc-tab-bar" role="tablist" aria-label={t("tabBar.openDocuments", "Open documents")}>
      <div className="doc-tab-bar-scroll" ref={scrollRef}>
        {visibleFiles.map((file) => {
          const id = file.fileId as string;
          const isActive = id === (activeFileId as string);
          const name = file.name ?? t("tabBar.untitled", "Untitled");
          return (
            <Tooltip
              key={id}
              label={name}
              position="bottom"
              withinPortal
              openDelay={600}
            >
              <div
                className={`doc-tab${isActive ? " active" : ""}`}
                role="tab"
                aria-selected={isActive}
                data-file-id={id}
                onClick={() => handleTabClick(id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTabClick(id);
                  }
                }}
              >
                <InsertDriveFileOutlinedIcon
                  className="doc-tab-icon"
                  sx={{ fontSize: "0.85rem" }}
                />
                <span className="doc-tab-name">{name}</span>
                <button
                  className="doc-tab-close"
                  onClick={(e) => handleClose(e, id)}
                  aria-label={t("tabBar.close", "Close {{name}}", { name })}
                  type="button"
                  tabIndex={-1}
                >
                  <CloseIcon sx={{ fontSize: "0.7rem" }} />
                </button>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
