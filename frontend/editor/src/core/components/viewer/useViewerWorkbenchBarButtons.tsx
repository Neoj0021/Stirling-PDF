import { useMemo, useState, useEffect, useCallback } from "react";
import { ActionIcon, Popover } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useViewer } from "@app/contexts/ViewerContext";
import {
  useWorkbenchBarButtons,
  WorkbenchBarButtonWithAction,
} from "@app/hooks/useWorkbenchBarButtons";
import LocalIcon from "@app/components/shared/LocalIcon";
import { Tooltip } from "@app/components/shared/Tooltip";
import { SearchInterface } from "@app/components/viewer/SearchInterface";
import ViewerAnnotationControls from "@app/components/viewer/ViewerAnnotationControls";
import { useSidebarContext } from "@app/contexts/SidebarContext";
import { useWorkbenchBarTooltipSide } from "@app/hooks/useWorkbenchBarTooltipSide";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import {
  useNavigationState,
  useNavigationGuard,
} from "@app/contexts/NavigationContext";
import { stripBasePath, withBasePath } from "@app/constants/app";
import { useRedaction, useRedactionMode } from "@app/contexts/RedactionContext";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TitleIcon from "@mui/icons-material/Title";
import StraightenIcon from "@mui/icons-material/Straighten";
import LayersIcon from "@mui/icons-material/Layers";

