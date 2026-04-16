# Reference Launch Video MVP

This repo now includes a pragmatic `ao launch-video` flow for a reference-driven launch-style video pipeline. The implementation persists analysis outputs so repeated loops can reuse scenes, keyframes, transcript state, blueprint seeds, blueprint output, judge output, and render placeholders without redoing the expensive parts.

## Artifact Tree

Artifacts are written under:

```text
/Users/suraj.markupgmail.com/Desktop/video-hackathon-mvp/<video-name>--<fingerprint>/
  reference/
    reference.json
  assets/
    README.md
  analysis/
    metadata.json
    scenes.json
    transcript.json
    audio-events.json
    style.json
    motion.json
    editorial.json
    blueprint-seed.json
    notes.md
    keyframes/*.jpg
  blueprints/
    blueprint-v1.json
  judge/
    judge-v1.json
    revision-v1.json
  renders/
    preview-v1.md
```

`preview-v1.md` is the explicit placeholder handoff for the later `preview-v1.mp4`.

## Blueprint Schema V1

`blueprint-v1.json` uses these top-level keys:

```json
{
  "project": {},
  "reference": {},
  "assets": {},
  "style": {},
  "audio": {},
  "performance": {},
  "editorial": {},
  "scenes": [],
  "judge": {}
}
```

The launch family roles are:

- `hook`
- `before`
- `after`
- `value-beats`
- `outro`

## Notes

- Analysis caches are keyed to reference path, size, and mtime.
- The Desktop folder is the primary user-facing output surface for this MVP.
- Scene detection is intentionally heuristic in this MVP so the artifact contract is visible now.
- Transcript generation falls back to a clear stub when no transcription backend is available.
- On macOS, keyframe extraction uses AVFoundation via a bundled Swift helper when `ffmpeg` is unavailable.
