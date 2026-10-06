# Robot headquarters — parked prototype

The robots are saved here for later. The active app uses its original Home,
page layouts and dock navigation. This folder is outside `src` and `public`,
so it is neither imported by the app nor included in Hosting deployments.

## Saved work

- `scene/`: the office, six robots, model, styles, local Three.js dependencies
  and upstream license. Desktop keeps the supplied diagonal view; mobile keeps
  the earlier front-facing view, before the rejected lower-camera experiment.
- `integration/`: the working Home component, department configuration, Home-only
  shell integration, routing snapshots, hosting policy and regression checks.
  Saved tests use a `.txt` suffix so ordinary test discovery cannot run the
  disconnected integration; the patch restores their original filenames.
- `integration/reconnect.patch`: the exact proposed app wiring, captured against
  app commit `d3ff19c3e891fa2f5a9e5ac8baf45bf2916bb3ee` before parking this work.

The Buddies navigate to existing pages. They do not perform AI tasks. Book, Buy,
Messages, Analytics, Office and E-Business cover the existing tools, with live
request, order and unread-message badges. The previous dashboard stays available
as Business overview in the proposed Analytics department.

## Reconnecting later

Review the patch against the current app before applying it; app pages may have
changed. Keep existing page layouts and use the headquarters only for Home.
Copy `scene/` to `public/hq/`, then merge the saved integration into the matching
app paths. The scene requires its parent to provide `bookbuy:hq-config`; opening
its HTML alone deliberately does not simulate app navigation.

The saved bridge accepts only the direct parent/frame at the same origin and
known page IDs. Its fallback page list works without WebGL. The hosting changes
allow same-origin framing for `/hq/` while other pages retain framing protection.
These hosting exceptions are saved here and are absent from the active app.

Before publishing a future integration, rerun the saved checks in the main app,
review mobile framing, keyboard focus, graphics-failure recovery and live badges,
and verify the deployed scene assets and response headers.
