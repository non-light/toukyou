# Tokyo Station game development

This folder is the independent game development edition. The user explicitly asked to preserve the completed original.

- Work only on this edition for future characters, dialogue, puzzles, and game features.
- Do not edit the original `/Users/noriko/Workspace/toukyoukarano` or `/Users/noriko/Documents/HP作成/tokyo-station-walk`.
- Never deploy to original Site `appgprj_6aeaa93f4ea48191b342bc4a33dcde88`.
- This edition's Site is `appgprj_6aec2c90b13c8191bb14c9c12644b58d`. Preserve `.openai/hosting.json` and run `npm run check` before publication.
- GitHub development uses `game-development`; do not push changes to the original `main` branch.
- The immutable reference is GitHub tag `tokyo-station-original-v0.6-20261105`, commit `314300f107a5674b849cd5fdb88f5aa4f0cdec1d`.
- Keep story data and game behavior in `dist/game/`, separate from station geometry/layout modules. Preserve walking, floors, gates, maps, trains, and meeting landmarks.
- Start with empty characters/puzzles until the user specifies content. Test fixtures may contain temporary content; do not ship invented samples.
