# 📌 Overall Priority Flow

1. Legal/Statutory Compliance & Historical Research  
2. Data Integrity, Audit Trails, and Backups  
3. Quality Control, Tolerances, and Adjustments  
4. Evidence, PLSS Corners, and Chain of Evidence  
5. Core Geometry & Computation (Traverses, Leveling, Points)  
6. Global Settings & Shared Code Tables  
7. Field Workflows (Equipment, Navigation, Stakeout)  
8. Project Overview, Reporting, and UI/UX Polish  
9. Marks: Project Integrity Oversight & Training System

---

# Tasks TODO (Prioritized)

## 1. Historical Research & Idaho Compliance

### 1.1 Historical Research & Source Documentation Mini-App

**Goal:** Provide a complete, legally defensible research trail for every project.

* ✅ Create a **Historical Research / Source Documentation mini-app** for cataloging all documents that inform survey decisions, including:
  * Government Land Office (GLO) plats and field notes  
  * Record of Survey (ROS) filings  
  * Subdivision plats and annexations  
  * Deeds, title chains, and easements  
  * County recorded documents (corner perpetuations, road records, etc.)  
  * BLM cadastral corner data summaries and reports  
  * Other agency correspondence or survey notes  

* ✅ For each document, store:
  * Document type (GLO plat, deed, ROS, CP&F, plat, easement, etc.)
  * Jurisdiction (County, BLM, Federal, Private)
  * Recording/filing information (Instrument number, Book/Page, Document number)
  * Township, Range, Section(s) and aliquot(s) affected
  * Source reference (URL, scanner source, photo, local file import, or manual entry)
  * Date reviewed and reviewer (surveying party)

* ✅ Add structured annotation on each document:
  * Mark portions as:
    * **Controlling**
    * **Supporting**
    * **Conflicting**
    * **Discarded (with reason)**
  * Allow notes tied to specific corners or lines, such as:
    * “Controls NE corner of Sec 12”
    * “Conflicts with GLO notes; rejected due to later corrected plat”

* ✅ Link documents to:
  * Specific evidence entries / monuments
  * Traverses or record sets
  * Stakeout entries
  * TRS-based corner IDs

* ✅ Export:
  * A **Research and Source Documentation Packet** indexed by:
    * TRS
    * Corner ID
    * Document type
  * Include:
    * All annotations
    * Flags showing what was accepted/rejected and why
    * Reviewer identity and dates
  * Integrate with the **Immutable Audit Trail mini-app** so the research record is checksum-protected.

---

### 1.2 PLSS Corner Classification & Idaho CP&F Compliance

**Goal:** Ensure all corners are classified, documented, and exportable in a way that satisfies Idaho statutory requirements and PLSS standards.

* ✅ Expand Evidence and Stakeout data models to include:
  * **Corner Type** (select list):
    * Section corner
    * Quarter corner
    * Sixteenth corner
    * Lot corner
    * Meander corner
    * Witness corner
    * Other PLSS types as needed
  * **Corner Status** (select list):
    * Original monument found
    * Perpetuation monument found
    * Obliterated/restored by collateral evidence
    * Lost/proportionally restored
    * New monument set
    * Witness corner set

* ✅ Add Idaho CP&F–specific fields to evidence/CP&F export:
  * Basis of bearing statement
  * Detailed monument description:
    * Type
    * Material
    * Size/diameter/length (where applicable)
  * Condition and occupation evidence
  * Complete reference tie list (minimum per Idaho requirement)
  * Responsible surveyor:
    * Name
    * Idaho PLS license number
    * Firm (if applicable)
  * Date(s) of survey
  * County and relevant recording information

* ✅ Implement **CP&F document validation**:
  * Before allowing CP&F export:
    * Validate that all required CP&F fields are filled.
    * Highlight missing fields and provide navigation directly to each missing item.
  * Prevent “CP&F-ready” export until all mandatory items pass validation.

