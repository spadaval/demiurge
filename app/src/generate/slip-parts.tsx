/**
 * The pieces every request slip is made of, prose and agent alike: a part
 * that folds to one line (its name and its size or state) between hairlines,
 * editable or read-only, and the "This session" / "Profile default" choice
 * an agent slip's prompt and sampler edits take.
 */

import { type ReactNode, useId } from "react";
import type { EditScope } from "~/agent/next-turn";

export const count = (n: number) => n.toLocaleString("en");

/**
 * One editable part of a request, folded to a line with its size until the
 * writer opens it: the exact text is there to read and edit, not in the way.
 * `state` replaces the fold line's "edited" mark when the edit has more to
 * say (its scope); `children` follow the field.
 */
export function Part({
  label,
  kind,
  value,
  original,
  onChange,
  code = false,
  state,
  children,
}: {
  label: string;
  kind: string;
  value: string;
  original: string;
  onChange: (value: string) => void;
  code?: boolean;
  state?: string;
  children?: ReactNode;
}) {
  const edited = value !== original;
  return (
    <details className="context-viewer-part" data-role={kind}>
      <summary>
        <span className="context-viewer-part-label">{label}</span>
        <span className="context-viewer-part-size">
          {edited ? `${state ?? "edited"} · ` : ""}
          {count(value.length)} characters
        </span>
      </summary>
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={Math.min(20, value.split("\n").length + 1)}
        spellCheck={!code}
        className={code ? "context-viewer-code" : undefined}
      />
      {children}
    </details>
  );
}

/**
 * A part as it was sent: the text in its setting, between hairlines, with
 * no field border. Its fold line says "as sent" unless `state` says more.
 */
export function SentPart({
  label,
  kind,
  value,
  code = false,
  state = "as sent",
  children,
}: {
  label: string;
  kind: string;
  value: string;
  code?: boolean;
  state?: string;
  children?: ReactNode;
}) {
  return (
    <details className="context-viewer-part" data-role={kind}>
      <summary>
        <span className="context-viewer-part-label">{label}</span>
        <span className="context-viewer-part-size">
          {state} · {count(value.length)} characters
        </span>
      </summary>
      {children}
      <div
        className={`context-viewer-sent${code ? " context-viewer-code" : ""}`}
        role="document"
        aria-label={label}
      >
        {value}
      </div>
    </details>
  );
}

const SCOPES: readonly { scope: EditScope; label: string }[] = [
  { scope: "session", label: "This session" },
  { scope: "default", label: "Profile default" },
];

export const scopeState = (scope: EditScope) =>
  scope === "session" ? "edited · this session" : "edited · profile default";

/**
 * Who an edit is for, in the view switch's form: "This session" or
 * "Profile default". With the default chosen, `reach` says what it changes.
 */
export function ScopeChoice({
  label,
  scope,
  reach,
  onChange,
}: {
  label: string;
  scope: EditScope;
  reach: string;
  onChange: (scope: EditScope) => void;
}) {
  const name = useId();
  return (
    <>
      <fieldset className="slip-scope">
        <legend className="visually-hidden">{label}</legend>
        <div className="settings-switch">
          {SCOPES.map((choice) => (
            <label key={choice.scope} data-checked={scope === choice.scope}>
              <input
                type="radio"
                name={name}
                value={choice.scope}
                checked={scope === choice.scope}
                onChange={() => onChange(choice.scope)}
              />
              {choice.label}
            </label>
          ))}
        </div>
      </fieldset>
      {scope === "default" ? <p className="slip-reach">{reach}</p> : null}
    </>
  );
}
