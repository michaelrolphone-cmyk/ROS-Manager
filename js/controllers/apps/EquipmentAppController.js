import EquipmentLog from "../../models/EquipmentLog.js";
import MiniAppController from "./MiniAppController.js";
import { buildMapboxStaticUrl } from "../../services/MapboxService.js";

export default class EquipmentAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getProjects = options.getProjects || (() => ({}));
    this.getCurrentProjectId = options.getCurrentProjectId || (() => null);
    this.getActiveTeamMembers = options.getActiveTeamMembers || (() => []);
    this.getEquipmentSettings = options.getEquipmentSettings || (() => []);
    this.saveProjects = options.saveProjects || (() => {});
    this.escapeHtml = options.escapeHtml || ((text) => text ?? "");
    this.onEquipmentLogsChanged =
      options.onEquipmentLogsChanged || (() => {});
    this.onNavigateToEquipment = options.onNavigateToEquipment || (() => {});

    this.currentEquipmentLocation = null;
    this.editingEquipmentId = null;

    this.bindEvents();
  }

  buildStaticMapUrl(lat, lon, accuracy) {
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    return buildMapboxStaticUrl(lat, lon, {
      zoom: 19,
      width: 320,
      height: 220,
      markerColor: "3b82f6",
    });
  }

  buildCalendarIcon(date) {
    if (!date || Number.isNaN(date.getTime())) {
      return `<div class="calendar-icon muted"><div class="month">TBD</div><div class="day">—</div><div class="time">Set date</div></div>`;
    }
    const month = date.toLocaleString(undefined, { month: "short" });
    const day = date.getDate();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `<div class="calendar-icon"><div class="month">${this.escapeHtml(
      month
    )}</div><div class="day">${this.escapeHtml(day)}</div><div class="time">${this.escapeHtml(
      time
    )}</div></div>`;
  }

  getEquipmentMapUrl(location) {
    if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
      return null;
    }
    if (!location.mapTile) {
      location.mapTile = this.buildStaticMapUrl(
        location.lat,
        location.lon,
        location.accuracy
      );
    }
    return location.mapTile;
  }

  handleActivate() {
    super.handleActivate();
    this.refreshEquipmentUI();
  }

  get currentProject() {
    const id = this.getCurrentProjectId();
    return this.getProjects?.()[id] || null;
  }

  bindEvents() {
    this.elements.captureEquipmentLocation?.addEventListener("click", () =>
      this.captureEquipmentLocation()
    );

    [
      this.elements.equipmentSetupAt,
      this.elements.equipmentTearDownAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentUsed,
      this.elements.equipmentSetupBy,
      this.elements.equipmentWorkNotes,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateEquipmentSaveState());
      if (el?.tagName === "SELECT") {
        el.addEventListener("change", () => this.updateEquipmentSaveState());
      }
    });

    this.elements.equipmentReferencePointPicker?.addEventListener(
      "change",
      (e) => this.handleReferencePointSelection(e)
    );

    this.elements.saveEquipmentButton?.addEventListener("click", () =>
      this.saveEquipmentEntry()
    );

    this.elements.resetEquipmentButton?.addEventListener("click", () =>
      this.resetEquipmentForm()
    );
  }

  refreshEquipmentUI() {
    this.renderReferencePointOptions();
    this.renderEquipmentSetupByOptions();
    this.renderEquipmentPickerOptions();
    this.renderEquipmentList();
    this.updateEquipmentSaveState();
  }

  resetEquipmentForm() {
    [
      this.elements.equipmentSetupAt,
      this.elements.equipmentTearDownAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentUsed,
      this.elements.equipmentSetupBy,
      this.elements.equipmentWorkNotes,
    ].forEach((el) => {
      if (el) el.value = "";
    });
    if (this.elements.equipmentReferencePointPicker) {
      this.elements.equipmentReferencePointPicker.value = "";
    }
    if (this.elements.equipmentUsed) {
      Array.from(this.elements.equipmentUsed.options).forEach((opt) => {
        opt.selected = false;
      });
    }
    if (this.elements.equipmentFormStatus) {
      this.elements.equipmentFormStatus.textContent = "";
    }
    if (this.elements.saveEquipmentButton) {
      this.elements.saveEquipmentButton.textContent = "Save Equipment Entry";
    }
    if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "";
    }
    this.currentEquipmentLocation = null;
    this.editingEquipmentId = null;
    this.updateEquipmentSaveState();
  }

  updateEquipmentSaveState() {
    if (!this.elements.saveEquipmentButton) return;
    const requiredFields = [
      this.elements.equipmentSetupAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentSetupBy,
    ];
    const canSave =
      !!this.currentProject &&
      requiredFields.every((el) => el && el.value.trim().length > 0);
    this.elements.saveEquipmentButton.disabled = !canSave;
  }

  renderReferencePointOptions() {
    const picker = this.elements.equipmentReferencePointPicker;
    const datalist = this.elements.equipmentReferencePointOptions;
    const project = this.currentProject;
    if (!picker || !datalist || !project) {
      if (picker) picker.innerHTML = "";
      if (datalist) datalist.innerHTML = "";
      return;
    }

    const options = new Set();
    (project.pointFiles || []).forEach((pf) => {
      (pf.points || []).forEach((pt) => {
        const labelParts = [pt.pointNumber, pt.description]
          .map((part) => part?.toString().trim())
          .filter(Boolean);
        const label = labelParts.join(" · ");
        if (label) options.add(label);
      });
    });
    (project.referencePoints || []).forEach((name) => {
      if (name && name.trim()) options.add(name.trim());
    });
    (project.equipmentLogs || []).forEach((log) => {
      if (log.referencePoint && log.referencePoint.trim()) {
        options.add(log.referencePoint.trim());
      }
    });

    const sortedOptions = Array.from(options).sort((a, b) => {
      const priority = (label) => (/base/i.test(label) || /rerf/i.test(label)) ? 1 : 0;
      const aPriority = priority(a);
      const bPriority = priority(b);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });

    picker.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      sortedOptions.length > 0
        ? "Select a stored reference point"
        : "No saved reference points";
    picker.appendChild(placeholder);

    sortedOptions.forEach((label) => {
      const opt = document.createElement("option");
      opt.value = label;
      opt.dataset.label = label;
      opt.textContent = label;
      picker.appendChild(opt);
    });

    datalist.innerHTML = "";
    sortedOptions.forEach((label) => {
      const opt = document.createElement("option");
      opt.value = label;
      datalist.appendChild(opt);
    });
  }

  renderEquipmentSetupByOptions() {
    const select = this.elements.equipmentSetupBy;
    if (!select) return;

    const previousValue = select.value;
    select.innerHTML = "";
    const memberNames = this.getActiveTeamMembers()
      .map((entry) => entry.name)
      .filter(Boolean);

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      memberNames.length > 0
        ? "Select team member"
        : "Add team members in settings";
    select.appendChild(placeholder);

    memberNames
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .forEach((member) => {
        const opt = document.createElement("option");
        opt.value = member;
        opt.textContent = member;
        select.appendChild(opt);
      });

    select.value = previousValue;
    if (previousValue && select.value !== previousValue) {
      const fallback = document.createElement("option");
      fallback.value = previousValue;
      fallback.textContent = previousValue;
      select.appendChild(fallback);
      select.value = previousValue;
    }
  }

  renderEquipmentPickerOptions() {
    const select = this.elements.equipmentUsed;
    if (!select) return;

    const previousSelection = Array.from(select.selectedOptions).map(
      (opt) => opt.value
    );
    const project = this.currentProject;
    const names = new Set();

    (this.getEquipmentSettings() || [])
      .filter((entry) => entry && !entry.archived && entry.name)
      .forEach((entry) => names.add(entry.name));
    project?.equipmentLogs?.forEach((log) => {
      (log.equipmentUsed || [])
        .filter(Boolean)
        .forEach((name) => names.add(name));
    });
    previousSelection.filter(Boolean).forEach((name) => names.add(name));

    const sorted = Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.hidden = true;
    placeholder.textContent =
      sorted.length > 0
        ? "Select equipment used (optional)"
        : "Add equipment names in settings";
    select.appendChild(placeholder);

    sorted.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    previousSelection
      .filter(Boolean)
      .forEach((value) => {
        const opt = Array.from(select.options).find((o) => o.value === value);
        if (!opt) {
          const fallback = document.createElement("option");
          fallback.value = value;
          fallback.textContent = value;
          select.appendChild(fallback);
        }
      });

    Array.from(select.options).forEach((opt) => {
      opt.selected = previousSelection.includes(opt.value);
    });
  }

  handleReferencePointSelection(event) {
    const option = event.target?.selectedOptions?.[0];
    const label = option?.dataset?.label || option?.value || "";
    if (this.elements.equipmentReferencePoint) {
      this.elements.equipmentReferencePoint.value = label;
    }
    this.updateEquipmentSaveState();
  }

  rememberReferencePoint(name) {
    const trimmed = name?.trim();
    if (!trimmed || !this.currentProject) return;
    this.currentProject.referencePoints = Array.isArray(
      this.currentProject.referencePoints
    )
      ? this.currentProject.referencePoints
      : [];
    const exists = this.currentProject.referencePoints.some(
      (rp) => rp.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      this.currentProject.referencePoints.push(trimmed);
    }
  }

  captureEquipmentLocation() {
    if (!navigator.geolocation) {
      if (this.elements.equipmentLocationStatus) {
        this.elements.equipmentLocationStatus.textContent =
          "Geolocation not supported.";
      }
      return;
    }
    if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "Getting location…";
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentEquipmentLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          mapTile: this.buildStaticMapUrl(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy
          ),
        };
        if (this.elements.equipmentLocationStatus) {
          this.elements.equipmentLocationStatus.textContent = `Lat ${pos.coords.latitude.toFixed(
            6
          )}, Lon ${pos.coords.longitude.toFixed(
            6
          )} (±${pos.coords.accuracy.toFixed(1)} m)`;
        }
        this.updateEquipmentSaveState();
      },
      () => {
        if (this.elements.equipmentLocationStatus) {
          this.elements.equipmentLocationStatus.textContent =
            "Unable to get location.";
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  saveEquipmentEntry() {
    if (!this.currentProject) return;
    this.currentProject.equipmentLogs = this.currentProject.equipmentLogs || [];
    const referencePoint =
      this.elements.equipmentReferencePoint?.value.trim() || "";
    const equipmentUsed = Array.from(
      this.elements.equipmentUsed?.selectedOptions || []
    )
      .map((opt) => opt.value)
      .filter(Boolean);
    const workNotes = this.elements.equipmentWorkNotes?.value.trim() || "";
    const payload = {
      setupAt: this.elements.equipmentSetupAt?.value || "",
      tearDownAt: this.elements.equipmentTearDownAt?.value || "",
      baseHeight: this.elements.equipmentBaseHeight?.value.trim() || "",
      referencePoint,
      equipmentUsed,
      setupBy: this.elements.equipmentSetupBy?.value.trim() || "",
      workNotes,
    };

    if (referencePoint) {
      this.rememberReferencePoint(referencePoint);
    }

    if (this.editingEquipmentId) {
      const existingIndex = this.currentProject.equipmentLogs.findIndex(
        (log) => log.id === this.editingEquipmentId
      );
      if (existingIndex !== -1) {
        const existing = this.currentProject.equipmentLogs[existingIndex];
        const updated = Object.assign(existing, payload);
        updated.location =
          this.currentEquipmentLocation || existing.location || null;
        updated.recordedAt = existing.recordedAt || new Date().toISOString();
      }
    } else {
      const entry = new EquipmentLog({
        id: Date.now().toString(),
        ...payload,
        location: this.currentEquipmentLocation,
        recordedAt: new Date().toISOString(),
      });
      this.currentProject.equipmentLogs.push(entry);
    }
    this.saveProjects();
    this.renderReferencePointOptions();
    this.renderEquipmentList();
    this.onEquipmentLogsChanged();
    this.resetEquipmentForm();
  }

  renderEquipmentList() {
    if (!this.elements.equipmentList || !this.elements.equipmentSummary) return;
    const container = this.elements.equipmentList;
    container.innerHTML = "";

    const project = this.currentProject;
    if (!project) {
      this.elements.equipmentSummary.textContent =
        "Select a project to log equipment.";
      return;
    }

    if (!project.equipmentLogs?.length) {
      this.elements.equipmentSummary.textContent =
        "No equipment logged yet.";
      return;
    }

    this.elements.equipmentSummary.textContent = `${
      project.equipmentLogs.length
    } equipment entr${project.equipmentLogs.length === 1 ? "y" : "ies"}.`;

    project.equipmentLogs
      .slice()
      .sort(
        (a, b) =>
          new Date(b.setupAt || b.recordedAt) - new Date(a.setupAt || a.recordedAt)
      )
      .forEach((log) => {
        const card = document.createElement("div");
        card.className = "card equipment-card";
        const setupDate = log.setupAt ? new Date(log.setupAt) : null;
        const teardownDate = log.tearDownAt ? new Date(log.tearDownAt) : null;
        const equipmentList =
          log.equipmentUsed?.length && log.equipmentUsed.filter(Boolean).length
            ? log.equipmentUsed.filter(Boolean).join(", ")
            : "Equipment not specified";
        const setupBy = log.setupBy || "Not recorded";
        const locationText = log.location
          ? `Lat ${log.location.lat.toFixed(6)}, Lon ${log.location.lon.toFixed(
              6
            )} (±${log.location.accuracy.toFixed(1)} m)`
          : "No GPS captured";
        const mapTile = this.getEquipmentMapUrl(log.location);
        const mapThumb = mapTile
          ? `<img class="equipment-map-thumb" src="${this.escapeHtml(
              mapTile
            )}" alt="Base location map" loading="lazy" />`
          : '<div class="equipment-map-thumb placeholder">GPS not captured</div>';
        const workNotes = log.workNotes?.trim();

        card.innerHTML = `
          <div class="equipment-card-header">
            ${this.buildCalendarIcon(setupDate)}
            <div class="equipment-card-title">
              <div class="equipment-name">${this.escapeHtml(equipmentList)}</div>
              <div class="equipment-subtitle">Base height: ${this.escapeHtml(
                log.baseHeight || "—"
              )} · Reference: ${this.escapeHtml(log.referencePoint || "—")}</div>
              <div class="equipment-subtitle">Setup by ${this.escapeHtml(
                setupBy
              )}</div>
            </div>
            ${mapThumb}
          </div>
          <div class="equipment-meta-grid">
            <div><span class="label">Setup at</span><span class="value">${this.escapeHtml(
              setupDate ? setupDate.toLocaleString() : "Not set"
            )}</span></div>
            <div><span class="label">Tear down</span><span class="value">${this.escapeHtml(
              teardownDate ? teardownDate.toLocaleString() : "Not recorded"
            )}</span></div>
            <div><span class="label">Location</span><span class="value">${this.escapeHtml(
              locationText
            )}</span></div>
            <div><span class="label">Logged</span><span class="value">${this.escapeHtml(
              new Date(log.recordedAt).toLocaleString()
            )}</span></div>
          </div>
          ${
            workNotes
              ? `<div class="equipment-notes">Work / Goal: ${this.escapeHtml(
                  workNotes
                )}</div>`
              : ""
          }
        `;

        const actions = document.createElement("div");
        actions.className = "equipment-actions";

        const teardownBtn = document.createElement("button");
        teardownBtn.type = "button";
        teardownBtn.textContent = "Log Tear Down Now";
        teardownBtn.addEventListener("click", () =>
          this.logEquipmentTeardown(log.id)
        );
        actions.appendChild(teardownBtn);

        if (log.location) {
          const navBtn = document.createElement("button");
          navBtn.type = "button";
          navBtn.textContent = "Navigate to this base";
          navBtn.addEventListener("click", () =>
            this.openEquipmentInNavigation(log.id)
          );
          actions.appendChild(navBtn);
        }

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () =>
          this.startEditingEquipmentEntry(log.id)
        );
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "danger";
        deleteBtn.addEventListener("click", () =>
          this.deleteEquipmentEntry(log.id)
        );
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        container.appendChild(card);
      });
  }

  logEquipmentTeardown(id) {
    const project = this.currentProject;
    if (!project?.equipmentLogs) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry) return;
    entry.tearDownAt = new Date().toISOString();
    this.saveProjects();
    this.renderEquipmentList();
    this.onEquipmentLogsChanged();
  }

  openEquipmentInNavigation(id) {
    const project = this.currentProject;
    if (!project?.equipmentLogs) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry?.location) return;
    this.onNavigateToEquipment(id);
  }

  startEditingEquipmentEntry(id) {
    const project = this.currentProject;
    if (!project?.equipmentLogs) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry) return;
    this.editingEquipmentId = id;
    if (this.elements.equipmentSetupAt)
      this.elements.equipmentSetupAt.value = entry.setupAt || "";
    if (this.elements.equipmentTearDownAt)
      this.elements.equipmentTearDownAt.value = entry.tearDownAt || "";
    if (this.elements.equipmentBaseHeight)
      this.elements.equipmentBaseHeight.value = entry.baseHeight || "";
    if (this.elements.equipmentReferencePoint)
      this.elements.equipmentReferencePoint.value = entry.referencePoint || "";
    if (this.elements.equipmentSetupBy)
      this.elements.equipmentSetupBy.value = entry.setupBy || "";
    if (this.elements.equipmentWorkNotes)
      this.elements.equipmentWorkNotes.value = entry.workNotes || "";
    this.renderEquipmentPickerOptions();
    if (this.elements.equipmentUsed) {
      const desired = new Set(entry.equipmentUsed || []);
      Array.from(this.elements.equipmentUsed.options).forEach((opt) => {
        opt.selected = desired.has(opt.value);
      });
    }
    if (
      this.elements.equipmentSetupBy &&
      entry.setupBy &&
      this.elements.equipmentSetupBy.value !== entry.setupBy
    ) {
      const opt = document.createElement("option");
      opt.value = entry.setupBy;
      opt.textContent = entry.setupBy;
      this.elements.equipmentSetupBy.appendChild(opt);
      this.elements.equipmentSetupBy.value = entry.setupBy;
    }
    if (this.elements.equipmentFormStatus) {
      this.elements.equipmentFormStatus.textContent =
        "Editing existing equipment entry";
    }
    if (this.elements.saveEquipmentButton) {
      this.elements.saveEquipmentButton.textContent = "Update Equipment Entry";
    }
    if (this.elements.equipmentReferencePointPicker) {
      this.elements.equipmentReferencePointPicker.value =
        entry.referencePoint || "";
    }
    this.currentEquipmentLocation = entry.location || null;
    if (this.elements.equipmentLocationStatus && entry.location) {
      this.elements.equipmentLocationStatus.textContent = `Lat ${entry.location.lat.toFixed(
        6
      )}, Lon ${entry.location.lon.toFixed(
        6
      )} (±${entry.location.accuracy.toFixed(1)} m)`;
    } else if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "";
    }
    this.updateEquipmentSaveState();
  }

  deleteEquipmentEntry(id) {
    const project = this.currentProject;
    if (!project?.equipmentLogs) return;
    if (!confirm("Delete this equipment entry?")) return;
    project.equipmentLogs = project.equipmentLogs.filter((log) => log.id !== id);
    this.saveProjects();
    this.renderReferencePointOptions();
    this.renderEquipmentList();
    this.onEquipmentLogsChanged();
    if (this.editingEquipmentId === id) {
      this.resetEquipmentForm();
    }
  }
}
