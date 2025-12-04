export default class NavigationController {
  constructor({ elements }) {
    this.NAV_TARGET_KEY = "surveyNavigationTarget";
    this.elements = elements || {};
    this.navigationState = {
      target: this.loadStoredTarget(),
      watchId: null,
      currentPosition: null,
      lastPosition: null,
      distanceFeet: null,
      bearingToTarget: null,
      deviceHeading: null,
      travelHeading: null,
      headingSource: "Idle",
    };
    this.boundOrientationHandler = (event) => this.handleOrientationEvent(event);
    this.navigationCtx = null;
  }

  /* ===================== Initialization ===================== */
  initNavigation() {
    if (!this.elements.navigationCompass) return;
    this.navigationCtx = this.elements.navigationCompass.getContext("2d");
    this.updateTargetSummary();
    this.updateNavigationBadges();
    this.drawNavigationCompass();
    this.startLocationWatch();
    this.enableCompassSensor(true);
  }

  /* ===================== Sensor + Location ===================== */
  enableCompassSensor(skipPermissionRequest = false) {
    if (!window.DeviceOrientationEvent) {
      this.setNavigationStatus(
        "Device compass not supported; using movement heading instead."
      );
      this.navigationState.headingSource = "Travel bearing";
      this.updateNavigationBadges();
      return;
    }
    const startListener = () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        this.boundOrientationHandler
      );
      window.removeEventListener(
        "deviceorientation",
        this.boundOrientationHandler
      );
      const eventName =
        "ondeviceorientationabsolute" in window
          ? "deviceorientationabsolute"
          : "deviceorientation";
      window.addEventListener(eventName, this.boundOrientationHandler, {
        once: false,
        passive: true,
      });
      this.setNavigationStatus("Compass enabled. Move device to calibrate.");
    };

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (skipPermissionRequest) {
        this.setNavigationStatus("Tap Enable Compass to grant permission.");
        return;
      }
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === "granted") {
            startListener();
          } else {
            this.setNavigationStatus(
              "Compass permission denied; using travel bearing."
            );
            this.navigationState.headingSource = "Travel bearing";
          }
        })
        .catch(() => {
          this.setNavigationStatus("Compass permission blocked by browser.");
        });
    } else {
      startListener();
    }
  }

  handleOrientationEvent(event) {
    const heading =
      typeof event.webkitCompassHeading === "number"
        ? event.webkitCompassHeading
        : typeof event.alpha === "number"
          ? (360 - event.alpha + 360) % 360
          : null;
    if (heading === null || Number.isNaN(heading)) return;
    this.navigationState.deviceHeading = heading;
    this.navigationState.headingSource = "Device compass";
    this.updateNavigationBadges();
    this.drawNavigationCompass();
  }

  startLocationWatch() {
    if (!navigator.geolocation) {
      this.setNavigationStatus("Geolocation not supported by this browser.");
      return;
    }
    this.setNavigationStatus("Listening for GPS updates…");
    this.navigationState.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) =>
        this.setNavigationStatus(
          `Location error: ${err.message || "Unable to read position."}`
        ),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }

  handlePositionUpdate(position) {
    const current = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      timestamp: position.timestamp,
    };
    this.navigationState.lastPosition = this.navigationState.currentPosition;
    this.navigationState.currentPosition = current;

    if (
      typeof position.coords.heading === "number" &&
      !Number.isNaN(position.coords.heading)
    ) {
      this.navigationState.travelHeading = position.coords.heading;
      if (!this.navigationState.deviceHeading) {
        this.navigationState.headingSource = "GPS heading";
      }
    } else if (this.navigationState.lastPosition) {
      this.navigationState.travelHeading = this.calculateBearing(
        this.navigationState.lastPosition,
        current
      );
      if (!this.navigationState.deviceHeading) {
        this.navigationState.headingSource = "Travel bearing";
      }
    }

    if (this.navigationState.target) {
      this.navigationState.bearingToTarget = this.calculateBearing(
        current,
        this.navigationState.target
      );
      this.navigationState.distanceFeet = this.calculateDistanceFeet(
        current,
        this.navigationState.target
      );
    }

    this.updateNavigationBadges();
    this.drawNavigationCompass();
  }

  /* ===================== Target Management ===================== */
  markCurrentLocationAsTarget() {
    if (this.navigationState.currentPosition) {
      this.setTargetLocation({
        lat: this.navigationState.currentPosition.lat,
        lon: this.navigationState.currentPosition.lon,
      });
      return;
    }
    if (!navigator.geolocation) {
      this.setNavigationStatus("Cannot mark target without geolocation support.");
      return;
    }
    this.setNavigationStatus("Capturing current location for target…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.setTargetLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => this.setNavigationStatus("Unable to record current location."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  saveManualTarget() {
    const lat = parseFloat(this.elements.manualTargetLat?.value || "");
    const lon = parseFloat(this.elements.manualTargetLon?.value || "");
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      alert("Enter valid latitude and longitude values.");
      return;
    }
    this.setTargetLocation({ lat, lon });
    this.setNavigationStatus("Manual target saved.");
  }

  setTargetLocation(target) {
    this.navigationState.target = target;
    this.persistTarget(target);
    this.updateTargetSummary();
    if (this.navigationState.currentPosition) {
      this.navigationState.bearingToTarget = this.calculateBearing(
        this.navigationState.currentPosition,
        target
      );
      this.navigationState.distanceFeet = this.calculateDistanceFeet(
        this.navigationState.currentPosition,
        target
      );
    }
    this.updateNavigationBadges();
    this.drawNavigationCompass();
  }

  clearTargetLocation() {
    this.navigationState.target = null;
    this.navigationState.bearingToTarget = null;
    this.navigationState.distanceFeet = null;
    this.persistTarget(null);
    this.updateTargetSummary();
    this.updateNavigationBadges();
    this.drawNavigationCompass();
  }

  /* ===================== UI helpers ===================== */
  updateTargetSummary() {
    if (!this.elements.targetSummary) return;
    if (!this.navigationState.target) {
      this.elements.targetSummary.textContent = "No target recorded yet.";
      return;
    }
    const { lat, lon } = this.navigationState.target;
    this.elements.targetSummary.textContent = `Target stored at ${lat.toFixed(
      6
    )}, ${lon.toFixed(6)}.`;
  }

  updateNavigationBadges() {
    const headingDisplay =
      this.navigationState.deviceHeading ?? this.navigationState.travelHeading;
    if (this.elements.navigationHeadingSource) {
      const hasHeading =
        headingDisplay !== null && headingDisplay !== undefined;
      this.elements.navigationHeadingSource.textContent = hasHeading
        ? `${this.navigationState.headingSource}: ${headingDisplay.toFixed(1)}°`
        : `${this.navigationState.headingSource}: —`;
    }
    if (this.elements.navigationDistance) {
      const hasDistance =
        this.navigationState.distanceFeet !== null &&
        this.navigationState.distanceFeet !== undefined;
      this.elements.navigationDistance.textContent = hasDistance
        ? `Distance: ${this.navigationState.distanceFeet.toFixed(1)} ft`
        : "Distance: —";
    }
    const details = [];
    if (this.navigationState.currentPosition) {
      details.push(
        `Current: ${this.navigationState.currentPosition.lat.toFixed(
          6
        )}, ${this.navigationState.currentPosition.lon.toFixed(6)}`
      );
    }
    if (this.navigationState.travelHeading !== null) {
      details.push(`Travel heading: ${this.navigationState.travelHeading.toFixed(1)}°`);
    }
    if (this.navigationState.bearingToTarget !== null) {
      details.push(
        `Bearing to target: ${this.navigationState.bearingToTarget.toFixed(1)}°`
      );
    }
    if (this.elements.navigationDetails) {
      this.elements.navigationDetails.textContent = details.join(" • ");
    }
  }

  setNavigationStatus(message) {
    if (this.elements.navigationStatus) {
      this.elements.navigationStatus.textContent = message;
    }
  }

  drawNavigationCompass() {
    if (!this.elements.navigationCompass) return;
    if (!this.navigationCtx) {
      this.navigationCtx = this.elements.navigationCompass.getContext("2d");
    }
    const canvas = this.elements.navigationCompass;
    const ctx = this.navigationCtx;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 16;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    const drawArrow = (angleDeg, color, label) => {
      const angle = ((angleDeg - 90) * Math.PI) / 180;
      const endX = centerX + Math.cos(angle) * (radius - 18);
      const endY = centerY + Math.sin(angle) * (radius - 18);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const headX = centerX + Math.cos(angle) * (radius - 6);
      const headY = centerY + Math.sin(angle) * (radius - 6);
      ctx.beginPath();
      ctx.arc(headX, headY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "14px Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, endX, endY - 10);
    };

    drawArrow(0, "#ef4444", "North");

    const headingArrow =
      this.navigationState.deviceHeading ?? this.navigationState.travelHeading;
    if (headingArrow !== null && headingArrow !== undefined) {
      drawArrow(headingArrow, "#38bdf8", "Heading");
    }

    if (this.navigationState.bearingToTarget !== null) {
      drawArrow(this.navigationState.bearingToTarget, "#22c55e", "Target");
    }
  }

  /* ===================== Utilities ===================== */
  loadStoredTarget() {
    try {
      const raw = localStorage.getItem(this.NAV_TARGET_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
        return parsed;
      }
    } catch (err) {
      // Ignore malformed storage
    }
    return null;
  }

  persistTarget(target) {
    if (!target) {
      localStorage.removeItem(this.NAV_TARGET_KEY);
      return;
    }
    localStorage.setItem(this.NAV_TARGET_KEY, JSON.stringify(target));
  }

  calculateDistanceFeet(from, to) {
    const r = 6371000;
    const dLat = this.toRadians(to.lat - from.lat);
    const dLon = this.toRadians(to.lon - from.lon);
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = r * c;
    return meters * 3.28084;
  }

  calculateBearing(from, to) {
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);
    const dLon = this.toRadians(to.lon - from.lon);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }
}
