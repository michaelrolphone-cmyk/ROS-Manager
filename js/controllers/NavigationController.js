import NavigationBookmark from "../models/NavigationBookmark.js";
import { buildMapboxStaticUrl } from "../services/MapboxService.js";

export default class NavigationController {
  constructor({
    elements = {},
    getCurrentProject,
    saveProjects,
    getEquipmentLogs,
    onTargetChanged,
    getDeviceId,
    getPeerLocations,
    onLocationUpdate,
  }) {
    this.elements = elements;
    this.getCurrentProject = getCurrentProject;
    this.saveProjects = saveProjects;
    this.getEquipmentLogs = getEquipmentLogs;
    this.onTargetChanged = onTargetChanged;
    this.getDeviceId = getDeviceId;
    this.getPeerLocations = getPeerLocations;
    this.onLocationUpdate = onLocationUpdate;

    this.deviceHeading = null;
    this.travelHeading = null;
    this.currentPosition = null;
    this.previousPosition = null;
    this.targetLocation = null;
    this.targetBearing = null;
    this.targetDistanceFeet = null;
    this.headingSource = "Waiting";
    this.orientationSensor = null;
    this.watchId = null;
    this.mapFailed = false;
    this.viewMode = "compass";

    this.ctx = this.elements.compassCanvas?.getContext("2d") || null;

    this.normalizeAngle = (angle) => ((angle % 360) + 360) % 360;

    this.bindEvents();
    this.prepareSelectors();
    this.startListeners();
  }

  bindEvents() {
    this.elements.saveBookmarkButton?.addEventListener("click", () =>
      this.saveBookmarkFromCurrent()
    );

    this.elements.targetSelect?.addEventListener("change", (e) => {
      const id = e.target.value;
      this.handleTargetSelection(id);
    });

    this.elements.equipmentSelect?.addEventListener("change", (e) => {
      const id = e.target.value;
      this.applyEquipmentTarget(id);
    });

    this.elements.refreshButton?.addEventListener("click", () => {
      this.renderTargetOptions();
      this.renderEquipmentOptions();
      this.updateBookmarksList();
    });

    this.elements.toggleViewButton?.addEventListener("click", () =>
      this.toggleViewMode()
    );

    this.elements.clearTargetButton?.addEventListener("click", () =>
      this.clearTarget()
    );
  }

  startListeners() {
    this.startSensorHeading();
    this.requestOrientation();
    this.beginGeolocationWatch();
  }

  startSensorHeading() {
    if (typeof window.AbsoluteOrientationSensor === "undefined") return;

    try {
      this.orientationSensor = new AbsoluteOrientationSensor({
        frequency: 30,
        referenceFrame: "device",
      });

      this.orientationSensor.addEventListener("reading", () => {
        const q = this.orientationSensor?.quaternion;
        if (!q || q.length < 4) return;

        const heading = this.calculateHeadingFromQuaternion(q);

        this.applyDeviceHeading(heading, "Sensor");
      });

      this.orientationSensor.addEventListener("error", (event) => {
        if (event.error?.name === "NotAllowedError") {
          this.setStatus("Sensor permission denied; falling back to compass.");
        } else {
          this.setStatus("Sensor error; falling back to compass readings.");
        }
      });

      this.orientationSensor.start();
    } catch (err) {
      this.setStatus("Unable to start device sensors; using compass/travel heading.");
    }
  }

