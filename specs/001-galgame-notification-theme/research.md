# Research: Galgame Notification Theme

## Decision 1: Reuse the Existing Renderer Contract

- **Decision**: Add a sibling renderer selected by the existing allowlist.
- **Rationale**: The core already owns normalization, truncation, avatar choice, theme validation, and PNG invocation. This preserves the constitution boundary and minimizes risk.
- **Alternatives considered**: Branch inside `eva.ps1` was rejected because it would couple unrelated visual systems; duplicating the JavaScript handler was rejected because it would duplicate semantics and delivery logic.

## Decision 2: Render with Local System.Drawing

- **Decision**: Use the same offline Windows drawing stack as EVA.
- **Rationale**: It is already available, supports gradients, clipping, curves, text, and PNG output, and adds no dependency.
- **Alternatives considered**: Browser rendering and new image libraries were rejected because they add runtime/dependency surface without improving the approved static layout.

## Decision 3: Preserve Original Avatar Pixels

- **Decision**: Load the `avatarPath` supplied by the core and scale it into a circular frame without regeneration.
- **Rationale**: This keeps production output aligned with the approved preview and status-specific avatar selection.
- **Alternatives considered**: Generated or redrawn character art was rejected because it cannot guarantee final-output fidelity.

## Decision 4: Treat Galgame Controls as Decoration

- **Decision**: Draw seven enlarged, evenly distributed visual-novel controls as one footer line in the static PNG; omit project, quick-save, and quick-load labels from the footer.
- **Rationale**: Discord image attachments are not interactive; the controls communicate style only.
- **Alternatives considered**: Discord buttons were rejected as a separate behavioral feature outside the approved scope.
