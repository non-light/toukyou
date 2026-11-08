# Tokyo Station — standalone episode 3

- This folder is a self-contained export of episode 3. Work on this episode here; the combined edition is in ../../nazotoki/.
- Keep story data and behavior in dist/game/. Do not alter station geometry, floors, gates, trains, maps or meeting landmark assets.
- Run npm run check and npm test after changes. protected-map.json contains the immutable station hashes.
- This export has no live Site identity or deployment credentials. Local build/start commands do not publish anything.
- Preserve the existing episode save key and migrate old progress when the schema changes.
- Preserve original main and the original-station tag; repository updates belong on game-development.
- Do not replace this standalone folder from a different episode or add another story entry point.