  requestOrientation() {
    if (typeof window.DeviceOrientationEvent === "undefined") {
      this.setStatus("Device compass not available; using travel heading.");
      return;
    }

    const handler = (event) => {
      if (this.headingSource === "Sensor") return;
      const heading = typeof event.webkitCompassHeading === "number"
        ? event.webkitCompassHeading
        : typeof event.alpha === "number"
          ? 360 - event.alpha
          : null;
      if (heading !== null) {
        this.applyDeviceHeading(heading, "Compass");
      }
    };

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === "granted") {
            window.addEventListener("deviceorientation", handler, true);
          } else {
            this.setStatus("Compass permission denied; tracking travel direction.");
          }
        })
        .catch(() =>
          this.setStatus("Compass permission error; tracking travel direction.")
        );
    } else {
      window.addEventListener("deviceorientation", handler, true);
    }
  }

  beginGeolocationWatch() {
    if (!navigator.geolocation) {
      this.setStatus("Geolocation not supported in this browser.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) => {
        this.setStatus(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }

  handlePositionUpdate(position) {
    const coords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    if (this.currentPosition) {
      this.travelHeading = this.bearingBetween(
        this.currentPosition,
        coords
      );
      if (!this.deviceHeading) this.headingSource = "Travel";
    }

    this.previousPosition = this.currentPosition;
    this.currentPosition = coords;
    if (typeof this.onLocationUpdate === "function") {
      this.onLocationUpdate(coords);
    }
    this.updateNavigationState();
  }

  updateNavigationState() {
    if (this.targetLocation && this.currentPosition) {
      this.targetBearing = this.bearingBetween(
        this.currentPosition,
        this.targetLocation
      );
      this.targetDistanceFeet = this.distanceFeet(
        this.currentPosition,
        this.targetLocation
      );
    } else {
      this.targetBearing = null;
      this.targetDistanceFeet = null;
    }

    this.updateReadouts();
    this.renderNearestPoints();
    this.drawCompass();
    this.updateMapView();
  }

  drawCompass() {
    if (!this.ctx || !this.elements.compassCanvas) return;
    const ctx = this.ctx;
    const canvas = this.elements.compassCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    const heading = this.deviceHeading ?? this.travelHeading;

    const peers = typeof this.getPeerLocations === "function"
      ? this.getPeerLocations() || []
      : [];

    const northAngle = heading !== null ? this.normalizeAngle(-heading) : 0;
    const youAngle = heading !== null
      ? 0
      : this.normalizeAngle(this.travelHeading ?? 0);
    const targetAngle = this.targetBearing !== null
      ? this.normalizeAngle(
        heading !== null ? this.targetBearing - heading : this.targetBearing
      )
      : null;

    const peerAngles = [];
    if (this.currentPosition && peers.length) {
      peers.forEach((peer) => {
        if (!peer || peer.id === this.getDeviceId?.()) return;
        if (typeof peer.lat !== "number" || typeof peer.lon !== "number") {
          return;
        }
        const bearing = this.bearingBetween(this.currentPosition, peer);
        const distance = this.distanceFeet(this.currentPosition, peer);
        const idSuffix = typeof peer.id === "string" ? peer.id.slice(-4) : "";
        const labelName = peer.teamMember || `User ${idSuffix || ""}`.trim();
        const angle = heading !== null
          ? this.normalizeAngle(bearing - heading)
          : this.normalizeAngle(bearing);
        peerAngles.push({
          angle,
          distance,
          label: `${labelName} (${distance.toFixed(0)} ft)`,
        });
      });
    }

    this.drawArrow(centerX, centerY, radius * 0.9, northAngle, "#dc2626", "N");
    this.drawArrow(centerX, centerY, radius * 0.7, youAngle, "#2563eb", "You");

    const peerColors = ["#f59e0b", "#a855f7", "#0ea5e9", "#f97316", "#14b8a6"];
    peerAngles.forEach((peer, idx) => {
      const color = peerColors[idx % peerColors.length];
      this.drawArrow(
        centerX,
        centerY,
        radius * 0.75,
        peer.angle,
        color,
        peer.label
      );
    });

    if (targetAngle !== null) {
      this.drawArrow(
        centerX,
        centerY,
        radius * 0.85,
        targetAngle,
        "#16a34a",
        "Target"
      );
    }
  }

  drawArrow(cx, cy, length, angleDeg, color, label) {
    const ctx = this.ctx;
    if (!ctx) return;

    const angle = (angleDeg - 90) * (Math.PI / 180);
    const endX = cx + length * Math.cos(angle);
    const endY = cy + length * Math.sin(angle);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const headLength = 12;
    const headAngle = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - headAngle),
      endY - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
      endX - headLength * Math.cos(angle + headAngle),
      endY - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = "12px Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, endX, endY - 8);
    }
  }

  updateReadouts() {
    const headingLabel = this.elements.headingLabel;
    const bearingLabel = this.elements.targetBearingLabel;
    const distanceLabel = this.elements.targetDistanceLabel;
    const offsetLabel = this.elements.offsetLabel;

    const headingValue = this.deviceHeading ?? this.travelHeading;
    const headingText = headingValue !== null
      ? `${headingValue.toFixed(1)}° (${this.headingSource || "Travel"})`
      : "--";
    if (headingLabel) headingLabel.textContent = headingText;

    if (bearingLabel) {
      bearingLabel.textContent = this.targetBearing !== null
        ? `${this.targetBearing.toFixed(1)}°`
        : "--";
    }

    if (distanceLabel) {
      distanceLabel.textContent = this.targetDistanceFeet !== null
        ? `${this.targetDistanceFeet.toFixed(1)} ft`
        : "--";
    }

    if (offsetLabel) {
      const heading = headingValue ?? 0;
      const offset = this.targetBearing !== null
        ? ((this.targetBearing - heading + 540) % 360) - 180
        : null;
      offsetLabel.textContent = offset !== null
        ? `${offset.toFixed(1)}° from line`
        : "--";
    }
  }

  applyDeviceHeading(rawHeading, source) {
    const screenOffset = this.getScreenOrientationOffset();
    const adjustedHeading = this.normalizeAngle(rawHeading + screenOffset);
    this.deviceHeading = adjustedHeading;
    this.headingSource = source;
    this.updateReadouts();
    this.drawCompass();
  }

  getScreenOrientationOffset() {
    const orientation = window.screen?.orientation;
    const angle = typeof orientation?.angle === "number"
      ? orientation.angle
      : typeof window.orientation === "number"
        ? window.orientation
        : 0;
    return this.normalizeAngle(angle);
  }

  calculateHeadingFromQuaternion([x, y, z, w]) {
    const sinyCosp = 2 * (w * z + x * y);
    const cosyCosp = 1 - 2 * (y * y + z * z);
    const headingRad = Math.atan2(sinyCosp, cosyCosp);
    const heading = (headingRad * 180) / Math.PI;
    return this.normalizeAngle(heading);
  }

  updateMapView() {
    const mapPanel = this.elements.mapPanel;
    const mapFrame = this.elements.mapFrame;
    const mapStatus = this.elements.mapStatus;
    const compassPanel = this.elements.compassCanvas?.closest(
      ".navigation-panel"
    );
    const project = this.getCurrentProject?.();
    const localization = project?.localization;
    const target = this.targetLocation || localization?.anchorGeo;
    const mapAvailable =
      !!localization && !!localization.points?.length && !!target;

    this.updateViewToggleState(mapAvailable);

    if (!mapPanel || !mapFrame || !compassPanel) return;

    const shouldShowMap =
      this.viewMode === "map" && mapAvailable && target && !this.mapFailed;

    if (!shouldShowMap) {
      mapPanel.classList.add("hidden");
      compassPanel.classList.remove("hidden");
      if (!mapAvailable && mapStatus) {
        mapStatus.textContent = "Apply GPS localization and choose a target to view the map.";
      }
      return;
    }

    const src = buildMapboxStaticUrl(target.lat, target.lon, {
      zoom: 16,
      width: 800,
      height: 320,
      markerColor: "ef4444",
    });

    mapPanel.classList.remove("hidden");
    compassPanel.classList.add("hidden");
    if (mapStatus) mapStatus.textContent = "Loading map preview…";

    if (!src) {
      this.mapFailed = true;
      mapPanel.classList.add("hidden");
      compassPanel.classList.remove("hidden");
      if (mapStatus)
        mapStatus.textContent = "Map unavailable, falling back to compass.";
      return;
    }

    mapFrame.onload = () => {
      this.mapFailed = false;
      mapPanel.classList.remove("hidden");
      compassPanel.classList.add("hidden");
      if (mapStatus)
        mapStatus.textContent = `Map ready for ${localization?.anchorLabel || "anchor"}.`;
    };
    mapFrame.onerror = () => {
      this.mapFailed = true;
      mapPanel.classList.add("hidden");
      compassPanel.classList.remove("hidden");
      if (mapStatus)
        mapStatus.textContent = "Map unavailable, falling back to compass.";
    };
    mapFrame.src = src;
  }

  updateViewToggleState(canShowMap) {
    const button = this.elements.toggleViewButton;
    if (!button) return;

    const viewingMap = this.viewMode === "map";
    button.disabled = !canShowMap && !viewingMap;
    button.textContent = viewingMap
      ? "Switch to Compass View"
      : canShowMap
        ? "Switch to Map View"
        : "Map preview unavailable";
  }

  toggleViewMode() {
    const project = this.getCurrentProject?.();
    const localization = project?.localization;
    const target = this.targetLocation || localization?.anchorGeo;
    const hasMapTarget =
      !!localization && !!localization.points?.length && !!target;

    if (this.viewMode === "compass" && !hasMapTarget) {
      this.setStatus("Apply GPS localization and set a target to open the map.");
      this.updateViewToggleState(false);
      return;
    }

    this.viewMode = this.viewMode === "compass" ? "map" : "compass";
    this.updateNavigationState();
  }

  renderNearestPoints() {
    const container = this.elements.nearestPointsList;
    const project = this.getCurrentProject?.();
    if (!container) return;

    container.innerHTML = "";

    if (!this.currentPosition) {
      container.textContent = "Waiting for GPS fix…";
      return;
    }

    const localizationPoints = project?.localization?.points || [];
    const bookmarks = project?.navigationBookmarks || [];

    const candidates = [];

    localizationPoints.forEach((pt) => {
      if (typeof pt?.lat !== "number" || typeof pt?.lon !== "number") return;
      candidates.push({
        label: pt.label || "Localized point",
        lat: pt.lat,
        lon: pt.lon,
        source: "Localized grid",
      });
    });

    bookmarks.forEach((bm) => {
      if (typeof bm?.latitude !== "number" || typeof bm?.longitude !== "number") return;
      candidates.push({
        label: bm.name || "Saved location",
        lat: bm.latitude,
        lon: bm.longitude,
        source: "Bookmark",
      });
    });

    if (!candidates.length) {
      container.textContent = "Add localization or bookmarks to see nearby points.";
      return;
    }

    const nearest = candidates
      .map((entry) => ({
        ...entry,
        distance: this.distanceFeet(this.currentPosition, entry),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    nearest.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "nearby-point-row";

      const label = document.createElement("div");
      label.className = "nearby-point-label";
      label.textContent = entry.label;

      const meta = document.createElement("div");
      meta.className = "nearby-point-meta";
      meta.textContent = `${entry.source} • ${entry.distance.toFixed(0)} ft`;

      row.appendChild(label);
      row.appendChild(meta);
      container.appendChild(row);
    });
  }

  saveBookmarkFromCurrent() {
    const project = this.getCurrentProject?.();
    if (!project) {
      this.setBookmarkStatus("Select a project first.");
      return;
    }
    if (!this.currentPosition) {
      this.setBookmarkStatus("Waiting for GPS fix before saving.");
      return;
    }
    const name = (this.elements.bookmarkName?.value || "").trim();
    if (!name) {
      this.setBookmarkStatus("Name this spot before saving.");
      return;
    }

    const cornerType = (this.elements.cornerType?.value || "").trim();
    const cornerStatus = (this.elements.cornerStatus?.value || "").trim();

    const entry = new NavigationBookmark({
      name,
      latitude: this.currentPosition.lat,
      longitude: this.currentPosition.lon,
      cornerType,
      cornerStatus,
      recordedAt: new Date().toISOString(),
    });

    project.navigationBookmarks = project.navigationBookmarks || [];
    project.navigationBookmarks.push(entry);
    this.saveProjects?.();
    this.setBookmarkStatus(`Saved ${name}.`);
    this.elements.bookmarkName.value = "";
    if (this.elements.cornerType) this.elements.cornerType.value = "";
    if (this.elements.cornerStatus) this.elements.cornerStatus.value = "";
    this.renderTargetOptions();
    this.updateBookmarksList();
  }

  prepareSelectors() {
    this.renderTargetOptions();
    this.renderEquipmentOptions();
    this.updateBookmarksList();
  }

  renderTargetOptions() {
    const select = this.elements.targetSelect;
    const project = this.getCurrentProject?.();
    if (!select) return;

    const previousValue = select.value;
    const desiredStructure = this.buildTargetOptionStructure(project);
    const currentStructure = this.collectTargetOptionStructure(select);

    const structuresMatch = this.targetOptionsEqual(
      currentStructure,
      desiredStructure
    );

    if (structuresMatch) {
      return;
    }

    select.innerHTML = "";
    desiredStructure.forEach((entry) => {
      if (entry.type === "option") {
        const opt = document.createElement("option");
        opt.value = entry.value;
        opt.textContent = entry.text;
        select.appendChild(opt);
        return;
      }

      if (entry.type === "optgroup") {
        const group = document.createElement("optgroup");
        group.label = entry.label;
        entry.options.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.textContent = option.text;
          group.appendChild(opt);
        });
        select.appendChild(group);
      }
    });

    if (previousValue) {
      select.value = previousValue;
    }
  }

  buildTargetOptionStructure(project) {
    const structure = [
      { type: "option", value: "", text: "Choose a navigation target" },
    ];

    const locPoints = project?.localization?.points || [];
    if (locPoints.length) {
      structure.push({
        type: "optgroup",
        label: `Localized grid (${project.localization.anchorLabel || "Anchor"})`,
        options: locPoints.map((pt) => ({
          value: `loc:${pt.id}`,
          text: `${pt.label} (${pt.lat.toFixed(5)}, ${pt.lon.toFixed(5)})`,
        })),
      });
    }

    const bookmarks = project?.navigationBookmarks || [];
    const bookmarkOptions = bookmarks
      .slice()
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .map((bookmark) => ({
        value: `bm:${bookmark.id}`,
        text: `${bookmark.name} (${bookmark.latitude.toFixed(5)}, ${bookmark.longitude.toFixed(5)})`,
      }));

    structure.push({
      type: "optgroup",
      label: "Saved GPS bookmarks",
      options: bookmarkOptions.length
        ? bookmarkOptions
        : [{ value: "", text: "No saved locations yet" }],
    });

    return structure;
  }

  collectTargetOptionStructure(select) {
    return Array.from(select.children).map((child) => {
      if (child.tagName === "OPTION") {
        return { type: "option", value: child.value, text: child.textContent };
      }

      if (child.tagName === "OPTGROUP") {
        return {
          type: "optgroup",
          label: child.label,
          options: Array.from(child.children)
            .filter((node) => node.tagName === "OPTION")
            .map((opt) => ({
              value: opt.value,
              text: opt.textContent,
            })),
        };
      }
      return null;
    }).filter(Boolean);
  }

  targetOptionsEqual(current, desired) {
    if (current.length !== desired.length) return false;

    return current.every((entry, index) => {
      const target = desired[index];
      if (!target || entry.type !== target.type) return false;

      if (entry.type === "option") {
        return entry.value === target.value && entry.text === target.text;
      }

      if (entry.type === "optgroup") {
        if (entry.label !== target.label) return false;
        if (entry.options.length !== target.options.length) return false;

        return entry.options.every(
          (opt, optIndex) =>
            opt.value === target.options[optIndex]?.value &&
            opt.text === target.options[optIndex]?.text
        );
      }
      return false;
    });
  }

  renderEquipmentOptions() {
    const select = this.elements.equipmentSelect;
    if (!select) return;
    const logs = this.getEquipmentLogs?.() || [];

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select base station";
    select.appendChild(placeholder);

    if (!logs.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No equipment logs with GPS";
      select.appendChild(opt);
      return;
    }

    logs
      .filter((log) => !!log.location)
      .forEach((log) => {
        const option = document.createElement("option");
        option.value = log.id;
        const labelDate = log.setupAt || log.recordedAt;
        const when = labelDate ? new Date(labelDate).toLocaleString() : "Logged";
        option.textContent = `${when} • ${log.location.lat.toFixed(5)}, ${log.location.lon.toFixed(5)}`;
        select.appendChild(option);
      });
  }

  updateBookmarksList() {
    const list = this.elements.bookmarksList;
    const project = this.getCurrentProject?.();
    if (!list) return;

    list.innerHTML = "";
    if (!project || !project.navigationBookmarks?.length) {
      const empty = document.createElement("div");
      empty.className = "subtitle";
      empty.textContent = "No saved locations yet.";
      list.appendChild(empty);
      return;
    }

    project.navigationBookmarks
      .slice()
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .forEach((bookmark) => {
        const card = document.createElement("div");
        card.className = "bookmark-card";
        const time = new Date(bookmark.recordedAt).toLocaleString();
        card.innerHTML = `
          <strong>${bookmark.name}</strong>
          <div class="subtitle" style="margin-top:4px">Saved ${time}</div>
          <div class="subtitle">${bookmark.latitude.toFixed(6)}, ${bookmark.longitude.toFixed(6)}</div>
        `;
        const details = document.createElement("div");
        details.className = "subtitle";
        const parts = [];
        if (bookmark.cornerType) parts.push(bookmark.cornerType);
        if (bookmark.cornerStatus) parts.push(bookmark.cornerStatus);
        if (parts.length) {
          details.textContent = parts.join(" • ");
          details.style.marginTop = "4px";
          card.appendChild(details);
        }
        list.appendChild(card);
      });
  }

  handleTargetSelection(value) {
    if (!value) {
      this.clearTarget();
      return;
    }
    if (value.startsWith("loc:")) {
      const id = value.slice(4);
      const project = this.getCurrentProject?.();
      const loc = project?.localization?.points?.find((pt) => pt.id === id);
      if (loc) {
        this.setTarget(
          { lat: loc.lat, lon: loc.lon },
          loc.label,
          { type: "localization", id, value }
        );
      } else {
        this.setStatus("Localized point missing.");
        this.clearTarget();
      }
      return;
    }
    if (value.startsWith("bm:")) {
      this.applyBookmarkTarget(value.slice(3));
      return;
    }
    this.applyBookmarkTarget(value);
  }

  applyBookmarkTarget(id) {
    const project = this.getCurrentProject?.();
    if (!project || !id) {
      this.clearTarget();
      return;
    }
    const target = project.navigationBookmarks?.find((entry) => entry.id === id);
    if (!target) {
      this.clearTarget();
      return;
    }
    this.setTarget(
      { lat: target.latitude, lon: target.longitude },
      target.name,
      { type: "bookmark", id, value: `bm:${id}` }
    );
  }

  applyEquipmentTarget(id) {
    const logs = this.getEquipmentLogs?.() || [];
    const log = logs.find((entry) => entry.id === id);
    if (!log || !log.location) {
      return;
    }
    this.setTarget(
      { lat: log.location.lat, lon: log.location.lon },
      "Base station",
      { type: "equipment", id, value: id }
    );
  }

  setTarget(coords, label = "Target", meta = {}) {
    this.targetLocation = coords;
    this.setStatus(`Target set to ${label}.`);
    if (typeof this.onTargetChanged === "function") {
      this.onTargetChanged({
        ...meta,
        coords,
        label,
        value: this.elements.targetSelect?.value || meta.value || "",
      });
    }
    this.updateNavigationState();
  }

  clearTarget(options = {}) {
    const { skipPersist = false } = options;
    this.targetLocation = null;
    this.targetBearing = null;
    this.targetDistanceFeet = null;
    if (this.elements.targetSelect) this.elements.targetSelect.value = "";
    if (this.elements.equipmentSelect) this.elements.equipmentSelect.value = "";
    this.setStatus("Target cleared.");
    this.updateReadouts();
    this.drawCompass();
    this.updateMapView();
    if (!skipPersist && typeof this.onTargetChanged === "function") {
      this.onTargetChanged({ value: "", coords: null, label: "" });
    }
  }

  setStatus(message) {
    if (this.elements.statusLabel) {
      this.elements.statusLabel.textContent = message;
    }
  }

  setBookmarkStatus(message) {
    if (this.elements.bookmarkStatus) {
      this.elements.bookmarkStatus.textContent = message;
    }
  }

  onProjectChanged() {
    this.prepareSelectors();
    this.applySavedTarget();
    this.viewMode = "compass";
    this.renderNearestPoints();
    this.updateMapView();
  }

  applySavedTarget() {
    const project = this.getCurrentProject?.();
    if (!project) {
      this.clearTarget({ skipPersist: true });
      return;
    }

    const saved = project.navigationTarget;
    const savedCoords = saved?.coords;
    if (
      !saved ||
      !savedCoords ||
      typeof savedCoords.lat !== "number" ||
      typeof savedCoords.lon !== "number"
    ) {
      this.clearTarget({ skipPersist: true });
      return;
    }

    const selectValue = saved.value ||
      (saved.type === "localization" && saved.id
        ? `loc:${saved.id}`
        : saved.type === "bookmark" && saved.id
          ? `bm:${saved.id}`
          : saved.type === "equipment"
            ? saved.id
            : "");

    this.targetLocation = savedCoords;
    this.targetBearing = null;
    this.targetDistanceFeet = null;
    if (this.elements.targetSelect && selectValue) {
      this.elements.targetSelect.value = selectValue;
    }
    if (this.elements.equipmentSelect) {
      this.elements.equipmentSelect.value =
        saved.type === "equipment" ? saved.id || "" : "";
    }
    this.setStatus(`Target set to ${saved.label || "Target"}.`);
    this.updateNavigationState();
  }

  onEquipmentLogsChanged() {
    this.renderEquipmentOptions();
  }

  bearingBetween(a, b) {
    const lat1 = this.toRadians(a.lat);
    const lat2 = this.toRadians(b.lat);
    const dLon = this.toRadians(b.lon - a.lon);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  distanceFeet(a, b) {
    const R = 6371000; // meters
    const lat1 = this.toRadians(a.lat);
    const lat2 = this.toRadians(b.lat);
    const dLat = this.toRadians(b.lat - a.lat);
    const dLon = this.toRadians(b.lon - a.lon);

    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const c =
      2 *
      Math.atan2(
        Math.sqrt(
          sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
        ),
        Math.sqrt(
          1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
        )
      );
    const meters = R * c;
    return meters * 3.28084;
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  toDegrees(rad) {
    return (rad * 180) / Math.PI;
  }
}
