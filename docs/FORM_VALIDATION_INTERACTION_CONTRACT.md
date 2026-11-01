# Servora Form Validation Interaction Contract

Date: 2026-09-19

This contract applies to interactive UI forms across Servora.

## Visibility rules

- Opening or resetting a form must not show client-side validation errors.
- Focusing a field alone must not show an error.
- A required field left empty shows its required error after blur/touch.
- An optional empty field remains valid unless another business rule requires a value.
- An invalid non-empty value shows its validation error after blur/touch.
- After a field has been touched or a submit has been attempted, local validation re-runs while the user edits so stale messages disappear as soon as the value becomes valid.
- A submit attempt reveals all applicable client-side errors and must not send an invalid request.
- Server field errors are visible immediately because they result from an explicit submission.
- Editing a field clears only that field's stale server error. Unrelated field and form-level server feedback remains until a new submission/reset replaces it.
- Closing/reopening or explicitly resetting a modal/form clears client visibility state and stale API errors.
- Dynamically adding a row/choice does not immediately show client errors for untouched fields in that new row.

## React Hook Form baseline

Use:

```ts
mode: "onTouched",
reValidateMode: "onChange",
```

Do not use `onChange` as the initial validation mode for normal data-entry forms.

## Handwritten/local validation baseline

Validation may be calculated eagerly for validity/submit-disable decisions, but rendering must be interaction-gated. Use `useLocalFormApiErrors` / `useFormValidationVisibility` rather than rendering raw local validation maps directly.

## Server-error lifecycle

- `clearFieldError(field)` clears only the supplied server field error.
- `clearErrors()` is appropriate for a new explicit submission attempt when the prior server response is being superseded.
- `resetValidation()` is appropriate when closing/reopening/resetting a form and clears API errors plus touched/submitted visibility state.

## Required-field indicators

- Every user-editable field that is required by the active schema/business rule must show a visible `*` beside its label.
- Optional fields must not show `*`. Where ambiguity is likely, the label should explicitly say `(optional)`.
- Conditional requirements show `*` only while the requirement is active (for example, Branch for a branch-scoped staff role or a promotion target for a targeted promotion).
- Dynamic/table-style editors must provide visible starred column headings for required columns and accessible `aria-label`/`aria-required` semantics for each row control.
- The star is informational only. It must not make an untouched field look invalid or display an error.
- Servora uses schema/RHF validation for error timing; required markers expose `aria-required` but should not introduce a separate browser-native validation lifecycle that bypasses Servora error rendering.
