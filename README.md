# Survey Tools Workspace

An offline, browser-based workspace that keeps traverse drafting, monument evidence, point files, navigation aids, and equipment records together in one HTML file. Data stays in your browser's local storage—no build steps or servers are required.

## Requirements
- Modern desktop browser (Chrome, Edge, or Firefox) with local storage enabled.
- Allow file downloads/uploads for imports, exports, and backups.
- Optional: grant location access when prompted so GPS features work in Navigation and Equipment Setup.

## Getting Started
1. **Open the app** – Double-click `index.html` or open it through your browser's File menu.
2. **Create or load a project** – Use **Create Project** or the project dropdown to start a project. Projects save automatically. Use **Import** to restore a `.json` export.
3. **Move between tools** – The springboard tiles open Traverse Builder, Points, Leveling, Evidence, Equipment, Navigation, and Settings while staying on the same dataset.
4. **Back up or clear data** – Export the current project, all projects, or the entire app dataset. Delete projects, records, or point files if you need to start fresh.

## Tool Overview

### Project & Records
- **Projects and record sets**
  - Create, load, and delete named projects with dropdown controls for quick switching.【F:index.html†L720-L808】【F:index.html†L1010-L1053】
  - Add record sets with starting point details and per-record canvases for at-a-glance previews, whether you are drafting a corner perpetuation filing, capturing monument field notes, or running a record of survey traverse.【F:index.html†L809-L970】【F:index.html†L1172-L1218】
- **Import/Export**
   - Export the current project or all projects to JSON and import them later; filenames include sanitized project names where appropriate.【F:index.html†L833-L910】

## Optional Sync + Static Server
The app now ships with a lightweight Node-based server that can both host the static app files and reconcile offline work when a network connection is available.

1. **Start the server**
   ```bash
   node server.js
   ```
   The server listens on `http://localhost:3000` by default, serves `index.html` and related assets, and stores synchronized data in `data/projects.json`.
2. **Endpoints**
   - `GET /api/health` – basic status check.
   - `GET /api/projects` – returns all stored projects and evidence.
   - `POST /api/sync` – accepts a payload of `{ projects, evidence }`, merges by per-record `version`, `createdAt`, and `updatedAt` fields, and returns the reconciled dataset.
3. **Conflict handling**
   - Every project entity (project, record, call, points, evidence, and equipment logs) now carries `createdAt`, `updatedAt`, and `version` metadata.
   - When the same item exists on two clients, the server applies changes in version order and prefers the newest `updatedAt` timestamp when versions match.
   - Non-conflicting edits from different users are merged automatically by item ID.

The browser UI will automatically attempt to sync when it detects an online connection, but it continues to work fully offline.

### Traverse Builder
- **Traverse authoring**
  - Define start point coordinates, elevations, backsight azimuths, basis of bearing, and first distance to seed each traverse.【F:index.html†L832-L905】
  - Add, edit, and reorder calls with live bearing arrows and linked start-from options across records.【F:index.html†L906-L1108】【F:index.html†L1013-L1032】
- **Visualization and commands**
  - Render per-record previews plus a project overview canvas that scales and colors each traverse.【F:index.html†L1172-L1218】【F:index.html†L1554-L1699】
  - Generate Carlson command blocks for creating points, occupying points, drawing points, and drawing lines, with copy-ready text for CAD workflows.【F:index.html†L760-L828】【F:index.html†L1869-L1936】

### Evidence Logger
- **Linked evidence capture**
  - Select a record and traverse point to attach evidence directly to generated geometry—useful for monument notes, corner perpetuation narratives, or general field ties.【F:index.html†L958-L985】【F:index.html†L1800-L1817】
- **Monument details and condition**
  - Track evidence type and condition with structured dropdowns for consistent reporting.【F:index.html†L986-L1028】
- **Consistent styling**
  - Evidence inputs, dropdowns, and record selectors now mirror Traverse Builder styling with thumbnail previews for each record.【F:index.html†L960-L987】【F:index.html†L1010-L1037】
- **Notes and witness ties**
  - Record narrative notes plus multiple tie distances, bearings, and descriptions per evidence point.【F:index.html†L1029-L1056】【F:index.html†L1746-L1762】
- **Media and filings**
  - Attach multiple photos to each tie and export every corner as a Corner Perpetuation Filing text package alongside JSON backups.【F:index.html†L1038-L1061】【F:js/controllers/AppController.js†L948-L1043】【F:js/controllers/AppController.js†L1045-L1083】
- **Media and location**
  - Attach optional photos and capture GPS coordinates when available to enrich field documentation.【F:index.html†L1058-L1084】
- **Project evidence dashboard**
  - View a summary of all evidence entries for the active project with quick access to each item.【F:index.html†L1086-L1103】【F:index.html†L1784-L1799】

### Equipment Setup Log
- **Base station tracking**
  - Record setup and tear down date/time, base station height, reference point, and crew member for each session.【F:index.html†L1064-L1113】
- **GPS capture**
  - Capture the logging device's GPS location with accuracy details to help relocate the base station later.【F:index.html†L1115-L1137】
- **Per-project log**
  - Review all saved equipment entries for the active project in a dedicated log view.【F:index.html†L1139-L1146】

## Tips
- Use clear project and record names so dropdowns and previews stay readable.
- Traverse Builder, Evidence Records, Point Files, Leveling, and Navigation all share the same project context.
- Export projects or the entire app regularly so you have portable backups of field data, photos, and commands.
