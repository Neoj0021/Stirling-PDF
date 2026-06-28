import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Collapse,
  Divider,
  Flex,
  Group,
  List,
  Loader,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import FontDownloadIcon from "@mui/icons-material/FontDownload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import { PdfJsonDocument } from "@app/tools/pdfTextEditor/pdfTextEditorTypes";
import {
  canRenderWithFont,
  fetchInstalledFonts,
  FONTS_UPDATED_EVENT,
  injectFontFaceRules,
  installFontOnServer,
  invalidateFontCache,
  notifyFontsUpdated,
  pickLatinWoff2Url,
  restorePersistedFonts,
} from "@app/tools/pdfTextEditor/fontStorage";
import {
  analyzeDocumentFonts,
  DocumentFontAnalysis,
  FontAnalysis,
  getFontStatusColor,
  getFontStatusDescription,
  normalizeFontFamilyKey,
} from "@app/tools/pdfTextEditor/fontAnalysis";
import LocalIcon from "@app/components/shared/LocalIcon";
import { Tooltip as CustomTooltip } from "@app/components/shared/Tooltip";

interface FontStatusPanelProps {
  document: PdfJsonDocument | null;
  pageIndex?: number;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const FontStatusBadge = ({ analysis }: { analysis: FontAnalysis }) => {
  const color = getFontStatusColor(analysis.status);
  const description = getFontStatusDescription(analysis.status);

  const icon = useMemo(() => {
    switch (analysis.status) {
      case "perfect":
        return <CheckCircleIcon sx={{ fontSize: 14 }} />;
      case "embedded-subset":
        return <InfoIcon sx={{ fontSize: 14 }} />;
      case "system-fallback":
        return <WarningIcon sx={{ fontSize: 14 }} />;
      case "missing":
        return <ErrorIcon sx={{ fontSize: 14 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 14 }} />;
    }
  }, [analysis.status]);

  return (
    <Tooltip label={description} position="top" withArrow>
      <Badge
        size="xs"
        color={color}
        variant="light"
        leftSection={icon}
        style={{ cursor: "help" }}
      >
        {analysis.status.replace("-", " ")}
      </Badge>
    </Tooltip>
  );
};

/** Parse a PDF font name into a Google Fonts–compatible family + variant. */
function parseFontVariant(baseName: string): { family: string; weight: string; style: string } {
  const name = baseName.replace(/^[A-Z]{6}\+/, "");
  const parts = name.split(/[-_]/);
  if (parts.length === 1) return { family: parts[0], weight: "400", style: "normal" };

  const weightMap: Record<string, string> = {
    thin: "100", extralight: "200", ultralight: "200", light: "300",
    medium: "500", semibold: "600", demibold: "600",
    extrabold: "800", ultrabold: "800", black: "900", heavy: "900", bold: "700",
  };
  const compoundMap: Record<string, { weight: string; style: string }> = {
    bolditalic: { weight: "700", style: "italic" },
    lightitalic: { weight: "300", style: "italic" },
    mediumitalic: { weight: "500", style: "italic" },
    semibolditalic: { weight: "600", style: "italic" },
    extrabolditalic: { weight: "800", style: "italic" },
    blackitalic: { weight: "900", style: "italic" },
  };

  const familyParts: string[] = [parts[0]];
  let weight = "400";
  let style = "normal";

  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i].toLowerCase();
    if (compoundMap[seg]) {
      weight = compoundMap[seg].weight;
      style = compoundMap[seg].style;
    } else if (weightMap[seg]) {
      weight = weightMap[seg];
    } else if (seg === "italic") {
      style = "italic";
    } else if (seg === "oblique") {
      style = "oblique";
    } else if (seg !== "regular" && seg !== "normal") {
      familyParts.push(parts[i]);
    }
  }
  return { family: familyParts.join(" "), weight, style };
}

/**
 * Download the correct (basic-Latin) subset from Google Fonts, install it on the
 * server, register it in document.fonts, then verify it actually renders.
 * Returns true only if the font is genuinely usable afterwards.
 */
