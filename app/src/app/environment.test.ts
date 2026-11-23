import { expect, test } from "bun:test";
import {
  describeCommandError,
  describeReadOnly,
  describeSaveStatus,
} from "./environment";

const refusal = {
  kind: "read_only",
  operation: "save",
  collection: "documents",
  id: "doc1",
} as const;

test("a read-only refusal has its own message, never 'missing' or a retry", () => {
  const status = describeSaveStatus({ kind: "failed", error: refusal });
  expect(status).toBe(
    "Not saved: This tab is read-only because Demiurge is open in another tab.",
  );
  expect(status).not.toContain("missing");
  expect(status).not.toContain("Retrying");
  expect(describeCommandError(refusal)).toBe(
    "This tab is read-only because Demiurge is open in another tab.",
  );
});

test("missing records and failures keep their own messages", () => {
  expect(
    describeSaveStatus({
      kind: "failed",
      error: { kind: "not_found", collection: "documents", id: "doc1" },
    }),
  ).toBe("Not saved: That document no longer exists (doc1). Retrying.");
  expect(
    describeSaveStatus({
      kind: "failed",
      error: {
        kind: "failure",
        operation: "save",
        message: "Quota exceeded",
        cause: null,
      },
    }),
  ).toBe("Not saved: Quota exceeded. Retrying.");
});

test("a document read-only for want of a snapshot says why and what to do", () => {
  const reason = {
    kind: "no_snapshot",
    error: {
      kind: "failure",
      operation: "save",
      collection: "snapshots",
      message: "QuotaExceededError",
      cause: null,
    },
  } as const;
  const text =
    "This document is read-only: Demiurge couldn't save a copy of it before editing. QuotaExceededError. Free up disk space, then close and reopen it.";
  expect(describeReadOnly(reason)).toBe(text);
  expect(describeSaveStatus({ kind: "read_only", reason })).toBe(text);
  expect(
    describeSaveStatus({ kind: "read_only", reason: { kind: "other_tab" } }),
  ).toBe("Read-only");
});