* ✅ Ensure CP&F PDF layout:
  * Has Idaho-appropriate structure and headings.
  * Includes space for seal/signature.
  * Cross-references:
    * Evidence entries
    * Research documents in the Historical Research mini-app
    * Relevant traverses or record sets

---

## 2. Data Integrity, Audit Trails, and Backups

### 2.1 Application Framework & Sync Stability

* ✅ Fix the sync bug where, with application sync features enabled, the app is **duplicating traverse bearing and distance entries over and over again even when only one user is connected**.
* ✅ Remove the **help.md refresh button**.
* ✅ Replace the existing footer/help text with this copyright/behavior notice:
  **“All data saved locally in your browser • No server • Works offline”**

---

### 2.2 Immutable Audit Trail Mini-App

**Goal:** Make it impossible to silently alter a project’s history without detection.

* ✅ Create an **Immutable Audit Trail mini-app** that:
  * ✅ Serializes all project data and key events (creations, edits, deletions, imports).
  * ✅ Computes a checksum or cryptographic hash for each export snapshot.
  * ✅ Stores:
    * ✅ Audit bundle (JSON)
    * ✅ Hash/signature
    * ✅ Timestamp and responsible user/device (if available)

* ✅ Provide a **verification view**:
  * ✅ Load an exported bundle + hash.
  * ✅ Recompute checksum.
  * ✅ Confirm whether it matches (PASS/FAIL).

* ✅ Integrate with:
  * ✅ Research/Source Documentation exports
  * ✅ Evidence and CP&F exports
  * ✅ Document Smart Pack exports
  * ✅ QC Summary exports

---

### 2.3 Backup Safeguards & Export Reminders

**Goal:** Reduce risk of losing field records due to local storage wipes or device failure.

* ✅ At project level, display **“Last Export Date”** (for that project).
* Trigger warnings when:
  * ✅ The project has not been exported in **more than 7 days**; or
  * ✅ Major changes have occurred (e.g., new evidence, new traverses, CP&F-ready data), and no export has occurred since.

* ✅ Warnings should:
  * Appear clearly in the springboard and/or project overview.
  * Provide an **“Export Now”** button.

* Optional: Implement **local rolling backups** (user opt-in):
  * Maintain the last 3 exports per project (rotating) in a chosen directory or filename pattern.
  * Never upload data externally without explicit user action.

---

## 3. Quality Control, Tolerances, and Adjustments

### 3.1 Tolerance Controls & QC Dashboard

* ✅ Add **project-level tolerance settings**:
  * Traverse closure tolerance:
    * Angular tolerance
    * Linear misclosure per length
  * Level loop closure tolerance:
    * Misclosure allowed per distance (e.g., 0.02√K ft or as configured)

* ✅ Implement a **QC Dashboard**:
  * List all traverses with:
    * Closure error (linear, angular as applicable)
    * PASS/FAIL against project tolerance
  * List all level loops with:
    * Closure misclosure
    * PASS/FAIL
  * Highlight:
    * Corners or evidence entries that rely on **failed** geometry in red.
  * Allow quick navigation from a failed item directly to:
    * The traverse or level run,
    * The affected corners/evidence.

* Enable export of a **Quality Control Summary**:
  * Include all traverses and loops with closure and PASS/FAIL.
  * Include tolerances and any overrides.
  * Include a list of affected corners/evidence for any failures.
  * Automatically include in Document Smart Pack and Audit Trail exports.

---

### 3.2 Adjustment Transparency (Raw vs Adjusted Geometry)

* When performing any traverse adjustment:
  * Store the **raw coordinates** (unadjusted) permanently.
  * Store **adjusted coordinates** separately.
  * Never overwrite raw values.

* Record:
  * Which adjustment algorithm was used (Compass rule, Transit rule, etc.).
  * Per-point adjustment deltas (how much each point moved).

* UI expectations:
  * Allow switching between:
    * Viewing raw vs adjusted coordinates.
  * Clearly label RAW vs ADJ in any tabular displays and exports.

* Ensure that:
  * Any point file or export that uses adjusted coordinates either:
    * clearly marks them as adjusted; or
    * offers an option to export raw vs adjusted.

