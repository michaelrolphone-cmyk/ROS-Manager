# E2E-01 — “PLSS Corner to Final Smart Pack”

## 0. Test Constants (Recommended Values)

Use fixed test data so your automation is deterministic.

* **Project**

  * `projectId`: `TEST-PLSS-01`
  * `projectName`: `Test Project – NW Sec 12 T5N R2E`
  * `county`: `Ada County`
  * `clientAddress`: `123 Test Rd, Boise, ID` (for vicinity map)
* **TRS Corner**

  * `T`: `5N`
  * `R`: `2E`
  * `Section`: `12`
  * `Corner`: `NW`
  * `cornerId`: `T5N-R2E-12-NW`
* **Surveyor / Firm**

  * `surveyorName`: `Jane Doe`
  * `licenseNumber`: `PLS 12345`
  * `firmName`: `Test Survey LLC`
  * `contactEmail`: `jane.doe@example.com`
* **Traverse**

  * `traverseName`: `TRV-NW-Sec12-Test`
* **Equipment Setup**

  * `equipmentName`: `GNSS Rover 1`
  * `equipmentModel`: `Mock GNSS-1000`
* **Mock Files**

  * `gloPlatFile`: `glo_sec12_test.pdf`
  * `rosFile`: `ros_2010_12345.pdf`
  * `photoFile`: `monument_photo.jpg`

Your test harness can simulate these as JSON stubs / blobs.

---

## 1. Project Creation & Baseline

### Step 1.1 — Create New Project

**Action**

* Create a new project with:

  * Name = `Test Project – NW Sec 12 T5N R2E`
  * ID = `TEST-PLSS-01`
  * County = `Ada County`
  * Client address configured (for vicinity map)

**Expected**

* Project appears in the springboard / project list.
* Project overview shows:

  * Project name, county, description.
  * Vicinity map tile based on client address.
  * Composite thumbnail placeholder.
* `LastExportDate` is **null** or `undefined`.
* Project-wide status: `Draft` or `In Progress` (but **not** Final).
* Immutable Audit Trail contains:

  * One entry: `PROJECT_CREATED` with projectId `TEST-PLSS-01`.

---

## 2. Historical Research & Source Documentation

### Step 2.1 — Add GLO Plat Document

**Action**

* Open Historical Research / Source Documentation mini-app.
* Add document:

  * Type = `GLO plat`
  * Jurisdiction = `Federal`
  * Recording info = `Test GLO Vol 1 Page 1`
  * TRS = `T5N R2E Sec 12`
  * Source reference = local file `glo_sec12_test.pdf`
  * Date reviewed = fixed test date.
  * Reviewer = `Jane Doe`
* Mark annotation:

  * Mark main plat as **Controlling**.
  * Note: `"Controls original NW corner position of Sec 12."`

**Expected**

* Document entry saved with:

  * Correct type, jurisdiction, TRS and recording info.
  * Annotation classification `Controlling`.
* Audit Trail records an event:

  * Type: `RESEARCH_DOC_ADDED`
  * Includes doc ID and classification.
* Marks Engine (if running silently) shows **no warnings** yet for research completeness for this corner (you have at least one controlling doc).

---

### Step 2.2 — Add Conflicting ROS Document

**Action**

* Add second document:

  * Type = `Record of Survey`
  * Jurisdiction = `County`
  * Recording info = `ROS 2010-12345`
  * TRS = `T5N R2E Sec 12`
  * Source reference = `ros_2010_12345.pdf`
  * Reviewer = `Jane Doe`
* Annotate:

  * Mark as **Conflicting**.
  * Note: `"NW corner differs by ~1.2 ft north of GLO-derived position."`

**Expected**

* ROS appears in doc list with classification `Conflicting`.
* Audit Trail logs `RESEARCH_DOC_ADDED` + `RESEARCH_DOC_ANNOTATED`.
* Marks Engine:

  * Flags an **Info or Notice** for this corner:

    * “Conflicting ROS exists for T5N R2E Sec 12 NW corner.”

---

## 3. Evidence Entry & Chain of Evidence

### Step 3.1 — Create Evidence Entry for NW Corner

**Action**

