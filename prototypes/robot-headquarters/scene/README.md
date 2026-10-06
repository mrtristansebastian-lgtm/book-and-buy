# Book & Buy headquarters scene

This isolated scene preserves the office and robot model supplied by the user.
The main application owns the departments, page names, permissions, routes and
live badges. This frame only displays that configuration and requests navigation.

All browser dependencies are local. `vendor/` contains Three.js **0.169.0**, the
matching GLTFLoader, BufferGeometryUtils and upstream MIT license. The vendored
files come from the official `three@0.169.0` npm package served by jsDelivr.
The GLB in `assets/` is the supplied robot model, with embedded geometry/materials.
No runtime CDN or external font is required.

Messages are accepted only from the direct parent window at the same origin.
The frame posts to `location.origin`, never `*`:

- `bookbuy:hq-ready`: module is listening for configuration.
- `bookbuy:hq-config`: parent supplies departments and reduced-motion preference.
- `bookbuy:hq-status`: first complete render is `ready`; graphics/load failure is `error`.
- `bookbuy:hq-open`: parent requests a known department.
- `bookbuy:hq-opened` / `bookbuy:hq-closed`: host hides/restores its navigation strip.
- `bookbuy:hq-navigate`: parent receives a configured feature ID and validates it.

The parent supplies an accessible department strip and a complete lightweight
page list when graphics are unavailable. The scene menu traps keyboard focus,
supports Escape, restores focus through the parent, scrolls on short screens,
and honours reduced motion. Hidden tabs stop requesting animation frames.
