# Survey Tools Help

This guide explains each mini app in plain language and why it matters during a typical day in the field. Everything runs inside
`index.html` and saves in your browser—no internet or extra software is needed.

## Springboard (Home)
- **What it does:** Shows the active project's name, client contact info, address, and TRS. Tiles open each mini app.
- **Why it helps:** Keeps the whole crew on the same page about the job location and scope before entering data.
- **How to use:** Click **Edit Details** to fill in client and location info. Tap **Call**, **Email**, or **Map** to contact the
client or pull up navigation. Use the large tiles to jump into Traverse Builder, Points, Leveling, Evidence, Equipment,
Navigation, Settings, or Help.

## Traverse Builder
- **What it does:** Stores traverse calls with starting coordinates, bearings, and distances, then draws a preview and produces
Carlson-ready commands.
- **Why it helps:** Keeps the legal description, sketch, and export in one spot so you can stake or draft without retyping.
- **How to use:** Enter a record name and click **+ New Record**. Fill in starting point, coordinates, elevation, backsight
azimuth, basis of bearing, and first distance. Add each bearing and distance with **+ Add Subsequent Call** and reorder if
needed. Review the **Traverse Preview**, then click **Generate Carlson Commands** to copy blocks into CAD or your collector.

## Point File Manager
- **What it does:** Manages point files per project, including imports, quick manual edits, traverse-to-point conversion, and
downloads.
- **Why it helps:** Avoids juggling loose CSV/TXT files and keeps the same point numbers synced with traverses and navigation.
- **How to use:** Click **Import Points CSV** (columns: point number, X/lat, Y/lon, elevation, code, description) or start fresh
with **New Point File**. Add quick rows with **Add Point Row**. Convert a traverse to points with **Generate Point File**, then
**Download Points TXT** for your collector. Switch or rename files using **Active Point File** and **Rename Point File**.

## Field Level Book
- **What it does:** Tracks backsight/foresight shots, running sums, and misclosure for a level loop with exportable notes.
- **Why it helps:** Replaces handwritten books, reduces arithmetic mistakes, and provides a clean PDF for the office.
- **How to use:** Create or pick a **Level run** and name it (e.g., "North ditch loop"). Set the starting point/elevation, then
add BS/FS shots in order. Watch the totals and closure update. Adjust until the closure matches expectations, then **Export as
PDF** for your field packet.

## Evidence Records
- **What it does:** Attaches monument evidence to traverse points with condition, ties, photos, and optional GPS stamps.
- **Why it helps:** Keeps corner evidence tied to the geometry so later filings and stakeouts reference the same location data.
- **How to use:** Pick a record and traverse point. Choose the evidence type and condition, then describe the monument in plain
language. Add tie distances/bearings, upload photos, and optionally use **Get GPS Location** for coordinates. Save to add the
entry to the project-wide list, then export when you need corner filing text or backups.

## Equipment Setup Log
- **What it does:** Logs setup/teardown times, base heights, reference points, crews, equipment used, and optional GPS position.
- **Why it helps:** Provides a daybook of control setups so you can repeat or audit work without digging through separate notes.
- **How to use:** Enter setup/teardown date/time, base station height, reference point, crew member, and equipment list. Capture
GPS with **Get GPS Location** if available. Describe the day's goals in **Work / Daily Goal** and save to list it under
**Equipment Records**.

## Navigation
- **What it does:** Provides a live compass, target bearings, left/right offsets, and optional map preview for stakeout targets.
- **Why it helps:** Lets you walk to traverse points, equipment bases, or bookmarked targets without rekeying directions.
- **How to use:** Click **Start Compass** and rotate until the heading matches your target. Choose a **Navigate to** target
(point file entry, traverse point, or equipment source) to see distance, bearing, and offset. If GPS is available, apply
localization to show your location and the target on the map. Use the refresh/clear buttons to update sources.

## Global Settings
- **What it does:** Stores reusable **Equipment Names**, **Team Members**, and **Point Codes** plus a full-app import/export.
- **Why it helps:** Keeps dropdown choices consistent across every project and provides a single backup file for the entire app.
- **How to use:** Add or remove values in each list so they appear in other tools. Use **Download All App Data** for a full
backup and **Import App Data** to restore.