---

## 4. Evidence, PLSS Corners, and Chain of Evidence

### 4.1 Evidence Capture (Core Behavior)

* ✅ Evidence capture **must not pre-select** a record or traverse point:
  * ✅ The user must be free to record evidence that is not directly tied to existing traverse geometry or point files.
* Evidence capture must allow specifying:
  * Monument type
  * Township
  * Range
  * Section
  * Section breakdown (aliquots, lots, etc.)
* Evidence entries must:
  * Be fully editable and deletable (subject to archival rules if referenced).
* Each evidence entry should have a **title generated** from TRS info (e.g., “Corner Evidence – T5N R2E Sec 12 NE Cor”).
* Evidence monuments must support:
  * Joining multiple sections (e.g., common corners)
  * Bordering multiple townships where applicable.

---

### 4.2 Chain of Evidence Mini-App

* Create a **Chain of Evidence mini-app** for each project that:
  * Shows all evidence entries in a structured list (by TRS, corner type, status).
  * Links evidence entries to:
    * photo attachments,
    * CP&F exports,
    * research documents,
    * traverses and stakeout logs.

* Features:
  * Filter by TRS, corner type, status, date, or project phase.
  * Export a **Corner Evidence Packet** per corner:
    * evidence notes,
    * ties,
    * photos,
    * related research sources,
    * CP&F-ready text,
    * QC status.

---

### 4.3 Monument Photo Annotation & Metadata

* Extend evidence photos to support:
  * Drawing simple arrows, circles, and text labels on the image.
  * Marking the monument location within the frame.

* Automatically stamp (in metadata / export, not necessarily on original image pixels unless user chooses):
  * Date and time of capture.
  * TRS (from the evidence entry).
  * Associated point/station if applicable.

* Ensure annotated photos are:
  * Accessible from Evidence, Chain of Evidence, and Stakeout mini-apps.
  * Included in relevant PDF/document exports.

---

### 4.4 Stakeout / Field Notes Mini-App

* Create a **Stakeout / Field Notes mini-app** that:
  * Logs monument setting operations and other significant field tasks.
  * For each stakeout/setting event, store:
    * Monument type placed and material (rebar/cap, brass monument, PK nail, spike, etc.)
    * Any witness marks or ties used for setting.
    * Dig notes (depth, obstructions, soil/rock, existing disturbed material).
    * Crew members present.
    * Equipment used (linked to Equipment Setup entries).
    * Date and time of setting.

* Link Stakeout entries to:
  * Evidence entries (once the monument is considered established).
  * Traverses and points used for controlling the location.
  * QC Dashboard (to show whether geometry used was PASS/FAIL).

---

## 5. Core Geometry & Computation

### 5.1 Traversals of Records of Survey & Plats

* When entering traversals:
  * Use the **code table in Global Settings** to populate dropdowns that specify what each traversal line or point represents (e.g., CL, R/W, lot line, section line, easement boundary, etc.).

* Global codes must include:
  * A field indicating whether the code represents:
    * a **line type**, or
    * a **symbol/point type**.

* Support offsets from:
  * **Center Line (CL)** of roads,
  * **Section lines (SEC)**,
  using line codes in a traversal to generate **interior boundaries** of subdivisions/parcels/lots/properties from centerlines.

* Allow specifying a **closure point** for a traversal and show:
  * a closure report in the traversal overview, including:
    * closure error,
    * direction of misclosure,
    * PASS/FAIL vs tolerance (driven by QC settings).

---

### 5.2 Differential Levels (Field Level Book)

* ✅ Fix Differential Levels export so that:
  * ✅ **FS (foresight)** and **BS (backsight)** values correctly appear in the generated PDF.

* Ensure:
  * Level loop results (closure, adjustment if present) are:
    * captured in QC Dashboard,
    * included in Document Smart Pack and Audit Trail where appropriate.

---

## 6. Global Settings & Shared Code Tables

### 6.1 Entity Management & Archival

* Allow editing of:
  * Names, equipment, and point codes.

