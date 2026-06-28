/**
 * Desktop-only footer slot at the bottom of the tool list.
 *
 * The "Sign in to unlock all tools" prompt has been removed because login is
 * disabled in this build. Kept as a no-op so the tool-picker extension slot
 * still resolves; restore the sign-in UI here if authentication is re-enabled.
 */
export function ToolPickerFooterExtensions() {
  return null;
}