export function useViewerWorkbenchBarButtons(
  isRulerActive?: boolean,
  setIsRulerActive?: (v: boolean) => void,
) {
  const { t } = useTranslation();
  const viewer = useViewer();
  const {
    isThumbnailSidebarVisible,
    isBookmarkSidebarVisible,
    isAttachmentSidebarVisible,
    isLayerSidebarVisible,
    hasLayers,
    isCommentsSidebarVisible,
    toggleCommentsSidebar,
    isSearchInterfaceVisible,
    registerImmediatePanUpdate,
  } = viewer;
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const { sidebarRefs } = useSidebarContext();
  const { position: tooltipPosition } = useWorkbenchBarTooltipSide(
    sidebarRefs,
    12,
  );
  const { handleToolSelect, handleToolSelectForced, handleBackToTools } =
    useToolWorkflow();
  const { selectedTool } = useNavigationState();
  const { requestNavigation } = useNavigationGuard();
  const { redactionsApplied, activeType: redactionActiveType } = useRedaction();
  const { pendingCount } = useRedactionMode();

  useEffect(() => {
    return registerImmediatePanUpdate((newIsPanning) => {
      setIsPanning(newIsPanning);
    });
  }, [registerImmediatePanUpdate]);

  const isAnnotationsPath = useCallback(() => {
    const cleanPath = stripBasePath(window.location.pathname).toLowerCase();
    return cleanPath === "/annotations" || cleanPath.endsWith("/annotations");
  }, []);

  const [isAnnotationsActive, setIsAnnotationsActive] = useState<boolean>(() =>
    isAnnotationsPath(),
  );

  useEffect(() => {
    if (selectedTool === "annotate") {
      setIsAnnotationsActive(true);
    } else if (selectedTool) {
      setIsAnnotationsActive(false);
    } else {
      setIsAnnotationsActive(isAnnotationsPath());
    }
  }, [selectedTool, isAnnotationsPath]);

  useEffect(() => {
    const handlePopState = () => setIsAnnotationsActive(isAnnotationsPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAnnotationsPath]);

  const searchLabel = t("workbenchBar.search", "Search PDF");
  const panLabel = t("workbenchBar.panMode", "Pan Mode");
  const applyRedactionsLabel = t(
    "workbenchBar.applyRedactionsFirst",
    "Apply redactions first",
  );
  const rotateLeftLabel = t("workbenchBar.rotateLeft", "Rotate Left");
  const rotateRightLabel = t("workbenchBar.rotateRight", "Rotate Right");
  const sidebarLabel = t("workbenchBar.toggleSidebar", "Toggle Sidebar");
  const bookmarkLabel = t("workbenchBar.toggleBookmarks", "Toggle Bookmarks");
  const attachmentLabel = t(
    "workbenchBar.toggleAttachments",
    "Toggle Attachments",
  );
  const layersLabel = t("workbenchBar.toggleLayers", "Toggle Layers");
  const commentsLabel = t("workbenchBar.toggleComments", "Comments");
  const annotationsLabel = t("workbenchBar.annotations", "Annotations");
  const formFillLabel = t("workbenchBar.formFill", "Fill Form");
  const rulerLabel = t("workbenchBar.ruler", "Ruler / Measure");

  const isFormFillActive = (selectedTool as string) === "formFill";
  const isTextBoxActive = (selectedTool as string) === "addText";
  const textBoxLabel = t("workbenchBar.textBox", "Text Box");

  const viewerButtons = useMemo<WorkbenchBarButtonWithAction[]>(() => {
    const buttons: WorkbenchBarButtonWithAction[] = [
      {
        id: "viewer-search",
        tooltip: searchLabel,
        ariaLabel: searchLabel,
        section: "top" as const,
        order: 10,
        render: ({ disabled }) => (
          <Tooltip
            content={searchLabel}
            position={tooltipPosition}
            offset={12}
            arrow
            portalTarget={document.body}
          >
            <Popover
              position={tooltipPosition}
              withArrow
              shadow="md"
              offset={8}
              opened={isSearchInterfaceVisible}
              onClose={viewer.searchInterfaceActions.close}
            >
              <Popover.Target>
                <div style={{ display: "inline-flex" }}>
                  <ActionIcon
                    variant="subtle"
                    radius="md"
                    className="workbench-bar-action-icon"
                    disabled={disabled}
                    aria-label={searchLabel}
                    onClick={viewer.searchInterfaceActions.toggle}
                  >
                    <LocalIcon icon="search" width="1.25rem" height="1.25rem" />
                  </ActionIcon>
                </div>
              </Popover.Target>
              <Popover.Dropdown>
                <div style={{ minWidth: "20rem" }}>
                  <SearchInterface
                    visible={isSearchInterfaceVisible}
                    onClose={viewer.searchInterfaceActions.close}
                  />
                </div>
              </Popover.Dropdown>
            </Popover>
          </Tooltip>
        ),
      },
      {
        id: "viewer-pan-mode",
        icon: (
          <LocalIcon icon="pan-tool-rounded" width="1.25rem" height="1.25rem" />
        ),
        tooltip:
          !isPanning && pendingCount > 0 && redactionActiveType !== null
            ? applyRedactionsLabel
            : panLabel,
        ariaLabel:
          !isPanning && pendingCount > 0 && redactionActiveType !== null
            ? applyRedactionsLabel
            : panLabel,
        section: "top" as const,
        order: 20,
        active: isPanning,
        disabled:
          !isPanning && pendingCount > 0 && redactionActiveType !== null,
        onClick: () => {
          viewer.panActions.togglePan();
          setIsPanning((prev) => {
            const next = !prev;
            if (next && isRulerActive) setIsRulerActive?.(false);
            return next;
          });
        },
      },
      {
        id: "viewer-ruler",
        icon: <StraightenIcon sx={{ fontSize: "1.25rem" }} />,
        tooltip: rulerLabel,
        ariaLabel: rulerLabel,
        section: "top" as const,
        order: 25,
        active: Boolean(isRulerActive),
        onClick: () => {
          const next = !isRulerActive;
          setIsRulerActive?.(next);
          if (next && isPanning) {
            viewer.panActions.disablePan();
            setIsPanning(false);
          }
        },
      },
      {
        id: "viewer-rotate-left",
        icon: <LocalIcon icon="rotate-left" width="1.25rem" height="1.25rem" />,
        tooltip: rotateLeftLabel,
        ariaLabel: rotateLeftLabel,
        section: "top" as const,
        order: 30,
        onClick: () => {
          viewer.rotationActions.rotateBackward();
        },
      },
      {
        id: "viewer-rotate-right",
        icon: (
          <LocalIcon icon="rotate-right" width="1.25rem" height="1.25rem" />
        ),
        tooltip: rotateRightLabel,
        ariaLabel: rotateRightLabel,
        section: "top" as const,
        order: 40,
        onClick: () => {
          viewer.rotationActions.rotateForward();
        },
      },
      {
        id: "viewer-toggle-sidebar",
        icon: <LocalIcon icon="view-list" width="1.25rem" height="1.25rem" />,
        tooltip: sidebarLabel,
        ariaLabel: sidebarLabel,
        section: "top" as const,
        order: 50,
        active: isThumbnailSidebarVisible,
        onClick: () => {
          viewer.toggleThumbnailSidebar();
        },
      },
      {
        id: "viewer-toggle-bookmarks",
        icon: (
          <LocalIcon
            icon="bookmark-add-rounded"
            width="1.25rem"
            height="1.25rem"
          />
        ),
        tooltip: bookmarkLabel,
        ariaLabel: bookmarkLabel,
        section: "top" as const,
        order: 55,
        active: isBookmarkSidebarVisible,
        onClick: () => {
          viewer.toggleBookmarkSidebar();
        },
      },
      {
        id: "viewer-toggle-attachments",
        icon: (
          <LocalIcon
            icon="attachment-rounded"
            width="1.25rem"
            height="1.25rem"
          />
        ),
        tooltip: attachmentLabel,
        ariaLabel: attachmentLabel,
        section: "top" as const,
        order: 56,
        active: isAttachmentSidebarVisible,
        onClick: () => {
          viewer.toggleAttachmentSidebar();
        },
      },
      ...(hasLayers
        ? [
            {
              id: "viewer-toggle-layers",
              icon: <LayersIcon sx={{ fontSize: "1.25rem" }} />,
              tooltip: layersLabel,
              ariaLabel: layersLabel,
              section: "top" as const,
              order: 56.3,
              active: isLayerSidebarVisible,
              onClick: () => {
                viewer.toggleLayerSidebar();
              },
            },
          ]
        : []),
      {
        id: "viewer-toggle-comments",
        icon: <LocalIcon icon="comment" width="1.25rem" height="1.25rem" />,
        tooltip: commentsLabel,
        ariaLabel: commentsLabel,
        section: "top" as const,
        order: 56.5,
        active: isCommentsSidebarVisible,
        onClick: () => {
          toggleCommentsSidebar();
        },
      },
      {
        id: "viewer-annotations",
        tooltip: annotationsLabel,
        ariaLabel: annotationsLabel,
        section: "top" as const,
        order: 58,
        active: isAnnotationsActive,
        render: ({ disabled }) => (
          <Tooltip
            content={annotationsLabel}
            position={tooltipPosition}
            offset={12}
            arrow
            portalTarget={document.body}
          >
            <ActionIcon
              variant={isAnnotationsActive ? "filled" : "subtle"}
              radius="md"
              className="workbench-bar-action-icon"
              onClick={() => {
                if (disabled || isAnnotationsActive) return;

                const hasRedactionChanges =
                  pendingCount > 0 || redactionsApplied;

                const switchToAnnotations = () => {
                  const targetPath = withBasePath("/annotations");
                  if (window.location.pathname !== targetPath) {
                    window.history.pushState(null, "", targetPath);
                  }
                  setIsAnnotationsActive(true);
                  // Use handleToolSelectForced to bypass the unsaved-changes guard —
                  // the navigation warning modal already handled that check.
                  handleToolSelectForced("annotate");
                };

                if (hasRedactionChanges) {
                  requestNavigation(switchToAnnotations);
                } else {
                  switchToAnnotations();
                }
              }}
              disabled={disabled}
              aria-pressed={isAnnotationsActive}
              color={isAnnotationsActive ? "blue" : undefined}
            >
              <LocalIcon icon="edit" width="1.25rem" height="1.25rem" />
            </ActionIcon>
          </Tooltip>
        ),
      },
      {
        id: "viewer-annotation-controls",
        section: "top" as const,
        order: 60,
        render: ({ disabled }) => (
          <ViewerAnnotationControls currentView="viewer" disabled={disabled} />
        ),
      },
      {
        id: "viewer-text-box",
        tooltip: textBoxLabel,
        ariaLabel: textBoxLabel,
        section: "top" as const,
        order: 61,
        active: isTextBoxActive,
        render: ({ disabled }) => (
          <Tooltip
            content={textBoxLabel}
            position={tooltipPosition}
            offset={12}
            arrow
            portalTarget={document.body}
          >
            <ActionIcon
              variant={isTextBoxActive ? "filled" : "subtle"}
              radius="md"
              className="workbench-bar-action-icon"
              onClick={() => {
                if (disabled) return;
                if (isTextBoxActive) {
                  handleBackToTools();
                } else {
                  handleToolSelect("addText" as any);
                }
              }}
              disabled={disabled}
              aria-pressed={isTextBoxActive}
              color={isTextBoxActive ? "blue" : undefined}
            >
              <TitleIcon sx={{ fontSize: "1.25rem" }} />
            </ActionIcon>
          </Tooltip>
        ),
      },
      {
        id: "viewer-form-fill",
        tooltip: formFillLabel,
        ariaLabel: formFillLabel,
        section: "top" as const,
        order: 62,
        render: ({ disabled }) => (
          <Tooltip
            content={formFillLabel}
            position={tooltipPosition}
            offset={12}
            arrow
            portalTarget={document.body}
          >
            <ActionIcon
              variant={isFormFillActive ? "filled" : "subtle"}
              radius="md"
              className="workbench-bar-action-icon"
              onClick={() => {
                if (disabled) return;
                if (isFormFillActive) {
                  handleBackToTools();
                } else {
                  handleToolSelect("formFill" as any);
                }
              }}
              disabled={disabled}
              aria-pressed={isFormFillActive}
              color={isFormFillActive ? "blue" : undefined}
            >
              <TextFieldsIcon sx={{ fontSize: "1.25rem" }} />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ];

    return buttons;
  }, [
    t,
    viewer,
    isThumbnailSidebarVisible,
    isBookmarkSidebarVisible,
    isAttachmentSidebarVisible,
    isLayerSidebarVisible,
    hasLayers,
    isSearchInterfaceVisible,
    isPanning,
    searchLabel,
    panLabel,
    applyRedactionsLabel,
    rotateLeftLabel,
    rotateRightLabel,
    sidebarLabel,
    bookmarkLabel,
    attachmentLabel,
    layersLabel,
    tooltipPosition,
    annotationsLabel,
    isAnnotationsActive,
    handleToolSelect,
    pendingCount,
    redactionActiveType,
    formFillLabel,
    isFormFillActive,
    textBoxLabel,
    isTextBoxActive,
    handleBackToTools,
    rulerLabel,
    isRulerActive,
    setIsRulerActive,
  ]);

  useWorkbenchBarButtons(viewerButtons);
}
