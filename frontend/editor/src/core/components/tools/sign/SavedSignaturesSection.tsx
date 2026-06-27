import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Alert,
  Box,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { LocalIcon } from "@app/components/shared/LocalIcon";
import {
  SavedSignature,
  SavedSignatureType,
} from "@app/hooks/tools/sign/useSavedSignatures";
import type { StorageType } from "@app/services/signatureStorageService";

interface SavedSignaturesSectionProps {
  signatures: SavedSignature[];
  disabled?: boolean;
  isAtCapacity: boolean;
  maxLimit: number;
  storageType?: StorageType | null;
  isAdmin?: boolean;
  onUseSignature: (signature: SavedSignature) => void;
  onDeleteSignature: (signature: SavedSignature) => void;
  onRenameSignature: (id: string, label: string) => void;
  translationScope?: string;
}

const typeColor: Record<SavedSignatureType, string> = {
  canvas: "#6366f1",
  image: "#14b8a6",
  text: "#a855f7",
};

export const SavedSignaturesSection = ({
  signatures,
  disabled = false,
  isAtCapacity,
  maxLimit,
  storageType: _storageType,
  isAdmin = false,
  onUseSignature,
  onDeleteSignature,
  onRenameSignature,
  translationScope = "sign",
}: SavedSignaturesSectionProps) => {
  const { t } = useTranslation();
  const translate = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(`${translationScope}.${key}`, { defaultValue, ...options }),
    [t, translationScope],
  );

  // Track which signature label is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setLabelDrafts((prev) => {
      const next: Record<string, string> = {};
      signatures.forEach((sig) => {
        next[sig.id] = prev[sig.id] ?? sig.label ?? "";
      });
      return next;
    });
  }, [signatures]);

  const commitRename = useCallback(
    (sig: SavedSignature) => {
      const next = (labelDrafts[sig.id] ?? "").trim();
      setEditingId(null);
      if (!next || next === sig.label) {
        setLabelDrafts((prev) => ({ ...prev, [sig.id]: sig.label }));
        return;
      }
      onRenameSignature(sig.id, next);
    },
    [labelDrafts, onRenameSignature],
  );

  const renderPreviewThumb = (sig: SavedSignature) => {
    if (sig.type === "text") {
      return (
        <Box
          style={{
            width: 64,
            height: 48,
            flexShrink: 0,
            borderRadius: 4,
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: 2,
          }}
        >
          <Text
            size="xs"
            style={{
              fontFamily: sig.fontFamily,
              color: sig.textColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 58,
            }}
          >
            {sig.signerName}
          </Text>
        </Box>
      );
    }
    return (
      <Box
        style={{
          width: 64,
          height: 48,
          flexShrink: 0,
          borderRadius: 4,
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 2,
        }}
      >
        <Box
          component="img"
          src={sig.dataUrl}
          alt={sig.label}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </Box>
    );
  };

  const renderSigRow = (sig: SavedSignature, canDelete: boolean) => {
    const isEditing = editingId === sig.id;
    return (
      <Card
        key={sig.id}
        withBorder
        padding="xs"
        style={{ cursor: disabled ? "default" : "pointer" }}
        onClick={() => !disabled && !isEditing && onUseSignature(sig)}
      >
        <Group gap="xs" wrap="nowrap" align="center">
          {renderPreviewThumb(sig)}

          <Box style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <TextInput
                size="xs"
                value={labelDrafts[sig.id] ?? sig.label}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setLabelDrafts((prev) => ({
                    ...prev,
                    [sig.id]: e.currentTarget.value,
                  }))
                }
                onBlur={() => commitRename(sig)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setLabelDrafts((prev) => ({ ...prev, [sig.id]: sig.label }));
                    setEditingId(null);
                  }
                  e.stopPropagation();
                }}
              />
            ) : (
              <Text
                size="sm"
                fw={500}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={sig.label}
              >
                {sig.label}
              </Text>
            )}
            <Text size="xs" c="dimmed" style={{ marginTop: 1 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: typeColor[sig.type],
                  marginRight: 4,
                  verticalAlign: "middle",
                }}
              />
              {sig.type === "canvas"
                ? translate("saved.type.canvas", "Drawing")
                : sig.type === "image"
                  ? translate("saved.type.image", "Upload")
                  : translate("saved.type.text", "Text")}
            </Text>
          </Box>

          <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            <Tooltip label={translate("saved.rename", "Rename")} withinPortal>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={translate("saved.rename", "Rename")}
                onClick={(e) => { e.stopPropagation(); setEditingId(sig.id); }}
                disabled={disabled}
              >
                <LocalIcon icon="edit-rounded" width={15} height={15} />
              </ActionIcon>
            </Tooltip>
            {canDelete && (
              <Tooltip label={translate("saved.delete", "Remove")} withinPortal>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={translate("saved.delete", "Remove")}
                  onClick={(e) => { e.stopPropagation(); onDeleteSignature(sig); }}
                  disabled={disabled}
                >
                  <LocalIcon icon="delete-outline-rounded" width={15} height={15} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card>
    );
  };

  const emptyState = (
    <Card withBorder>
      <Stack gap="xs">
        <Text fw={500}>
          {translate("saved.emptyTitle", "No saved signatures yet")}
        </Text>
        <Text size="sm" c="dimmed">
          {translate(
            "saved.emptyDescription",
            'Draw, upload, or type a signature above, then use "Save to library" to keep up to {{max}} favourites ready to use.',
            { max: maxLimit },
          )}
        </Text>
      </Stack>
    </Card>
  );

  const personal = signatures.filter((s) => s.scope === "personal");
  const shared = signatures.filter((s) => s.scope === "shared");
  const local = signatures.filter((s) => s.scope === "localStorage");

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Text fw={600} size="md">
            {translate("saved.heading", "Saved signatures")}
          </Text>
          <Text size="sm" c="dimmed">
            {translate("saved.description", "Click a signature to place it.")}
          </Text>
        </Stack>
      </Group>

      {isAtCapacity && (
        <Alert color="yellow" title={translate("saved.limitTitle", "Limit reached")}>
          <Text size="sm">
            {translate(
              "saved.limitDescription",
              "Remove a saved signature before adding new ones (max {{max}}).",
              { max: maxLimit },
            )}
          </Text>
        </Alert>
      )}

      {signatures.length === 0 ? (
        emptyState
      ) : (
        <Stack gap="md">
          {personal.length > 0 && (
            <Stack gap="xs">
              <Group gap="xs">
                <LocalIcon icon="person-rounded" width={16} height={16} />
                <Text fw={600} size="sm">
                  {translate("saved.personalHeading", "Personal")}
                </Text>
              </Group>
              <Stack
                gap={6}
                style={{ maxHeight: 320, overflowY: "auto" }}
              >
                {personal.map((sig) => renderSigRow(sig, true))}
              </Stack>
            </Stack>
          )}

          {shared.length > 0 && (
            <Stack gap="xs">
              <Group gap="xs">
                <LocalIcon icon="groups-rounded" width={16} height={16} />
                <Text fw={600} size="sm">
                  {translate("saved.sharedHeading", "Shared")}
                </Text>
              </Group>
              <Stack gap={6} style={{ maxHeight: 320, overflowY: "auto" }}>
                {shared.map((sig) => renderSigRow(sig, isAdmin))}
              </Stack>
            </Stack>
          )}

          {local.length > 0 && (
            <Stack gap="xs">
              {(personal.length > 0 || shared.length > 0) && (
                <Alert
                  color="blue"
                  title={translate("saved.tempStorageTitle", "Browser storage")}
                >
                  <Text size="xs">
                    {translate(
                      "saved.tempStorageDescription",
                      "Stored locally in this browser only.",
                    )}
                  </Text>
                </Alert>
              )}
              <Stack gap={6} style={{ maxHeight: 320, overflowY: "auto" }}>
                {local.map((sig) => renderSigRow(sig, true))}
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default SavedSignaturesSection;