* Allow deleting:
  * Team members, equipment, and point codes.

* Every team member, equipment item, and point code must have a **unique identifier** used across the app for references by ID.

* If a team member, equipment item, or point code is used anywhere in project data:
  * Deleting it must:
    * **flag the record as archived** rather than completely deleting it.
    * Preserve references so that historical data remains valid and uncorrupted.

---

### 6.2 Extended Metadata

* Equipment entries should support:
  * Make and model.
  * URL(s) to manuals.
  * Notes field (for calibration info, known issues, etc.).

* Team member entries should support:
  * Job role.
  * Title.
  * Contact information (phone, email, etc.).

---

## 7. Field Workflows: Equipment, Navigation, and Stakeout

### 7.1 Equipment Setup (UI & Map Enhancements)

* ✅ Equipment Setup form:
  * ✅ Add padding between form elements so they do not overflow or overlap, especially in desktop landscape views with long text inputs.

* Base station geolocation:
  * Use geolocation to fetch an appropriate **map tile** and show a **marker** where the equipment is set up.
  * Display that tile and marker as a **thumbnail icon** next to each equipment setup in the list.

* Equipment setup entry formatting:
  * Make the **equipment used** the largest text in the entry.
  * Show the **date/time of setup** as the next most prominent element.
  * Make it easy to quickly see:
    * What reference point was used.
    * The **equipment setup height** (second most important piece of visual information after the equipment name, alongside datetime).
    * A short description of the work/goal.

* Represent setup date/time as a **CSS-based calendar icon**, left-aligned:
  * Show month and day.
  * Sub-text with the time.

---

### 7.2 Navigation

* ✅ Navigation app must:
  * ✅ Show a list of the **nearest 5 points** to the user’s current location to quickly see what is nearby.
  * ✅ If a user (in sync mode) has not been connected for more than **5 minutes**, do **not** show them on the navigation page.
  * ✅ Allow toggling between:
    * **Map view**,
    * **Compass view**.

---

## 8. Project Overview, Reporting, and UI/UX Polish

### 8.1 Project Overview / Spring Board

* Add a **vicinity map app** to the springboard to view the client’s property when the client’s address has been configured for a project. ✅
* Remove the **active indicator** in the project overview on the springboard (not needed). ✅
* Show the **composite project thumbnail** in the project overview: ✅
  * On the left of the project name and description.
  * With rounded corners.

---

### 8.2 Document Generation Smart Pack

* Create a **Document Generation Smart Pack** workflow that:
  * Bundles into a single export:
    * Traverse closure reports (raw and adjusted)
    * Level loop summaries
    * Evidence sheets and photos (with CP&F data where applicable)
    * Equipment setup logs
    * Stakeout/Field Notes summaries
    * QC Summary report
    * Optional Research & Source Documentation index

* Allow exporting as:
  * A consolidated PDF packet (for office/filing use).
  * A JSON bundle aligned with the Immutable Audit Trail.

---

### 8.3 Idaho-Ready Document Templates

* Ensure all exportable documents (CP&F, QC summaries, level books, equipment logs, Smart Pack) use templates that:
  * Include:
    * Surveyor name
    * Idaho license number
    * Firm name (if applicable)
    * Contact info
  * Provide a **seal/signature block** formatted for Idaho.
  * Include:
    * Basis of Bearing statement (where applicable)
    * Project name and identifier
    * County information for recording
  * Cross-reference:
    * Corners
    * Evidence entries
    * Research documents
    * Relevant traverses and level loops

---


## 9. Marks — Project Integrity Officer AI  
*(Professional oversight without blocking in-progress field work)*

### 9.1 Validation Engine — **Silent Inspector Phase**

> **Goal:** Allow full field flexibility while tracking deficiencies realistically and transparently.

* Implement a passive “Marks Engine” that evaluates:
  - PLSS corner classification completeness
  - Evidence sufficiency (ties, description, photos, status)
  - Research completeness & linkage to corners/decisions
  - QC status of geometry used in evidence or stakeout
  - CP&F-required fields (when applicable)
  - Export readiness state