async function downloadAndInstallFont(baseName: string): Promise<boolean> {
  const { family, weight, style } = parseFontVariant(baseName);
  const ital = style === "italic" ? "1" : "0";

  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
    `:ital,wght@${ital},${weight}&display=swap`;

  const cssResp = await fetch(cssUrl);
  if (!cssResp.ok)
    throw new Error(`"${family}" not found on Google Fonts (${cssResp.status})`);

  const css = await cssResp.text();
  const woff2Url = pickLatinWoff2Url(css);
  if (!woff2Url) throw new Error("No Latin woff2 URL in Google Fonts response");

  const fontResp = await fetch(woff2Url);
  if (!fontResp.ok) throw new Error("Failed to download font file");

  const buffer = await fontResp.arrayBuffer();

  // Save permanently to the server (customFiles/static/fonts/)
  const installed = await installFontOnServer(buffer, family, weight, style);

  // Register immediately in this session from the freshly downloaded bytes
  const face = new FontFace(family, buffer, { weight, style });
  await face.load();
  document.fonts.add(face);

  // Bust cache and refresh the injected <style> block with all server fonts
  invalidateFontCache();
  injectFontFaceRules([installed, ...(await fetchInstalledFonts(true))]);

  // Honest confirmation: prove the glyphs actually render
  const usable = await canRenderWithFont(family, weight, style);

  // Broadcast AFTER the font is loaded so the validation panel and the editor
  // canvas both auto re-validate (Missing → Perfect) without a manual reload.
  await notifyFontsUpdated();

  return usable;
}

// Button-only states. Whether the font actually works is reflected by the real
// analysis status (PERFECT once it renders), not by a separate badge here.
type DownloadState = "idle" | "downloading" | "unusable" | "error";

const FontDetailItem = ({ analysis }: { analysis: FontAnalysis }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadState("downloading");
    setDownloadError("");
    try {
      const usable = await downloadAndInstallFont(analysis.baseName);
      // On success the parent re-validates and the status flips to PERFECT,
      // hiding this box. If it still can't render, surface that here.
      setDownloadState(usable ? "idle" : "unusable");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
      setDownloadState("error");
    }
  };

  return (
    <Paper
      withBorder
      px="sm"
      py="md"
      style={{ cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}
    >
      <Stack gap={4}>
        <Flex align="center" justify="space-between" wrap="nowrap">
          <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <FontDownloadIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            <CustomTooltip
              sidebarTooltip={false}
              content={analysis.baseName}
              position="top"
            >
              <Text
                size="xs"
                fw={500}
                lineClamp={1}
                style={{ flex: 1, minWidth: 0 }}
              >
                {analysis.baseName}
              </Text>
            </CustomTooltip>
            {analysis.isSubset && (
              <Badge
                size="xs"
                color="gray"
                variant="outline"
                style={{ flexShrink: 0 }}
              >
                subset
              </Badge>
            )}
          </Group>
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <FontStatusBadge analysis={analysis} />
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </Group>
        </Flex>

        <Collapse in={expanded}>
          <Stack gap={4} mt={4}>
            {/* Font Details */}
            <Box>
              <Text size="xs" c="dimmed" mb={2}>
                {t("pdfTextEditor.fontAnalysis.details", "Font Details")}:
              </Text>
              <Stack gap={2}>
                <Group gap={4}>
                  <Text size="xs" c="dimmed">
                    {t("pdfTextEditor.fontAnalysis.embedded", "Embedded")}:
                  </Text>
                  <Code style={{ fontSize: "0.65rem", padding: "0 4px" }}>
                    {analysis.embedded ? "Yes" : "No"}
                  </Code>
                </Group>
                {analysis.subtype && (
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">
                      {t("pdfTextEditor.fontAnalysis.type", "Type")}:
                    </Text>
                    <Code style={{ fontSize: "0.65rem", padding: "0 4px" }}>
                      {analysis.subtype}
                    </Code>
                  </Group>
                )}
                {analysis.webFormat && (
                  <Group gap={4}>
                    <Text size="xs" c="dimmed">
                      {t("pdfTextEditor.fontAnalysis.webFormat", "Web Format")}:
                    </Text>
                    <Code style={{ fontSize: "0.65rem", padding: "0 4px" }}>
                      {analysis.webFormat}
                    </Code>
                  </Group>
                )}
              </Stack>
            </Box>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <Box>
                <Text size="xs" c="orange" fw={500}>
                  {t("pdfTextEditor.fontAnalysis.warnings", "Warnings")}:
                </Text>
                <List size="xs" spacing={2} withPadding>
                  {analysis.warnings.map((warning, index) => (
                    <List.Item key={index}>
                      <Text size="xs">{warning}</Text>
                    </List.Item>
                  ))}
                </List>
              </Box>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <Box>
                <Text size="xs" c="blue" fw={500}>
                  {t("pdfTextEditor.fontAnalysis.suggestions", "Notes")}:
                </Text>
                <List size="xs" spacing={2} withPadding>
                  {analysis.suggestions.map((suggestion, index) => (
                    <List.Item key={index}>
                      <Text size="xs">{suggestion}</Text>
                    </List.Item>
                  ))}
                </List>
              </Box>
            )}

            {/* Download + install for missing fonts */}
            {analysis.status === "missing" && (
              <Box
                mt={4}
                p="xs"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  borderRadius: 6,
                  border: "1px solid rgba(239,68,68,0.18)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {downloadState === "downloading" ? (
                  <Group gap={6}>
                    <Loader size="xs" color="red" />
                    <Text size="xs" c="dimmed">
                      {t("pdfTextEditor.fontAnalysis.downloading", "Downloading font…")}
                    </Text>
                  </Group>
                ) : (
                  <Stack gap={4}>
                    {downloadState === "unusable" && (
                      <Text size="xs" c="orange">
                        {t(
                          "pdfTextEditor.fontAnalysis.unusable",
                          "Downloaded, but it still can't render this text. The font may not be on Google Fonts.",
                        )}
                      </Text>
                    )}
                    {downloadState === "error" && (
                      <Text size="xs" c="red">{downloadError}</Text>
                    )}
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<FontDownloadIcon sx={{ fontSize: 14 }} />}
                      onClick={handleDownload}
                    >
                      {downloadState === "error" || downloadState === "unusable"
                        ? t("pdfTextEditor.fontAnalysis.retry", "Retry download")
                        : t("pdfTextEditor.fontAnalysis.downloadInstall", "Download & install font")}
                    </Button>
                  </Stack>
                )}
              </Box>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};

