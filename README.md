# @wengine-ai/pi-plan-tool

Task-checklist discipline for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent) — a session-only `desktop_update_plan` tool plus the checklist guideline for systemPrompt injection.

Split out of [pi-desktop](https://github.com/xiaoliu10/pi-desktop)'s built-in `desktop-policy` extension so that **CLI and Desktop share one implementation** of task discipline (see `docs/design/desktop-policy-module-audit.md` in pi-desktop).

## What it does

- Registers a `desktop_update_plan` tool: the agent maintains a 3–10 step checklist (`pending` / `in_progress` / `completed`) as session metadata. **It never executes commands and never modifies project files.**
- Exports `PLAN_CHECKLIST_GUIDELINE`: the exact instruction text the host injects into the system prompt (mandatory for non-trivial tasks, one `in_progress` at a time, mark completed only when verified).

## Install

```bash
pi install npm:@wengine-ai/pi-plan-tool
```

or add to your pi settings:

```json
{ "packages": ["npm:@wengine-ai/pi-plan-tool"] }
```

## Usage

The agent calls the tool automatically once the package is loaded (the guideline drives it). Nothing else to configure.

For hosts that render progress (e.g. PI Desktop's status panel), the tool's `details.plan` carries the structured checklist; the text content is a JSON mirror of it.

## Compatibility notes

- The tool name `desktop_update_plan` is deliberate: it is already recorded in existing session histories (131 calls in one real session). Renaming it would break plan rendering in those sessions.
- An empty `plan` array is a valid explicit "clear the checklist" (same semantics as the built-in version).

## Development

```bash
node --test test.mjs   # 7 tests, no dependencies
```

## License

Apache-2.0
