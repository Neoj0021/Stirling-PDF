import React, { useCallback } from "react";
import { ActionIcon } from "@mantine/core";
import { useTranslation } from "react-i18next";
import LocalIcon from "@app/components/shared/LocalIcon";
import { Tooltip } from "@app/components/shared/Tooltip";
import { ViewerContext } from "@app/contexts/ViewerContext";
import { useSignature } from "@app/contexts/SignatureContext";
import { useNavigationState, useNavigationGuard } from "@app/contexts/NavigationContext";

interface ViewerAnnotationControlsProps {
  currentView: string;
  disabled?: boolean;
}

export default function ViewerAnnotationControls({
  currentView,
  disabled = false,
}: ViewerAnnotationControlsProps) {
  const { t } = useTranslation();

  // Viewer context for PDF controls - safely handle when not available
  const viewerContext = React.useContext(ViewerContext);

  // Signature context for accessing drawing API
  const { isPlacementMode } = useSignature();

  // Check if we're in sign mode
  const { selectedTool } = useNavigationState();
  const { requestNavigation, hasUnsavedChanges } = useNavigationGuard();
  const isSignMode = selectedTool === "sign";

  // Check if we're in any annotation tool that should disable the toggle
  const isInAnnotationTool =
    selectedTool === "annotate" ||
    selectedTool === "sign" ||
    selectedTool === "addImage" ||
    selectedTool === "addText";

  // Check if we're on annotate tool to highlight the button
  const isAnnotateActive = selectedTool === "annotate";
  const annotationsHidden = viewerContext
    ? !viewerContext.isAnnotationsVisible
    : false;

  const handleToggleAnnotationsVisibility = useCallback(() => {
    if (!annotationsHidden && hasUnsavedChanges) {
      requestNavigation(() => viewerContext?.toggleAnnotationsVisibility());
    } else {
      viewerContext?.toggleAnnotationsVisibility();
    }
  }, [annotationsHidden, hasUnsavedChanges, requestNavigation, viewerContext]);

  // NOTE: This early return is placed AFTER all hooks to satisfy React's rules of hooks
  if (isSignMode) {
    return null;
  }

  return (
    <>
      {/* Redact button removed from the viewer toolbar. */}

      <Tooltip
        content={t(
          "workbenchBar.toggleAnnotations",
          "Toggle Annotations Visibility",
        )}
        position="bottom"
        offset={16}
        arrow
        portalTarget={document.body}
      >
        <ActionIcon
          variant={annotationsHidden ? "filled" : "subtle"}
          color={annotationsHidden ? "blue" : undefined}
          radius="md"
          className="workbench-bar-action-icon"
          onClick={handleToggleAnnotationsVisibility}
          disabled={
            disabled ||
            currentView !== "viewer" ||
            (isInAnnotationTool && !isAnnotateActive) ||
            isPlacementMode
          }
          data-active={annotationsHidden ? "true" : undefined}
          aria-pressed={annotationsHidden}
        >
          <LocalIcon
            icon={
              viewerContext?.isAnnotationsVisible
                ? "visibility"
                : "preview-off-rounded"
            }
            width="1.25rem"
            height="1.25rem"
          />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