* Open Evidence mini-app.
* Create evidence:

  * Title auto-generated from TRS: expect something like
    `Corner Evidence – T5N R2E Sec 12 NW Cor`
  * Corner Type = `Section corner`
  * Corner Status = `Original monument found`
  * Township/Range/Section/Corner set as constants above.
  * Monument:

    * Type = `Brass cap`
    * Material = `Brass`
    * Size = `2" brass cap on 5/8" rebar`
    * Condition = `Good`
    * Occupation evidence = `"Fence and old road align with GLO calls."`
  * Ties:

    * Tie 1: 100.00 ft @ S 45°00'00" E to 10" pine.
    * Tie 2: 75.00 ft @ N 10°00'00" E to 12" oak.

**Expected**

* Evidence entry saved with:

  * TRS fields set.
  * Generated title present and human-readable.
  * Corner type and status correctly stored.
  * At least 2 ties stored.
* Chain of Evidence mini-app:

  * Lists `T5N-R2E-12-NW` with status `Original monument found`.
  * Indicates **2 ties** present.
* Audit Trail logs `EVIDENCE_ADDED`.
* Marks Engine:

  * No `Critical` warning for “insufficient ties” (>= minimum).

---

### Step 3.2 — Attach Monument Photo & Annotate

**Action**

* Attach photo `monument_photo.jpg` to this evidence entry.
* Use annotation tools to:

  * Draw an arrow pointing at the monument.
  * Add text `"Found brass cap"` near the arrow.

**Expected**

* Photo stored and linked to evidence entry.
* Annotation data stored (shapes + text).
* Metadata associated (not necessarily burned into pixels):

  * Capture date/time.
  * TRS = `T5N R2E Sec 12 NW`.
  * Corner ID = `T5N-R2E-12-NW`.
* Evidence view shows a preview thumbnail and indicates there is an annotated photo.
* Corner Evidence Packet (if generated just for this corner) includes:

  * Photo with annotation overlay.
  * Evidence notes and ties.

---

### Step 3.3 — Link Evidence to Research Docs

**Action**

* Link the NW corner evidence to:

  * GLO plat doc (Controlling).
  * ROS doc (Conflicting, rejected).

**Expected**

* Evidence entry shows linked research docs:

  * GLO (Controlling)
  * ROS (Conflicting)
* Research docs show backlinks to the NW corner evidence.
* Chain of Evidence for this corner shows:

  * # of controlling docs = 1
  * # of conflicting docs = 1
* Audit Trail logs `EVIDENCE_LINKED_TO_RESEARCH`.

---

## 4. Traverse Creation, QC Failure & Adjustment

### Step 4.1 — Create Traverse Geometry with Intentional Misclosure

**Action**

* Open Traverse mini-app.
* Create a new traverse `TRV-NW-Sec12-Test`:

  * Starting at corner `T5N-R2E-12-NW`.
  * Enter 4 legs forming an almost-closed loop with a small, deliberate misclosure.
* Set closure point = start point.

**Expected**

* Traverse saved with 4 legs and closure flag set.
* QC Dashboard:

  * Shows this traverse with closure error and angular misclosure.
  * Because misclosure is small but beyond a tight tolerance you specify (e.g. 1:10,000 vs actual 1:7,000), it should **FAIL** initially when we configure strict tolerances later.

---

### Step 4.2 — Apply Tight Project Tolerances & Recompute QC

**Action**

* Set project tolerances:

  * Traverses: misclosure must be better than 1:10,000.
  * Angular: e.g. ≤ 30" per angle or some fixed threshold.
* Trigger QC recomputation (or save tolerances and let QC rerun).

**Expected**

* QC Dashboard updates:

  * `TRV-NW-Sec12-Test` marked as **FAIL**.
  * Shows closure error, ratio, and direction.
* Evidence / Corner views that rely on this traverse show:

  * Geometry dependency flagged as `Uses Failed Geometry`.
* Marks Engine:

  * Adds a `Warning` or `Critical`:

    * “Traverse TRV-NW-Sec12-Test fails project tolerance and is used by corner T5N-R2E-12-NW.”

---

### Step 4.3 — Run Adjustment with Compass Rule

**Action**

* Perform a traverse adjustment using Compass Rule.
* Store raw coords and adjusted coords.
* Keep traverse geometry referenced by evidence/corner.

**Expected**

* Raw coordinates remain stored and accessible.
* Adjusted coordinates stored separately.
* UI allows toggling between `RAW` and `ADJ` for:

  * Traverse report.
  * Any coordinate table.