* Create a **Marks Report Panel** showing:
  - Issue severity levels:
    * **Info**
    * **Notice**
    * **Warning**
    * **Critical (must be resolved before Final export)**
  - Direct navigation links to fix each issue.

* Compute a **Professional Confidence Score** based on compliance and QC.

* **No blocking in this phase** — fully informational.

---

### 9.2 Controlled Gatekeeping — **Active for Final Deliverables Only**

> **Goal:** Never block field progress, but prevent substandard “Final” deliverables.

#### Export Status Labels (Mandatory) ✅
* Every export must be labeled:
  - `Preliminary — In Progress`
  - `Draft — Partial or Incomplete`
  - `Final — Professional Declaration Signed`

#### Final Export Requirements
* Final documents can only be exported when:
  - Required CP&F fields are completed
  - Research sources linked for controlling evidence
  - QC Dashboard shows PASS or has **documented justification**
  - Immutable Audit Trail export exists

#### Forced Override (When User Chooses to Proceed)
* If user forces a decision using questionable or failed geometry:
  - Require **written justification**
  - Attach justification to:
    * Evidence
    * Stakeout
    * QC Summary
    * Audit Trail
  - Marks must display a risk flag for that corner/project.

**Draft exports** are **always allowed**, automatically marked as not for recordation.

---

### 9.3 Competency Coach — **Training-on-Demand**

> **Goal:** Teach the “why” behind requirements instead of blocking work.

* When a user repeatedly commits the same professional deficiency:
  - Trigger a short **micro-lesson** containing:
    * Idaho-based legal/standard rule citation
    * Brief best-practice description (≤2 min)
    * Quick 2–3 question acknowledgment (not graded)

* All lessons and acknowledgments must be saved in a **Training Log**.

* Training Log must export & integrate with:
  - Audit Trail
  - QC Summary (optional appendix)
  - Final Smart Pack (optional)

This protects surveyors professionally by documenting due diligence.

---

### 9.4 Professional Accountability — **Final-Only Declarations**

> **Goal:** Align the software with real Idaho ethical and legal practices.

* Before final export, require the surveyor to complete a **Digital Professional Declaration**:

  > “I affirm this work is prepared under my direction, complies with applicable surveying standards and Idaho law, and is suitable for filing or reliance.”

* Store the declaration and:
  - Name
  - Idaho PLS License #
  - Firm (if applicable)
  - Signed date/time
  - Project revision ID
  - Audit checksum reference

* Highlight **High-Risk Corners** when:
  - Evidence is missing photos
  - CP&F ties are insufficient
  - Corner relies on lost/proportionate restoration without research linkage
  - QC failed and was overridden

* Display high-risk flags:
  - In Evidence list
  - On Chain of Evidence report
  - In CP&F preview
  - In Smart Pack

---

### 9.5 Draft Labeling, Progress Transparency & Watermarks

> **Goal:** Preserve field flexibility and accountability.

* ✅ Every evidence, traverse, stakeout, record, and document must track a `status`:
  - `Draft`
  - `In Progress`
  - `Ready for Review`
  - `Final`

* All draft or incomplete exports must be visually marked:
  - Watermark: **“PRELIMINARY — NOT FOR RECORDATION”**
  - Footer note:
    > “Incomplete — subject to revision.”

* CP&F exports must automatically enforce: ✅
  - If any required fields are missing → **stamp as Preliminary**

* Smart Pack must include status labels for every included document.

---

### 9.6 Interface Constraints & Professional Tone

> **Goal:** Direct and firm guidance consistent with Marks’ persona.

* Critical warnings must:
  - Require explicit acknowledgment
  - Provide statute/standards reference
  - Provide navigation to resolve issue

* Tone requirements:
  - Direct, factual, polite, uncompromising
  - No “AI-cute” language
  - Always cite the principle behind the rule

Example:

> “This corner lacks required witness ties under Idaho CP&F standards. Add two reference ties or mark justification for exemption.”

---
