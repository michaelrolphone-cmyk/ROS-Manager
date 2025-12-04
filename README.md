# Carlson Survey Manager

Carlson Survey Manager is a single-page, offline-ready tool for managing legal descriptions and generating Carlson commands for traverses. The app runs entirely in the browser using local storage—no server required.

## Getting Started
1. **Open the app**
   - Launch `index.html` directly in your browser (double-click the file or open it via the browser File > Open dialog). No build step is required.
2. **Create or load a project**
   - Use **+ New Project** or the project name input to start a project. Projects and their records are saved automatically in your browser.
   - To reuse previous work, choose **Import** and select a `.json` file exported from the app.
3. **Create a traverse record**
   - Enter a **Record Name**, then click **Create Record**. Each record stores a traverse with its own starting point and calls.
4. **Enter starting data**
   - Fill in **Start Point**, **Northing/Easting/Elevation**, and an optional **Backsight Azimuth**.
   - Provide the **Basis of Bearing** and **First Distance** to seed the traverse.
5. **Add calls**
   - Click **+ Add Subsequent Call** to add bearings/distances. Each row shows a live bearing arrow.
   - Records can chain together using the **Start From** dropdown, which begins a traverse where another record ends.
6. **Preview and generate commands**
   - The **Traverse Preview** canvas updates as you enter data. Use **Carlson Input Commands** cards to copy ready-made command groups for Create Point, Occupy Point, Draw Points, and Draw Lines.
7. **Save, export, or remove data**
   - Data saves automatically. Use **Export Project** or **Export All** for backups, or **Delete Project/Record** to remove items.

## Feature Overview
- **Offline, local-first app**: Runs from a static HTML file and persists data in `localStorage` with no external dependencies.【F:index.html†L842-L861】
- **Project workspace**: Create, load, and delete named projects, each containing multiple traverse records with automatic UI updates and overview canvases.【F:index.html†L1035-L1108】【F:index.html†L1112-L1132】
- **Record management**: Add named records with starting coordinates, elevation, backsight azimuth, basis of bearing, and initial distance; edit calls inline with live bearing arrows.【F:index.html†L1220-L1292】【F:index.html†L1306-L1364】
- **Linked traverses**: Chain records together using the **Start From** dropdown to begin a traverse at the end of another record, including cycle protection and preview drawing.【F:index.html†L1013-L1032】【F:index.html†L1490-L1511】
- **Traverse visualization**: Per-record mini canvases and a main **Traverse Preview** render scaled polylines with start/end markers; project overview canvases combine all records with distinct colors.【F:index.html†L1172-L1218】【F:index.html†L1554-L1620】【F:index.html†L1623-L1699】
- **Bearing parsing and guidance**: Bearings accept quadrant-style entries (e.g., `N 45°30'15"E`), with parsed angles feeding both previews and command generation; bearing arrows rotate accordingly.【F:index.html†L1372-L1421】【F:index.html†L1818-L1864】
- **Command generation**: One-click Carlson command blocks for Create Point, Occupy Point, Draw Points, and Draw Lines, with copy buttons and preview/expanded views.【F:index.html†L760-L828】【F:index.html†L1869-L1936】
- **Import/Export**: Export the current project or all projects to JSON and import them later; filenames include sanitized project names where appropriate.【F:index.html†L833-L910】
- **Responsive layout**: Mobile-specific table layouts, touch-friendly controls, and flexible cards ensure usability on smaller screens.【F:index.html†L464-L518】

## Tips
- Use meaningful project/record names to keep the project and Start From dropdowns readable.
- The app autosaves; exporting regularly provides portable backups.
- Copy Carlson command groups from the cards after generating calls to paste directly into Carlson.
