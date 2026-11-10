"use client";

type UnsavedChangesCheck = () => boolean;

let activeUnsavedChangesCheck: UnsavedChangesCheck | null = null;

/**
 * Registers the current editor's unsaved-changes check.
 * Returns a cleanup function so stale editors cannot leave a guard behind.
 */
export function registerUnsavedChangesGuard(check: UnsavedChangesCheck) {
  activeUnsavedChangesCheck = check;

  return () => {
    if (activeUnsavedChangesCheck === check) {
      activeUnsavedChangesCheck = null;
    }
  };
}

/**
 * Returns false when the user chooses to stay on the current page.
 */
export function confirmUnsavedChanges(): boolean {
  if (!activeUnsavedChangesCheck?.()) {
    return true;
  }

  return window.confirm(
    "You have unsaved changes. Leave this page and discard them?"
  );
}