const FontStatusPanel: React.FC<FontStatusPanelProps> = ({
  document,
  pageIndex,
  isCollapsed = false,
  onCollapsedChange,
}) => {
  const { t } = useTranslation();

  // Normalized family keys of missing fonts that have a locally-installed match
  // verified to actually render. Feeds the analysis so they report as PERFECT.
  const [usableKeys, setUsableKeys] = useState<Set<string>>(new Set());

  // Restore installed fonts, then verify which missing fonts now genuinely
  // render. Re-runs whenever the document, page, or installed font set changes.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      await restorePersistedFonts().catch(() => {});
      await window.document.fonts.ready.catch(() => {});
      const raw = analyzeDocumentFonts(document, pageIndex);
      const missing = raw.fonts.filter((f) => f.status === "missing");
      const keys = new Set<string>();
      await Promise.all(
        missing.map(async (f) => {
          const { family, weight, style } = parseFontVariant(f.baseName);
          if (await canRenderWithFont(family, weight, style)) {
            keys.add(normalizeFontFamilyKey(f.baseName));
          }
        }),
      );
      if (!cancelled) setUsableKeys(keys);
    };

    verify();
    const onUpdate = () => verify();
    window.addEventListener(FONTS_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(FONTS_UPDATED_EVENT, onUpdate);
    };
  }, [document, pageIndex]);

  const fontAnalysis: DocumentFontAnalysis = useMemo(
    () => analyzeDocumentFonts(document, pageIndex, usableKeys),
    [document, pageIndex, usableKeys],
  );

  const { canReproducePerfectly, hasWarnings, summary, fonts } = fontAnalysis;

  // Early return AFTER all hooks are declared
  if (!document || fontAnalysis.fonts.length === 0) {
    return null;
  }

  const statusColor = canReproducePerfectly
    ? "green"
    : hasWarnings
      ? "yellow"
      : "blue";

  const pageLabel =
    pageIndex !== undefined
      ? t("pdfTextEditor.fontAnalysis.currentPageFonts", "Fonts on this page")
      : t("pdfTextEditor.fontAnalysis.allFonts", "All fonts");

  return (
    <div>
      <div
        style={{
          padding: "0.5rem",
          opacity: isCollapsed ? 0.8 : 1,
          color: isCollapsed ? "var(--mantine-color-dimmed)" : "inherit",
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
      >
        {/* Header - matches ToolStep style */}
        <Flex
          align="center"
          justify="space-between"
          mb={isCollapsed ? 0 : "sm"}
          style={{ cursor: "pointer" }}
          onClick={() => onCollapsedChange?.(!isCollapsed)}
        >
          <Flex align="center" gap="xs">
            <Text fw={500} size="sm">
              {pageLabel}
            </Text>
            <Badge size="xs" color={statusColor} variant="dot">
              {fonts.length}
            </Badge>
          </Flex>

          {isCollapsed ? (
            <LocalIcon
              icon="chevron-right-rounded"
              width="1.2rem"
              height="1.2rem"
              style={{
                color: "var(--mantine-color-dimmed)",
              }}
            />
          ) : (
            <LocalIcon
              icon="expand-more-rounded"
              width="1.2rem"
              height="1.2rem"
              style={{
                color: "var(--mantine-color-dimmed)",
              }}
            />
          )}
        </Flex>

        {/* Content */}
        {!isCollapsed && (
          <Stack gap="xs" pl="sm">
            {/* Overall Status Message */}
            <Text size="xs" c="dimmed">
              {canReproducePerfectly
                ? t(
                    "pdfTextEditor.fontAnalysis.perfectMessage",
                    "All fonts can be reproduced perfectly.",
                  )
                : hasWarnings
                  ? t(
                      "pdfTextEditor.fontAnalysis.warningMessage",
                      "Some fonts may not render correctly.",
                    )
                  : t(
                      "pdfTextEditor.fontAnalysis.infoMessage",
                      "Font reproduction information available.",
                    )}
            </Text>

            {/* Summary Statistics */}
            <Group gap={4} wrap="wrap">
              {summary.perfect > 0 && (
                <Badge
                  size="xs"
                  color="green"
                  variant="light"
                  leftSection={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                >
                  {summary.perfect}{" "}
                  {t("pdfTextEditor.fontAnalysis.perfect", "perfect")}
                </Badge>
              )}
              {summary.embeddedSubset > 0 && (
                <Badge
                  size="xs"
                  color="blue"
                  variant="light"
                  leftSection={<InfoIcon sx={{ fontSize: 12 }} />}
                >
                  {summary.embeddedSubset}{" "}
                  {t("pdfTextEditor.fontAnalysis.subset", "subset")}
                </Badge>
              )}
              {summary.systemFallback > 0 && (
                <Badge
                  size="xs"
                  color="yellow"
                  variant="light"
                  leftSection={<WarningIcon sx={{ fontSize: 12 }} />}
                >
                  {summary.systemFallback}{" "}
                  {t("pdfTextEditor.fontAnalysis.fallback", "fallback")}
                </Badge>
              )}
              {summary.missing > 0 && (
                <Badge
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<ErrorIcon sx={{ fontSize: 12 }} />}
                >
                  {summary.missing}{" "}
                  {t("pdfTextEditor.fontAnalysis.missing", "missing")}
                </Badge>
              )}
            </Group>

            {/* Font List */}
            <Stack gap={4} mt="xs">
              {fonts.map((font, index) => (
                <FontDetailItem
                  key={`${font.fontId}-${index}`}
                  analysis={font}
                />
              ))}
            </Stack>
          </Stack>
        )}
      </div>
      <Divider
        style={{ color: "#E2E8F0", marginLeft: "1rem", marginRight: "-0.5rem" }}
      />
    </div>
  );
};

export default FontStatusPanel;
