# Mobile navigation

Owner workspace on phones uses a **3-item bottom dock**. There is no top-left hamburger.

## Dock

| Control | Opens |
| --- | --- |
| **Messages** | Support inbox (`/dashboard/communications`) |
| **Home** | Overview (`/dashboard/overview`) |
| **More** | Full workspace menu as a bottom sheet |

## More menu

Tapping **More** slides up every workspace section (Home, Book, Buy, E-Business Platform, Run), including Social, E-Business Platform, Schedule, Products, and Settings.

- Backdrop tap or **X** closes the sheet
- Choosing any item navigates and closes the sheet
- On desktop, the left sidebar stays as before; the dock is hidden

## Config

Defined in `src/config/routeConfig.js` as `mobileDockItems`.
