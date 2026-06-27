import { useCallback, useEffect, useState } from "react";
import { Menu, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FolderIcon from "@mui/icons-material/Folder";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useSpaces } from "@app/contexts/SpaceContext";
import { FileItem } from "@app/components/shared/FileSidebarFileItem";
import type { StirlingFileStub } from "@app/types/fileContext";
import type { FileId } from "@app/types/file";
import type { Space } from "@app/types/space";
import { SPACE_COLORS } from "@app/types/space";
import "@app/components/shared/SpaceTreeSection.css";

const DRAG_FILE_TYPE = "application/x-stirling-file-id";

interface SpaceTreeSectionProps {
  allFileStubs: StirlingFileStub[];
  stubsLoaded: boolean;
  workbenchFileIds: Set<string>;
  viewedWorkbenchId: string | null;
  /** Open a single file in the viewer (no toggle). */
  onOpenFile: (stub: StirlingFileStub) => void;
  /** Open all files for a space/default in the viewer. */
  onOpenSpaceFiles: (stubs: StirlingFileStub[]) => void;
  /** Toggle workbench membership when clicking the checkbox only. */
  onToggleFile: (fileId: FileId) => void;
  onEyeClick: (fileId: FileId, e: React.MouseEvent) => void;
  onDelete?: (fileId: FileId) => void;
  onSaveToCloud?: (fileId: FileId) => void;
  canSaveToCloud?: boolean;
  onVersionHistory?: (fileId: FileId) => void;
  searchQuery: string;
}