* QC Dashboard:

  * Now shows the **adjusted** traverse as **PASS** under new tolerances.
* Per-point deltas recorded (each point’s movement).
* Audit Trail logs:

  * `ADJUSTMENT_PERFORMED` with algorithm = `Compass Rule`.
* Marks Engine:

  * Warning about failed geometry is either:

    * Downgraded/cleared because the traverse now passes, or
    * Updated to show that adjustments were applied and now PASS.

---

## 5. Stakeout / Monument Setting Event

### Step 5.1 — Create Stakeout Entry Based on Adjusted Traverse

**Action**

* Open Stakeout / Field Notes mini-app.
* Create a stakeout event:

  * Linked to corner `T5N-R2E-12-NW`.
  * Monument set: `5/8" rebar with plastic cap` (same or related as found).
  * Dig notes: `"Monument found at expected depth, minor disturbed soil."`
  * Crew members: include `Jane Doe` and at least one assistant.
  * Equipment used: `GNSS Rover 1`.
  * Date/time set, referencing adjusted geometry.

**Expected**

* Stakeout entry saved and:

  * Linked to evidence for `T5N-R2E-12-NW`.
  * Linked to `TRV-NW-Sec12-Test`.
* QC Dashboard:

  * Shows that stakeout event references **PASS** geometry.
* Chain of Evidence:

  * Stakeout event visible in corner packet.
* Audit Trail logs:

  * `STAKEOUT_ADDED` with references.

---

## 6. CP&F Export — Failure, Fix, and Final

### Step 6.1 — Attempt CP&F Export with Required Fields Missing

**Action**

* Open CP&F export for `T5N-R2E-12-NW`.
* Intentionally leave one required field blank:

  * Example: omit `Basis of Bearing` or `Surveyor License Number`.
* Attempt to export as **Final** CP&F.

**Expected**

* Validation runs and **blocks Final export**.
* UI:

  * Highlights missing required field(s).
  * Provides direct navigation to each missing item.
* Export still possible only as:

  * `Preliminary — In Progress` or `Draft`.
  * Generated CP&F shows:

    * Watermark: `PRELIMINARY — NOT FOR RECORDATION`.
    * Footer note: `"Incomplete — subject to revision."`
* Marks Engine:

  * Adds `Critical` or `Warning`:

    * “CP&F required fields missing for corner T5N-R2E-12-NW.”

---

### Step 6.2 — Complete CP&F Required Fields & Re-export Final

**Action**

* Fill in all required CP&F fields:

  * Basis of Bearing statement.
  * Surveyor name, Idaho license number, firm.
  * Date(s) of survey.
  * County recording info.
  * Confirm at least 2 ties present.
* Attempt CP&F export as **Final** again.

**Expected**

* Validation passes (no missing required fields).
* System:

  * Prompts Digital Professional Declaration:

    > “I affirm this work is prepared under my direction, complies with applicable surveying standards and Idaho law, and is suitable for filing or reliance.”
* On accepting declaration:

  * Final CP&F PDF generated with:

    * No “Preliminary” watermark.
    * Signature/seal block present.
    * Cross-references:

      * Evidence entry.
      * Research docs (GLO + ROS, annotated as controlling/conflicting).
      * Traverse/level QC.
* CP&F record status:

  * `Final`.
* Audit Trail logs:

  * `CPAF_FINAL_EXPORTED` (or similar).
  * `PROFESSIONAL_DECLARATION_SIGNED` with:

    * Name, license, date/time, project revision ID, audit checksum.

---

## 7. Document Generation Smart Pack

### Step 7.1 — Generate Smart Pack

**Action**

* From the project overview, generate a **Document Smart Pack** choosing:

  * Traverse closure reports (raw & adj).
  * Level loop summaries (can be minimal or stub for this test).
  * Evidence sheets and photos.
  * Equipment setup logs.
  * Stakeout/Field Notes summaries.
  * QC Summary report.
  * Research & Source Documentation index (optional but recommended).

**Expected**

* Smart Pack export succeeds **only if**:

  * An audit snapshot exists for current revision.
  * CP&F for this corner is Final or clearly labeled Preliminary.
