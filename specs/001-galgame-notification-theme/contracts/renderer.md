# Renderer Contract: `galgame`

## Invocation

The shared handler invokes the renderer with:

- `-InputPath <absolute JSON path>`
- `-OutputPath <absolute PNG path>`

## Input

UTF-8 JSON containing exactly the shared card data documented in [data-model.md](../data-model.md).

## Output

- A valid PNG at `OutputPath`
- Canvas size: 1000×1400
- Failure: non-zero process exit with a concise error message

## Invariants

- No webhook or Discord delivery logic
- No event parsing or notification status inference
- No AI or network calls
- No mutation of the input JSON or source avatar
- The supplied avatar is the only character image source