/** Inline editable space name input. */
function SpaceNameInput({
  initialName,
  onCommit,
  onCancel,
}: {
  initialName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialName);

  const commit = () => onCommit(value);

  return (
    <input
      autoFocus
      className="space-tree-name-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** Named space row — header acts as activator + drop target, chevron only toggles. */
function SpaceRow({
  space,
  isActive,
  isCollapsed,
  fileCount,
  onToggle,
  onActivate,
  onRename,
  onDelete,
  onColorChange,
  onFileDrop,
}: {
  space: Space;
  isActive: boolean;
  isCollapsed: boolean;
  fileCount: number;
  onToggle: () => void;
  /** Called when user clicks the row body (not chevron). */
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onFileDrop: (fileId: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`space-tree-space-row${isActive ? " active" : ""}${dragOver ? " drag-over" : ""}`}
      onClick={() => {
        if (!editing) {
          onActivate();
          // Auto-expand if collapsed
          if (isCollapsed) onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!editing) { onActivate(); if (isCollapsed) onToggle(); }
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_FILE_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fileId = e.dataTransfer.getData(DRAG_FILE_TYPE);
        if (fileId) onFileDrop(fileId);
      }}
    >
      {/* Chevron — only toggles collapse, does not activate space */}
      <button
        className={`space-tree-chevron${isCollapsed ? "" : " expanded"}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={isCollapsed ? "Expand" : "Collapse"}
        type="button"
      >
        <ChevronRightIcon sx={{ fontSize: "1rem" }} />
      </button>

      <span className="space-tree-color-dot" style={{ background: space.color }} />

      {editing ? (
        <SpaceNameInput
          initialName={space.name}
          onCommit={(name) => { onRename(name); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="space-tree-space-name" title={space.name}>
          {space.name}
        </span>
      )}

      {!editing && fileCount > 0 && (
        <span className="space-tree-file-count">{fileCount}</span>
      )}

      {!editing && (
        <Menu withinPortal position="bottom-end" width={160}>
          <Menu.Target>
            <button
              className="space-tree-kebab"
              onClick={(e) => e.stopPropagation()}
              type="button"
              aria-label={t("spaces.spaceMenu", "Space options")}
            >
              <MoreVertIcon sx={{ fontSize: "1rem" }} />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<EditIcon sx={{ fontSize: "1rem" }} />}
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            >
              {t("spaces.rename", "Rename")}
            </Menu.Item>
            <Menu.Divider />
            <div className="space-color-picker" onClick={(e) => e.stopPropagation()}>
              <span className="space-color-picker-label">{t("spaces.color", "Color")}</span>
              <div className="space-color-swatches">
                {SPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`space-color-swatch${space.color === c ? " active" : ""}`}
                    style={{ background: c }}
                    onClick={(e) => { e.stopPropagation(); onColorChange(c); }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<DeleteOutlineIcon sx={{ fontSize: "1rem" }} />}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              {t("spaces.delete", "Delete space")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </div>
  );
}

/** "Default" space row — collapsible header + drop target for unassigning. */
function DefaultRow({
  isActive,
  isCollapsed,
  fileCount,
  onActivate,
  onToggle,
  onFileDrop,
}: {
  isActive: boolean;
  isCollapsed: boolean;
  fileCount: number;
  onActivate: () => void;
  onToggle: () => void;
  onFileDrop: (fileId: string) => void;
}) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`space-tree-all-row${isActive ? " active" : ""}${dragOver ? " drag-over" : ""}`}
      onClick={() => { onActivate(); if (isCollapsed) onToggle(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { onActivate(); if (isCollapsed) onToggle(); }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_FILE_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fileId = e.dataTransfer.getData(DRAG_FILE_TYPE);
        if (fileId) onFileDrop(fileId);
      }}
    >
      <button
        className={`space-tree-chevron${isCollapsed ? "" : " expanded"}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={isCollapsed ? "Expand Default" : "Collapse Default"}
        type="button"
      >
        <ChevronRightIcon sx={{ fontSize: "1rem" }} />
      </button>

      <FolderIcon sx={{ fontSize: "0.95rem", color: "var(--text-muted)", flexShrink: 0 }} />

      <span className="space-tree-all-label">
        {t("spaces.default", "Default")}
      </span>
      {fileCount > 0 && (
        <span className="space-tree-file-count">{fileCount}</span>
      )}
    </div>
  );
}

export function SpaceTreeSection({
  allFileStubs,
  stubsLoaded,
  workbenchFileIds,
  viewedWorkbenchId,
  onOpenFile,
  onOpenSpaceFiles,
  onToggleFile,
  onEyeClick,
  onDelete,
  onSaveToCloud,
  canSaveToCloud,
  onVersionHistory,
  searchQuery,
}: SpaceTreeSectionProps) {
  const { t } = useTranslation();
  const {
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
  } = useSpaces();

  const [showNewInput, setShowNewInput] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);

  // Unique colors actually in use — determines which dots appear in the filter bar.
  const usedColors = Array.from(new Set(spaces.map((s) => s.color)));

  const handleNewSpaceCommit = useCallback(
    (name: string) => {
      if (name.trim()) createSpace(name.trim());
      setShowNewInput(false);
    },
    [createSpace],
  );

  // Checkmarks are tracked independently from workbench membership so that
  // opening a file by clicking the row never triggers a checkmark.
  const [checkedFileIds, setCheckedFileIds] = useState<Set<string>>(new Set());

  // When files leave the workbench externally (tab close, delete, etc.), clear their checkmarks.
  useEffect(() => {
    setCheckedFileIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of prev) {
        if (!workbenchFileIds.has(id)) { next.delete(id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [workbenchFileIds]);

  const handleCheckboxClick = useCallback(
    (fileId: FileId) => {
      const id = fileId as string;
      setCheckedFileIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      onToggleFile(fileId);
    },
    [onToggleFile],
  );

  const filteredStubs = searchQuery.trim()
    ? allFileStubs.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allFileStubs;

  const filesBySpace = (spaceId: string) =>
    filteredStubs.filter((s) => fileSpaceMap[s.id as string] === spaceId);

  const unassignedFiles = filteredStubs.filter(
    (s) => !fileSpaceMap[s.id as string],
  );

  /** Render a single draggable file row — no checkbox, click to open in viewer. */
  const renderFile = useCallback(
    (stub: StirlingFileStub, indent = false) => {
      const id = stub.id as string;
      const isChecked = checkedFileIds.has(id);
      const isViewedInViewer = !!(viewedWorkbenchId && viewedWorkbenchId === id);
      const thumbnailUrl = workbenchFileIds.has(id) ? undefined : stub.thumbnailUrl;

      return (
        <div
          key={id}
          className={`space-tree-file-row${indent ? " indented" : ""}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_FILE_TYPE, id);
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          <FileItem
            fileId={stub.id}
            name={stub.name}
            size={stub.size}
            lastModified={stub.lastModified}
            isSelected={isChecked}
            isActive={isViewedInViewer}
            isViewedInViewer={isViewedInViewer}
            thumbnailUrl={thumbnailUrl}
            onClick={() => onOpenFile(stub)}
            onCheckboxClick={handleCheckboxClick}
            onEyeClick={onEyeClick}
            onDelete={onDelete}
            onSaveToCloud={onSaveToCloud}
            canSaveToCloud={canSaveToCloud}
            onVersionHistory={onVersionHistory}
            hasVersionHistory={(stub.versionNumber ?? 1) > 1}
          />
        </div>
      );
    },
    [checkedFileIds, workbenchFileIds, viewedWorkbenchId, onOpenFile, handleCheckboxClick, onEyeClick, onDelete, onSaveToCloud, canSaveToCloud, onVersionHistory],
  );

  const renderFileList = (stubs: StirlingFileStub[], indent = false) => {
    if (!stubsLoaded) {
      return (
        <div className="space-tree-loading">
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {t("fileSidebar.loading", "Loading...")}
          </span>
        </div>
      );
    }
    if (stubs.length === 0) {
      return (
        <div className="space-tree-empty">
          <p className="space-tree-empty-text">
            {searchQuery.trim()
              ? t("fileSidebar.noResults", "No results")
              : t("fileSidebar.noFiles", "No files yet")}
          </p>
          {!searchQuery.trim() && (
            <p className="space-tree-empty-hint">
              {t("fileSidebar.dropHint", "Open files to get started")}
            </p>
          )}
        </div>
      );
    }
    return stubs.map((s) => renderFile(s, indent));
  };

  return (
    <div className="space-tree-section sidebar-content-fade">
      {/* Header — SPACES label + color filter dots + new-space button all inline */}
      <div className="space-tree-header">
        <span className="space-tree-header-label">
          {t("spaces.title", "Spaces")}
        </span>
        {usedColors.length >= 2 && (
          <div className="space-color-filter-bar">
            {usedColors.map((c) => (
              <button
                key={c}
                type="button"
                className={`space-color-filter-dot${filterColor === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => setFilterColor(filterColor === c ? null : c)}
                aria-label={`Filter by color ${c}`}
              />
            ))}
          </div>
        )}
        <Tooltip label={t("spaces.newSpace", "New space")} position="right" withinPortal>
          <button
            className="space-tree-header-btn"
            onClick={() => setShowNewInput(true)}
            type="button"
            aria-label={t("spaces.newSpace", "New space")}
          >
            <AddIcon sx={{ fontSize: "1rem" }} />
          </button>
        </Tooltip>
      </div>

      {showNewInput && (
        <div className="space-tree-new-space-row">
          <FolderIcon sx={{ fontSize: "1rem", color: "var(--text-muted)", flexShrink: 0 }} />
          <SpaceNameInput
            initialName=""
            onCommit={handleNewSpaceCommit}
            onCancel={() => setShowNewInput(false)}
          />
        </div>
      )}

      <div className="space-tree-list">
        {/* Default section */}
        <DefaultRow
          isActive={activeSpaceId === null}
          isCollapsed={defaultCollapsed}
          fileCount={unassignedFiles.length}
          onActivate={() => {
            setActiveSpaceId(null);
            onOpenSpaceFiles(unassignedFiles);
          }}
          onToggle={toggleDefaultCollapsed}
          onFileDrop={(fileId) => assignFileToSpace(fileId, null)}
        />
        {!defaultCollapsed && unassignedFiles.length > 0 && (
          <div className="space-tree-space-files">
            {renderFileList(unassignedFiles, true)}
          </div>
        )}

        {/* Named spaces */}
        {spaces.filter((s) => !filterColor || s.color === filterColor).map((space) => {
          const spaceFiles = filesBySpace(space.id);
          const isCollapsed = collapsedSpaceIds.has(space.id);
          const isActive = activeSpaceId === space.id;

          return (
            <div key={space.id} className="space-tree-space-group">
              <SpaceRow
                space={space}
                isActive={isActive}
                isCollapsed={isCollapsed}
                fileCount={spaceFiles.length}
                onToggle={() => toggleSpaceCollapsed(space.id)}
                onActivate={() => {
                  setActiveSpaceId(space.id);
                  onOpenSpaceFiles(spaceFiles);
                }}
                onRename={(name) => renameSpace(space.id, name)}
                onDelete={() => deleteSpace(space.id)}
                onColorChange={(color) => changeSpaceColor(space.id, color)}
                onFileDrop={(fileId) => assignFileToSpace(fileId, space.id)}
              />
              {!isCollapsed && (
                <div className="space-tree-space-files">
                  {spaceFiles.length > 0 ? (
                    spaceFiles.map((stub) => renderFile(stub, true))
                  ) : (
                    <p className="space-tree-drop-hint">
                      {t("spaces.dropHere", "Drag files here")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
