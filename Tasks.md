# Tasks TODO


# 📌 Overall Priority Flow
1. **Data corruption / sync bugs**
2. **Reference safety + editing/deleting with archival**
3. **Correct workflows (Evidence, Traversals, Navigation)**
4. **Compliance + output correctness (PDF, reports)**
5. **Usability + mapping additions**
6. **Polish & visual improvements**

---

# 🔧 Critical Fixes (Data Integrity & Core Functionality)

## **Application Framework**
- With application sync features enabled, the app is **duplicating traverse bearing and distance entries repeatedly**, even when only **one user is connected**. This must be fixed.
- Remove the **help.md refresh button**.
- Replace this footer text with the following:  
  **“All data saved locally in your browser • No server • Works offline”**

## **Global Settings (Data Editing, Identification, and Safe Deletion)**
- The app should allow **editing names, equipment, and point codes**.
- The app should allow **deleting team members, equipment, and point codes.**
- **All team members, equipment, and point codes must have a unique identifier** so they can be referenced reliably by ID in any part of the application code.
- If a team member, equipment item, or point code **is already used anywhere in any other data**, and is deleted, it **must be archived (not deleted)** so that no data references break or corrupt other datasets.
- Users should be able to **specify additional information about equipment**, such as:
  - make and model
  - URL to manuals
  - notes
- Users should be able to **specify additional information about team members**, including:
  - job role
  - title
  - contact information

## **Evidence Capture Workflow Fixes**
- Evidence capture **should not pre-select a record or traverse point** because evidence will not always tie directly to a traversal or even the point files.
- Evidence capture must allow specification of:
  - monument type
  - township
  - range
  - section
  - section breakdown
- **Evidence monuments may join multiple sections and may border two townships**, so the UI and storage must support multi-section and multi-township relationships.
- Users must be able to **edit and delete evidence entries**.
- Evidence entries should automatically display **a title built from the township, range, and section information.**

---

# 🎯 Essential Feature Upgrades (User Productivity)

## **Traversals of Records of Survey & Plats**
- When entering traversals, the **code table in Global Settings must populate a dropdown** to specify what the traversal line or point represents.
- Codes in global settings must include a field allowing the user to specify **whether the code is a line type or a symbol/point type**.
- The user must be able to **offset from centerline (CL) and section lines (SEC) using line codes in a traversal** to generate the interior boundary of a subdivision/parcel/lot/property from the centerlines.
- The user must be able to specify the **closure point of a traversal** and must see a **closure report showing the error in closing the boundary if a closure is set.**

## **Navigation**
- The navigation app must display **the nearest 5 points to the user’s current location**.
- If a user has **not been connected to the app for more than 5 minutes**, they should **not be shown on the navigation page**.
- The navigation page must allow the user to **toggle between map and compass view**.

---

# 📌 Targeted Improvements (Output & Accuracy)

## **Differential Levels**
- Differential Levels export currently **does not show the fs (foresight) and bs (backsight) values** in the generated PDF. These values must be displayed correctly.

## **Project Overview / Spring Board**
- Add a **vicinity map app to the spring board** to view the client’s property when the client’s address has been configured for a project.
- The **active indicator** in the project overview is **not needed and should be removed**.
- The **composite project thumbnail** should be shown **on the left of the project name and description**, and **must have rounded corners**.

---

# 🎨 UI/UX and Presentation Enhancements

## **Equipment Setup**
- Form elements on the equipment setup page must **have padding between them** so they **do not overflow their containers or overlap other form elements**, as currently happens in desktop landscape views with text input fields.
- Base station geolocation must be used to **grab a map tile** and **show a marker on the tile** where the equipment is set up, as a **thumbnail icon next to the setup entry**.
- The equipment setup entry must be **visually formatted for readability**, where:
  - the **equipment name is the largest text**,
  - the **date/time of setup is secondarily highlighted**, and
  - below those headings, the UI should clearly show:
    - **what reference point was used**
    - **the equipment setup height**, which should be the **second most important piece of visual information after the equipment name**, sub-headed by datetime,
    - a description of the **work/goal of the setup**.
  - The goal is to make it easy to scroll quickly and see **what equipment was used, when it was used, and how it was configured.**
- The **equipment setup date/time must be presented visually** as a **CSS-based calendar icon**, left-aligned to the entry, showing:
  - month
  - day
  - sub-text with time

---
