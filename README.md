# Survey Tools Workspace

This offline, browser-based workspace bundles several surveying tools in one place. You can keep corner perpetuation filing drafts, monument field notes, record of survey traversals, and related evidence side by side. Everything runs locally from a single HTML file with data saved in local storage—no servers or build steps required.

## Getting Started
1. **Open the app**
   - Launch `index.html` directly in your browser (double-click the file or open it via the browser File > Open dialog). No build step is required.
2. **Create or load a project**
   - Use **+ New Project** or the project name input to start a project. Projects and their records are saved automatically in your browser.
   - To reuse previous work, choose **Import** and select a `.json` file exported from the app.
3. **Switch between tools**
   - Use the tab buttons to move between Traverse Builder and Evidence Logger while staying inside the same project and dataset.
4. **Save, export, or remove data**
   - Data saves automatically. Use **Export Project** or **Export All** for backups, or **Delete Project/Record** to remove items.

## Tool Overview

### Project & Records
- **Projects and record sets**
  - Create, load, and delete named projects with dropdown controls for quick switching.【F:index.html†L720-L808】【F:index.html†L1010-L1053】
  - Add record sets with starting point details and per-record canvases for at-a-glance previews, whether you are drafting a corner perpetuation filing, capturing monument field notes, or running a record of survey traverse.【F:index.html†L809-L970】【F:index.html†L1172-L1218】
- **Import/Export**
  - Export the current project or all projects to JSON and import them later; filenames include sanitized project names where appropriate.【F:index.html†L833-L910】

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
- Use meaningful project/record names to keep the project and Start From dropdowns readable.
- Traverse Builder and Evidence Logger share the same dataset, so you can capture evidence immediately after generating traverse points.
- Export regularly for portable backups of both traverse data and evidence attachments.