* Export options:

  * Consolidated PDF:

    * Each included document stamped with its status: Draft / Prelim / Final.
    * Project + county + surveyor details repeated.
  * JSON bundle:

    * Aligned with Immutable Audit Trail schema.
* Audit Trail logs:

  * `SMARTPACK_EXPORTED` with reference to audit checksum.

---

## 8. Marks Engine Verification

### Step 8.1 — Check Marks Report Panel (After Finalization)

**Action**

* Open Marks Report Panel for project `TEST-PLSS-01`.

**Expected**

* Issue list:

  * No **Critical** issues relating to:

    * CP&F for `T5N-R2E-12-NW`.
    * QC on traverse used for that corner.
    * Evidence sufficiency (ties, photos, research linkage).
* Some non-critical Info/Notice may remain (e.g., unreviewed docs).
* Professional Confidence Score:

  * Above a configured threshold (e.g., >80/100).
* All statuses are consistent:

  * Evidence: `Final` or `Ready for Review`.
  * CP&F: `Final`.
  * Traverse: `Pass` with documented adjustment.
* Marks Engine panel includes:

  * Direct links to corner profile, CP&F preview, QC Dashboard.

---

## 9. Backup, Audit Verification & Disaster Recovery

### Step 9.1 — Export Project & Audit Bundle

**Action**

* Export:

  * Full project JSON.
  * Immutable Audit Trail bundle + hash.

**Expected**

* Two artifacts:

  * `TEST-PLSS-01_project.json`
  * `TEST-PLSS-01_audit.json` + hash (e.g., `sha256`).
* `LastExportDate` updated to test timestamp.
* Audit Trail logs `PROJECT_EXPORTED`.

---

### Step 9.2 — Verify Audit Bundle

**Action**

* Use Audit Trail verification view:

  * Load audit bundle + hash.
  * Trigger verification.

**Expected**

* System recomputes checksum.
* Verification result: `PASS`.
* Any tampering simulation (alter a byte) should result in `FAIL` (you can add this as a separate negative test).

---

### Step 9.3 — Simulate Device Loss & Restore from Export

**Action**

* Simulate:

  * Clear local storage / project database for this app.
* Confirm:

  * Project list is empty.
* Import:

  * `TEST-PLSS-01_project.json` and restore.
  * Optionally re-import audit bundle and verify.

**Expected**

* Project `TEST-PLSS-01` reappears with:

  * All evidence, research docs, traverses, QC, CP&F, Smart Pack status restored.
* Marks Engine:

  * Same issues / confidence score as before wipe.
* CP&F Final export and Smart Pack:

  * Reconstructable and match original metadata (not necessarily byte-for-byte in PDF, but same logical content).
* Audit verification still `PASS`.

---

## 10. Negative & Override Scenario (Optional but Important)

### Step 10.1 — Force Final Export on Failed QC (Override Path)

**Action**

* Create a second traverse with **obviously failed** QC (e.g., huge misclosure).
* Link it to a test evidence corner `T5N-R2E-12-NE`.
* Attempt a **Final** CP&F and Smart Pack using this corner, **without** fixing QC.
* When blocked by Marks/validation, **force override** (if your design supports that).

**Expected**

* System:

  * Blocks Final by default due to QC failure.
  * To proceed, requires:

    * Written justification text.
* After override:

  * Final documents can be exported, but:

    * Corner and project marked as **High-Risk**.
    * QC Summary includes override + justification.
    * Audit Trail logs:

      * `QC_OVERRIDE` with justification text.
* Marks Engine:

  * Shows persistent risk flag for that corner and project.

---

## How to Use This Script

Each step above can be translated into automated tests of the form:

* **Given** initial state X
* **When** user performs action Y (API/UI event)
* **Then** state Z and side-effects (audit entries, statuses, etc.) must hold

