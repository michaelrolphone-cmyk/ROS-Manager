# Tasks TODO

## Application Framework

* With application synch features, now it is duplicating the traverse bearing and distance entries over and over again even only one user is connected 
* I would like the help.md refresh button removed.
* I would like this text replaced with a copyright notice: All data saved locally in your browser • No server • Works offline

---

## Global Settings

* I would like to be able to edit names, equipment, and point codes.
* I would like to be able to delete team members, equipmnent, and point codes
* I would like team members, equipment, and point codes to have a unique identifier attached to them so they can be referenced by ID in other parts of the application code
* If a member, equipment, or point code is used any where in any data elsewhere in the app and I delete the entry, it should be flagged as archived rather than deleted so that references to it do not break or corupt data sets
* I would like to be able to specify additional information about equipment such as make and model, url to manuals, notes.
* I would like to be able to specify the job role, title, contact information, etc for each team member.

---

## Project Overview / Spring Board

* I would like a vicinity map app added to the spring board to view the clients property when the clients address has been configured for a project.
* I don't need an active indicator in the project overview on the spring board
* I would like the composite project thumbnail shown in the project overview on the springboard left of the project name and description with rounded corners

---

## **NEW: Project Evidence Chain Mini-App (Historical Documentation)**

* Create a mini app for the project that stores and displays a structured “chain of evidence” including:
  * Links to photos
  * Notes tied to evidence
  * PDF attachments
  * Scanned record documents
  * Township-Range-Section auto indexing on import/capture
* This mini app should let the user browse, search, annotate, and export the historical evidence supporting surveyed monuments.

---

## Differential Levels

* Differential Levels export doesn't show the values for fs and bs in the pdf

---

## Navigation

* I would like a list of the nearest 5 points to my current location shown on the navigation app so I can see what is near me. 
* If a user hasn't been connected to the app for more than 5 minutes don't show them on the navigation page
* I would like to be able to toggle between map and compass view on the navigation page

---

## Evidence Capture

* Evidence capture shouldn't pre select a record and traverse point. It won't always tie directly to a point in the projects traverses or even the point files. 
* Evidence capture should allow me to specify monument type, township, range, section and section breakdown 
* I need to be able to edit and delete evidence entries
* I should see a title for evidence entries built from the township range and section information
* Evidence monuments may join several sections and possibly border two townships

---

## **NEW: Monument Photo Annotation & Evidence Capture Enhancements**

* Evidence photo capture should support monument photo annotation:
  * ability to draw arrows, labels, or marks directly on the photo
  * ability to pin the monument location within the image
  * auto-stamping the TRS, date/time, and GNSS coordinate metadata on export
* Annotated photos should be part of the chain of evidence mini-app and evidence export workflows.

---

## Traversals of Records of Survey & Plats

* When entering traversals I would like the code table in global settings to populate a dropdown to specify what the traversal line represents or the point represents.
* I would like codes in global settings to have a field to specify if its a line type or a symbol/point type
* I would like to be able to offset from Center Line of roads and section lines using the (CL, SEC) line codes in a traversal to generate the interor boundary of a subdivision/parcel/lot/property from center lines 
* I would like to specify the closure point of a traversal and see a report in the overview of a traversal showing the error in closing the boundary if a closure is set.

---

## Equipment Setup

* I would like the form elements on the equipment setup page to have padding between them so they don't overflow their containers and overlap other form elements as occurs in desktop landscape views for text input fields.
* I would like base station geolocation used to grab a map tile for its location and show a marker on the tile where the equipment is set up as a thumbnail icon next to the entry in the list of equipment station setups.
* I wouild like the equipment setup entry to have nicely formatted text so that it is readable and visually appealing, the equipment used should be the largest text with the date / time of setup being secondarily highlighted and description of the work / goal focused below those headings. It should be easy to quickly see what reference point was used and the equipment setup height should be the second most important piece of visual information after the equipment name subheaded by datetime so I can scroll through quickly and see what, when, and how it was configured.
* I would like equipment setup date time to be visually represented as a css based calendar icon left aligned to the entry showing the month, day, and subtexted with time.

---

## **NEW: Stakeout / Field Notes Mini-App**

* Create a mini app for stakeout and monument placement that allows the user to:
  * Mark when a monument was set
  * Record witness marking details
  * Record dig notes (depth, obstructions, material encountered)
  * Specify the marking material used (PK nail, rebar, cap, spike, brass monument, etc.)
* These notes should automatically link to points and evidence records and become part of the chain of evidence export packets.

---

## **NEW: Document Generation Smart Pack**

* Add the ability to generate a bundled PDF package for a project containing:
  * equipment setup sheets
  * evidence sheet
  * traverse closure report
  * level loop sheet
  * stakeout summary
* This should be available from the project overview as its own export workflow.

---

## **NEW: Immutable Audit Trail Export Mini-App**

* Create a mini app to produce a cryptographically sealed audit trail for a project:
  * serialize project data and notes
  * compute checksum/signature hash
  * produce a digital log that can’t be altered without breaking its checksum
  * support export of JSON + audit checksum file bundle
* This mini app should allow users to view, verify, and export the audit data for legal/court admissibility.
