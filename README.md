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
- **Springboard** – Shows project name, contact phone/email, address links, TRS, and the survey scope description. Edit project metadata and jump into any mini app from the tiled launcher.【F:index.html†L75-L220】
- **Traverse Builder** – Create records of survey traverses with starting coordinates, backsight azimuth, bearings, and distances. Generate Carlson commands, reorder calls, preview canvases, and share traverse geometry with other tools.【F:index.html†L306-L520】【F:index.html†L1172-L1218】
- **Point File Manager** – Import CSVs, generate point files from traverses, add or edit rows by hand, switch between named point files, and download TXT outputs for data collectors.【F:index.html†L486-L571】
- **Field Level Book** – Track differential leveling runs with backsight/foresight entries, compute running sums and closure error, and export a PDF of the run.【F:index.html†L572-L684】
- **Evidence Records** – Attach evidence to traverse points with condition, ties, photos, GPS locations, and exportable corner filings while keeping a project-wide summary.【F:index.html†L684-L839】【F:js/controllers/AppController.js†L948-L1083】
- **Equipment Setup Log** – Record setup/teardown times, base heights, reference points, crews, equipment used, work notes, and optional GPS position with a list of saved sessions per project.【F:index.html†L839-L937】
- **Navigation** – Compass and heading tools to walk stakeout targets or equipment bases, with distance, bearing, and offset readouts plus optional map preview when GPS localization is applied.【F:index.html†L938-L1127】
- **Global Settings** – Manage reusable equipment names, team members, and point codes, and download or import a single backup file covering all projects and settings.【F:index.html†L1128-L1216】
- **Help** – In-app reader that pulls instructions straight from `HELP.md` so the guide matches the version shipped with the app.【F:index.html†L1213-L1233】【F:js/controllers/AppController.js†L1413-L1487】

## Tips
- Use clear project and record names so dropdowns and previews stay readable.
- Traverse Builder, Evidence Records, Point Files, Leveling, and Navigation all share the same project context.
- Export projects or the entire app regularly so you have portable backups of field data, photos, and commands.