```
{
  "testSuiteId": "E2E-PLSS-CORNER-TEST",
  "version": "1.0",
  "projectConstants": {
    "projectId": "TEST-PLSS-01",
    "projectName": "Test Project – NW Sec 12 T5N R2E",
    "county": "Ada County",
    "clientAddress": "123 Test Rd, Boise, ID",
    "surveyor": {
      "name": "Jane Doe",
      "licenseNumber": "PLS 12345",
      "firmName": "Test Survey LLC",
      "email": "jane.doe@example.com"
    },
    "corner": {
      "id": "T5N-R2E-12-NW",
      "township": "5N",
      "range": "2E",
      "section": "12",
      "corner": "NW"
    },
    "files": {
      "gloPlat": "glo_sec12_test.pdf",
      "rosDoc": "ros_2010_12345.pdf",
      "monumentPhoto": "monument_photo.jpg"
    }
  },

  "scenarios": [

    {
      "id": "SCENARIO-01-PROJECT-CREATION",
      "description": "Create new project and validate baseline state.",
      "steps": [
        {
          "given": "Application freshly loaded with empty storage.",
          "when": "User creates a new project using project constants.",
          "then": [
            "Project exists in project list with matching projectId and name.",
            "Project overview contains county, description, vicinity map placeholder.",
            "LastExportDate == null",
            "AuditTrail contains entry {type: 'PROJECT_CREATED', projectId: 'TEST-PLSS-01'}",
            "Project.status == 'Draft' OR 'In Progress'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-02-RESEARCH-DOCUMENTS",
      "description": "Add controlling GLO plat and conflicting ROS document.",
      "steps": [

        {
          "given": "Project TEST-PLSS-01 is active.",
          "when": "User adds a GLO plat document with annotation 'Controlling'.",
          "then": [
            "Research.docs.length == 1",
            "Research.docs[0].type == 'GLO plat'",
            "Research.docs[0].classification == 'Controlling'",
            "Research.docs[0].trs.section == '12'",
            "AuditTrail contains 'RESEARCH_DOC_ADDED'"
          ]
        },

        {
          "given": "GLO plat exists.",
          "when": "User adds ROS document with classification 'Conflicting'.",
          "then": [
            "Research.docs.length == 2",
            "At least one doc has classification 'Conflicting'",
            "AuditTrail contains 'RESEARCH_DOC_ANNOTATED'",
            "MarksEngine.issues includes {'severity': 'Notice', 'code': 'CONFLICTING_RESEARCH'}"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-03-EVIDENCE-CREATION",
      "description": "Create evidence entry, add ties, attach photo, link to research.",
      "steps": [

        {
          "given": "Research docs exist.",
          "when": "User creates an evidence entry for corner T5N-R2E-12-NW with 2 valid ties.",
          "then": [
            "Evidence.count == 1",
            "Evidence['T5N-R2E-12-NW'].ties.length >= 2",
            "Evidence['T5N-R2E-12-NW'].cornerType == 'Section corner'",
            "Evidence['T5N-R2E-12-NW'].status == 'Original monument found'",
            "ChainOfEvidence contains entry for this corner",
            "AuditTrail contains 'EVIDENCE_ADDED'"
          ]
        },

        {
          "given": "Evidence entry exists.",
          "when": "User attaches annotated monument photo.",
          "then": [
            "Evidence.photo.exists == true",
            "Evidence.photo.metadata.cornerId == 'T5N-R2E-12-NW'",
            "Evidence.photo.annotations.length >= 1",
            "AuditTrail contains 'PHOTO_ATTACHED'"
          ]
        },

        {
          "given": "Evidence entry and research docs exist.",
          "when": "User links evidence to GLO (controlling) and ROS (conflicting).",
          "then": [
            "Evidence['T5N-R2E-12-NW'].linkedResearch.length == 2",
            "Research docs show backlinks to evidence",
            "AuditTrail contains 'EVIDENCE_LINKED_TO_RESEARCH'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-04-TRAVERSE-QC",
      "description": "Create traverse, fail QC, adjust geometry, verify QC pass.",
      "steps": [

        {
          "given": "Evidence exists.",
          "when": "User creates traverse TRV-NW-Sec12-Test with deliberate misclosure.",
          "then": [
            "Traverse.count == 1",
            "Traverse['TRV-NW-Sec12-Test'].legs.length >= 4",
            "QC.status == 'FAIL' when strict tolerances applied"
          ]
        },

        {
          "given": "Strict tolerances set (1:10000 closure required).",
          "when": "QC Dashboard recomputes.",
          "then": [
            "QC.traverses['TRV-NW-Sec12-Test'].status == 'FAIL'",
            "MarksEngine.issues includes entry {severity: 'Warning', code: 'GEOMETRY_FAIL'}"
          ]
        },

        {
          "given": "Traverse exists with misclosure.",
          "when": "User applies Compass Rule adjustment.",
          "then": [
            "Traverse.rawCoordinates preserved",
            "Traverse.adjustedCoordinates exist",
            "Traverse.adjustmentAlgorithm == 'Compass Rule'",
            "QC.status == 'PASS'",
            "MarksEngine issues downgrade for this corner"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-05-STAKEOUT",
      "description": "Create stakeout entry referencing adjusted geometry.",
      "steps": [
        {
          "given": "Adjusted traverse exists.",
          "when": "User creates stakeout entry for T5N-R2E-12-NW using equipment GNSS Rover 1.",
          "then": [
            "Stakeout.count >= 1",
            "Stakeout.last.linkedCorner == 'T5N-R2E-12-NW'",
            "Stakeout.last.referencesAdjustedGeometry == true",
            "AuditTrail contains 'STAKEOUT_ADDED'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-06-CPAF-FINALIZATION",
      "description": "Validate CP&F export blocking, then successful final export.",
      "steps": [

        {
          "given": "Evidence exists.",
          "when": "User attempts CP&F Final export with missing required fields.",
          "then": [
            "Export.blocked == true",
            "CPAF.status != 'Final'",
            "Generated PDF has watermark PRELIMINARY",
            "MarksEngine.issues includes {severity: 'Critical', code: 'MISSING_REQUIRED_FIELDS'}"
          ]
        },

        {
          "given": "User completes Basis of Bearing, ties, surveyor info.",
          "when": "User attempts CP&F Final export again.",
          "then": [
            "Export.blocked == false",
            "User prompted for Digital Professional Declaration",
            "CPAF.status == 'Final'",
            "AuditTrail contains 'CPAF_FINAL_EXPORTED'",
            "AuditTrail contains 'PROFESSIONAL_DECLARATION_SIGNED'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-07-SMARTPACK",
      "description": "Generate Smart Pack containing all linked docs, QC, evidence, research.",
      "steps": [
        {
          "given": "Final CP&F exists and QC passes.",
          "when": "User generates Smart Pack.",
          "then": [
            "SmartPack.generated == true",
            "SmartPack.pdf.contains('Traverse Report') == true",
            "SmartPack.pdf.contains('Evidence Sheets') == true",
            "SmartPack.pdf.contains('Research Index') == true",
            "AuditTrail contains 'SMARTPACK_EXPORTED'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-08-AUDIT-VERIFICATION",
      "description": "Export and verify audit bundle.",
      "steps": [

        {
          "given": "Project is in valid state.",
          "when": "User exports project JSON and audit bundle.",
          "then": [
            "LastExportDate updated",
            "ExportedArtifacts include project.json and audit.json",
            "AuditTrail contains 'PROJECT_EXPORTED'"
          ]
        },

        {
          "given": "Audit bundle and hash exported.",
          "when": "User performs audit verification.",
          "then": [
            "AuditVerificationResult == 'PASS'"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-09-DISASTER-RECOVERY",
      "description": "Clear storage and restore from export.",
      "steps": [

        {
          "given": "Exports exist.",
          "when": "Local storage is cleared.",
          "then": [
            "ProjectList.count == 0"
          ]
        },

        {
          "given": "Storage is empty.",
          "when": "User imports TEST-PLSS-01 project JSON.",
          "then": [
            "Project restored with correct name, evidence, traverses, research, CP&F state",
            "MarksEngine state identical to pre-wipe state",
            "Audit verification still PASS"
          ]
        }
      ]
    },

    {
      "id": "SCENARIO-10-QC-OVERRIDE",
      "description": "Override QC failure with justification and export Final anyway.",
      "optional": true,
      "steps": [

        {
          "given": "User creates new traverse with severe misclosure.",
          "when": "User attempts Final export for NE corner using failed geometry.",
          "then": [
            "Final export blocked",
            "MarksEngine.issues includes {severity: 'Critical', code: 'GEOMETRY_FAIL'}"
          ]
        },

        {
          "given": "User insists on override.",
          "when": "User enters override justification and forces export.",
          "then": [
            "Final export allowed",
            "QC Summary includes override justification",
            "AuditTrail contains 'QC_OVERRIDE'",
            "Corner flagged as HIGH_RISK in MarksEngine"
          ]
        }
      ]
    }
  ]
}
```
