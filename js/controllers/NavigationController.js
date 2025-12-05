import NavigationBookmark from "../models/NavigationBookmark.js";

export default class NavigationController {
  constructor({ elements = {}, getCurrentProject, saveProjects, getEquipmentLogs }) {
    this.elements = elements;
    this.getCurrentProject = getCurrentProject;
    this.saveProjects = saveProjects;
    this.getEquipmentLogs = getEquipmentLogs;

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

    this.ctx = this.elements.compassCanvas?.getContext("2d") || null;

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

        const [x, y, z, w] = q;
        const sinyCosp = 2 * (w * z + x * y);
        const cosyCosp = 1 - 2 * (y * y + z * z);
        const headingRad = Math.atan2(sinyCosp, cosyCosp);
        const heading = ((headingRad * 180) / Math.PI + 360) % 360;

        this.deviceHeading = heading;
        this.headingSource = "Sensor";
        this.updateReadouts();
        this.drawCompass();
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
        this.deviceHeading = (heading + 360) % 360;
        this.headingSource = "Compass";
        this.updateReadouts();
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

    const heading = this.deviceHeading ?? this.travelHeading ?? 0;

    this.drawArrow(centerX, centerY, radius * 0.9, 0, "#dc2626", "N");
    this.drawArrow(centerX, centerY, radius * 0.7, heading, "#2563eb", "You");

    if (this.targetBearing !== null) {
      this.drawArrow(
        centerX,
        centerY,
        radius * 0.85,
        this.targetBearing,
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

  updateMapView() {
    const mapPanel = this.elements.mapPanel;
    const mapFrame = this.elements.mapFrame;
    const mapStatus = this.elements.mapStatus;
    const compassPanel = this.elements.compassCanvas?.closest(
      ".navigation-panel"
    );
    const project = this.getCurrentProject?.();
    const localization = project?.localization;
    if (!mapPanel || !mapFrame || !compassPanel) return;

    if (!localization || !localization.points?.length) {
      mapPanel.classList.add("hidden");
      compassPanel.classList.remove("hidden");
      if (mapStatus) mapStatus.textContent = "Apply GPS localization to view the map.";
      return;
    }

    const target = this.targetLocation || localization.anchorGeo;
    if (!target) {
      mapPanel.classList.add("hidden");
      compassPanel.classList.remove("hidden");
      if (mapStatus) mapStatus.textContent = "Waiting for target coordinates.";
      return;
    }

    const spanLat = 0.0025;
    const spanLon = 0.0025;
    const bbox = `${target.lon - spanLon},${target.lat - spanLat},${target.lon + spanLon},${target.lat + spanLat}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${target.lat},${target.lon}`;

    mapPanel.classList.remove("hidden");
    compassPanel.classList.add("hidden");
    if (mapStatus) mapStatus.textContent = "Loading map preview…";

    mapFrame.onload = () => {
      this.mapFailed = false;
      mapPanel.classList.remove("hidden");
      compassPanel.classList.add("hidden");
      if (mapStatus)
        mapStatus.textContent = `Map ready for ${localization.anchorLabel || "anchor"}.`;
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

    const entry = new NavigationBookmark({
      name,
      latitude: this.currentPosition.lat,
      longitude: this.currentPosition.lon,
      recordedAt: new Date().toISOString(),
    });

    project.navigationBookmarks = project.navigationBookmarks || [];
    project.navigationBookmarks.push(entry);
    this.saveProjects?.();
    this.setBookmarkStatus(`Saved ${name}.`);
    this.elements.bookmarkName.value = "";
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

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a navigation target";
    select.appendChild(placeholder);

    const locPoints = project?.localization?.points || [];
    if (locPoints.length) {
      const group = document.createElement("optgroup");
      group.label = `Localized grid (${project.localization.anchorLabel || "Anchor"})`;
      locPoints.forEach((pt) => {
        const option = document.createElement("option");
        option.value = `loc:${pt.id}`;
        option.textContent = `${pt.label} (${pt.lat.toFixed(5)}, ${pt.lon.toFixed(5)})`;
        group.appendChild(option);
      });
      select.appendChild(group);
    }

    const bookmarks = project?.navigationBookmarks || [];
    const bookmarkGroup = document.createElement("optgroup");
    bookmarkGroup.label = "Saved GPS bookmarks";
    if (!bookmarks.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No saved locations yet";
      bookmarkGroup.appendChild(opt);
    } else {
      bookmarks
        .slice()
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
        .forEach((bookmark) => {
          const option = document.createElement("option");
          option.value = `bm:${bookmark.id}`;
          option.textContent = `${bookmark.name} (${bookmark.latitude.toFixed(5)}, ${bookmark.longitude.toFixed(5)})`;
          bookmarkGroup.appendChild(option);
        });
    }
    select.appendChild(bookmarkGroup);
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
        this.setTarget({ lat: loc.lat, lon: loc.lon }, loc.label);
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
    this.setTarget({ lat: target.latitude, lon: target.longitude }, target.name);
  }

  applyEquipmentTarget(id) {
    const logs = this.getEquipmentLogs?.() || [];
    const log = logs.find((entry) => entry.id === id);
    if (!log || !log.location) {
      return;
    }
    this.setTarget({ lat: log.location.lat, lon: log.location.lon }, "Base station");
  }

  setTarget(coords, label = "Target") {
    this.targetLocation = coords;
    this.setStatus(`Target set to ${label}.`);
    this.updateNavigationState();
  }

  clearTarget() {
    this.targetLocation = null;
    this.targetBearing = null;
    this.targetDistanceFeet = null;
    if (this.elements.targetSelect) this.elements.targetSelect.value = "";
    if (this.elements.equipmentSelect) this.elements.equipmentSelect.value = "";
    this.setStatus("Target cleared.");
    this.updateReadouts();
    this.drawCompass();
    this.updateMapView();
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
    this.clearTarget();
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
