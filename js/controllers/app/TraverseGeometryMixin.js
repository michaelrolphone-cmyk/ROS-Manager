const TraverseGeometryMixin = (Base) =>
  class extends Base {
  /* ===================== Traverse geometry & drawing ===================== */
  computeTraversePointsForRecord(
    projectId,
    recordId,
    memo = {},
    visiting = {}
  ) {
    const project = this.projects[projectId];
    if (!project) return {};
    const records = project.records || {};
    const record = records[recordId];
    if (!record) return {};

    if (memo[recordId]) return memo[recordId];
    if (visiting[recordId]) {
      const startE = parseFloat(record.easting) || 0;
      const startN = parseFloat(record.northing) || 0;
      const startNum = parseInt(record.startPtNum, 10);
      const startPointNumber = Number.isFinite(startNum) ? startNum : 1;
      const geometry = {
        points: [{ x: startE, y: startN, pointNumber: startPointNumber }],
        polylines: [[{ x: startE, y: startN, pointNumber: startPointNumber }]],
        paths: [],
      };
      memo[recordId] = geometry;
      return geometry;
    }
    visiting[recordId] = true;

    let startX;
    let startY;
    const linkId = record.startFromRecordId;
    if (linkId && records[linkId]) {
      const prev = this.computeTraversePointsForRecord(
        projectId,
        linkId,
        memo,
        visiting
      );
      const prevMainLine = prev?.polylines?.[0] || prev?.points || [];
      if (prevMainLine && prevMainLine.length > 0) {
        const last = prevMainLine[prevMainLine.length - 1];
        startX = last.x;
        startY = last.y;
      }
    }
    if (startX === undefined || startY === undefined) {
      startX = parseFloat(record.easting) || 0;
      startY = parseFloat(record.northing) || 0;
    }

    const startNum = parseInt(record.startPtNum, 10);
    const startPointNumber = Number.isFinite(startNum) ? startNum : 1;
    const allCalls = this.getAllCalls(record);
    const geometry = this.buildTraverseGeometry(
      allCalls,
      startX,
      startY,
      startPointNumber
    );

    memo[recordId] = geometry;
    delete visiting[recordId];
    return geometry;
  }

  buildTraverseGeometry(calls, startX, startY, startNumber) {
    const points = [
      {
        x: startX,
        y: startY,
        pointNumber: startNumber,
      },
    ];
    const polylines = [];
    const paths = [];
    const counter = { value: startNumber };

    const walkPath = (callList, startPoint) => {
      const pathCalls = [];
      const polyline = [startPoint];
      let current = startPoint;
      (callList || []).forEach((call) => {
        if (!call) return;
        let parsed = null;
        try {
          parsed = this.parseBearing(call.bearing || "");
        } catch (e) {
          parsed = null;
        }
        if (!parsed) return;

        const startAzimuth = this.bearingToAzimuth(parsed);
        const curveMetrics = this.computeCurveMetrics(call, startAzimuth);
        const { segments } = this.buildCallSegments(
          call,
          startAzimuth,
          curveMetrics
        );
        if (!segments || segments.length === 0) return;

        segments.forEach((segment, idx) => {
          const azRad = (segment.azimuth * Math.PI) / 180;
          const dE = segment.distance * Math.sin(azRad);
          const dN = segment.distance * Math.cos(azRad);

          const intermediate = {
            x: current.x + dE,
            y: current.y + dN,
          };
          const isLast = idx === segments.length - 1;
          const pointToStore = isLast
            ? { ...intermediate, pointNumber: ++counter.value }
            : intermediate;
          if (isLast) points.push(pointToStore);
          polyline.push(pointToStore);
          current = pointToStore;
        });

        const nextPoint = current;
        pathCalls.push(call);

        (call.branches || []).forEach((branch) => {
          if (!branch || branch.length === 0) return;
          const branchResult = walkPath(branch, nextPoint);
          polylines.push(branchResult.polyline);
          paths.push(branchResult.path);
        });
      });

      return {
        polyline,
        path: {
          startPoint,
          startPointNumber: startPoint.pointNumber,
          calls: pathCalls,
        },
      };
    };

    const mainResult = walkPath(calls, points[0]);
    polylines.unshift(mainResult.polyline);
    paths.unshift(mainResult.path);

    return { points, polylines, paths };
  }

  drawTraversePreview(canvas, traverse) {
    if (!canvas) return;
    this.fitCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const polylines = traverse?.polylines || [];
    const points = traverse?.points || (Array.isArray(traverse) ? traverse : []);
    if (!points || points.length === 0) return;

    if (points.length === 1) {
      ctx.fillStyle = "#1e40af";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    let minX = points[0].x,
      maxX = points[0].x;
    let minY = points[0].y,
      maxY = points[0].y;
    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const padding = 10;
    let dx = maxX - minX;
    let dy = maxY - minY;
    if (dx === 0) dx = 1;
    if (dy === 0) dy = 1;

    const scaleX = (width - 2 * padding) / dx;
    const scaleY = (height - 2 * padding) / dy;
    const scale = Math.min(scaleX, scaleY);

    const toCanvas = (p) => {
      const x = padding + (p.x - minX) * scale;
      const y = height - padding - (p.y - minY) * scale;
      return { x, y };
    };

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1e40af";
    const lines = polylines?.length ? polylines : [points];
    lines.forEach((line) => {
      if (!line || line.length === 0) return;
      ctx.beginPath();
      const first = toCanvas(line[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < line.length; i++) {
        const c = toCanvas(line[i]);
        ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
    });

    ctx.fillStyle = "#16a34a";
    const start = toCanvas(lines[0][0]);
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    lines.forEach((line) => {
      if (!line || line.length === 0) return;
      const end = toCanvas(line[line.length - 1]);
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawProjectCompositeOnCanvas(projectId, canvas, small = false) {
    if (!canvas) return false;
    this.fitCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (!projectId || !this.projects[projectId]) return false;
    const records = this.projects[projectId].records || {};
    const recordIds = Object.keys(records);
    if (recordIds.length === 0) return false;

    const polylines = [];
    let allPts = [];
    const memo = {};
    const visiting = {};

    recordIds.forEach((rid) => {
      const geometry = this.computeTraversePointsForRecord(
        projectId,
        rid,
        memo,
        visiting
      );
      const pts = geometry?.points || [];
      const lines = geometry?.polylines || [];
      if (pts && pts.length > 0) {
        polylines.push({ id: rid, lines });
        allPts = allPts.concat(pts);
      }
    });

    if (allPts.length === 0) return false;

    let minX = allPts[0].x,
      maxX = allPts[0].x;
    let minY = allPts[0].y,
      maxY = allPts[0].y;
    allPts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const padding = small ? 4 : 20;
    let dx = maxX - minX;
    let dy = maxY - minY;
    if (dx === 0) dx = 1;
    if (dy === 0) dy = 1;

    const scaleX = (width - 2 * padding) / dx;
    const scaleY = (height - 2 * padding) / dy;
    const scale = Math.min(scaleX, scaleY);

    const toCanvas = (p) => {
      const x = padding + (p.x - minX) * scale;
      const y = height - padding - (p.y - minY) * scale;
      return { x, y };
    };

    const colors = [
      "#1e40af",
      "#16a34a",
      "#dc2626",
      "#f97316",
      "#0f766e",
      "#7c3aed",
    ];

    let hasGeometry = false;

    polylines.forEach((poly, idx) => {
      const lines = poly.lines && poly.lines.length ? poly.lines : [];
      if (!lines.length) return;

      hasGeometry = true;

      const color = colors[idx % colors.length];
      ctx.lineWidth = small ? 1 : 2;
      ctx.strokeStyle = color;

      lines.forEach((line) => {
        if (!line || line.length === 0) return;
        ctx.beginPath();
        const first = toCanvas(line[0]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < line.length; i++) {
          const c = toCanvas(line[i]);
          ctx.lineTo(c.x, c.y);
        }
        ctx.stroke();
      });

      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];
      const start = toCanvas(firstLine[0]);
      const end = toCanvas(lastLine[lastLine.length - 1]);
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.arc(start.x, start.y, small ? 2 : 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(end.x, end.y, small ? 2 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    return hasGeometry;
  }

  drawProjectOverview() {
    const canvas = this.elements.projectOverviewCanvas;
    if (!canvas) return;
    if (!this.currentProjectId) {
      this.fitCanvasToDisplaySize(canvas);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    this.drawProjectCompositeOnCanvas(this.currentProjectId, canvas);
  }

  toggleLocalizationSource() {
    const source = this.elements.localizationSource?.value || "traverse";
    if (this.elements.localizationTraverseFields) {
      this.elements.localizationTraverseFields.style.display =
        source === "traverse" ? "block" : "none";
    }
    if (this.elements.localizationPointFileFields) {
      this.elements.localizationPointFileFields.style.display =
        source === "pointFile" ? "block" : "none";
    }
    this.updateLocalizationSummary();
  }

  populateLocalizationSelectors() {
    this.populateLocalizationTraverseRecords();
    this.populateLocalizationPointFiles();
    this.populateLocalizationTraversePoints();
    this.populateLocalizationPointNumbers();
    this.toggleLocalizationSource();
    this.updateLocalizationSummary();
  }

  populateLocalizationTraverseRecords() {
    const select = this.elements.localizationRecord;
    if (!select) return;
    select.innerHTML = "";
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;

    if (
      !project ||
      !project.records ||
      Object.keys(project.records).length === 0
    ) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No traverse records";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      return;
    }

    Object.entries(project.records).forEach(([id, record], idx) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = record.name || `Record ${idx + 1}`;
      if (idx === 0) opt.selected = true;
      select.appendChild(opt);
    });
  }

  populateLocalizationTraversePoints() {
    const select = this.elements.localizationTraversePoint;
    if (!select) return;
    select.innerHTML = "";
    const recordId = this.elements.localizationRecord?.value;
    const options = this.getTraversePointOptions(recordId);
    if (!options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No traverse points";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      return;
    }
    options.forEach((optData, idx) => {
      const opt = document.createElement("option");
      opt.value = optData.index.toString();
      opt.textContent = optData.label;
      if (idx === 0) opt.selected = true;
      select.appendChild(opt);
    });
  }

  populateLocalizationPointFiles() {
    const select = this.elements.localizationPointFile;
    if (!select) return;
    select.innerHTML = "";
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    const files = project?.pointFiles || [];

    if (!files.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No point files";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      return;
    }

    files.forEach((pf, idx) => {
      const opt = document.createElement("option");
      opt.value = pf.id;
      opt.textContent = pf.name || `Point File ${idx + 1}`;
      if (pf.id === project.activePointFileId || idx === 0) opt.selected = true;
      select.appendChild(opt);
    });
  }

  populateLocalizationPointNumbers() {
    const select = this.elements.localizationPointNumber;
    if (!select) return;
    select.innerHTML = "";
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    const fileId = this.elements.localizationPointFile?.value;
    const file = project?.pointFiles?.find((pf) => pf.id === fileId);

    if (!file || !file.points?.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No points";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      return;
    }

    file.points.forEach((pt, idx) => {
      const opt = document.createElement("option");
      opt.value = idx.toString();
      const label = pt.pointNumber ? `#${pt.pointNumber}` : `Point ${idx + 1}`;
      opt.textContent = `${label} (${pt.x || "?"}, ${pt.y || "?"})`;
      if (idx === 0) opt.selected = true;
      select.appendChild(opt);
    });
  }

  applyGpsLocalization() {
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    if (!project) {
      this.setLocalizationStatus("Select a project first.");
      return;
    }

    const lat = parseFloat(this.elements.localizationLat?.value || "");
    const lon = parseFloat(this.elements.localizationLon?.value || "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      this.setLocalizationStatus("Enter a valid latitude and longitude.");
      return;
    }

    const source = this.elements.localizationSource?.value || "traverse";
    const anchorGeo = { lat, lon };
    let anchorLocal = null;
    let anchorLabel = "";
    const localizedPoints = [];

    if (source === "traverse") {
      const recordId = this.elements.localizationRecord?.value;
      const record = project.records?.[recordId];
      const idxStr = this.elements.localizationTraversePoint?.value || "0";
      const pointIdx = parseInt(idxStr, 10) || 0;
      const traverse = this.computeTraversePointsForRecord(
        this.currentProjectId,
        recordId
      );
      const pts = traverse?.points || [];
      const sortedPts = [...pts].sort(
        (a, b) => (a.pointNumber || 0) - (b.pointNumber || 0)
      );
      if (!record || !sortedPts || !sortedPts[pointIdx]) {
        this.setLocalizationStatus(
          "Choose a valid traverse point to localize."
        );
        return;
      }
      anchorLocal = sortedPts[pointIdx];
      const base = parseInt(record.startPtNum, 10) || 1;
      const anchorNumber = anchorLocal.pointNumber ?? base + pointIdx;
      anchorLabel = `${record.name || "Traverse"} P${anchorNumber}`;

      Object.entries(project.records || {}).forEach(([rid, rec]) => {
        const recTraverse = this.computeTraversePointsForRecord(
          this.currentProjectId,
          rid
        );
        const recPts = recTraverse?.points || [];
        const sortedRec = [...recPts].sort(
          (a, b) => (a.pointNumber || 0) - (b.pointNumber || 0)
        );
        const startNum = parseInt(rec.startPtNum, 10) || 1;
        sortedRec.forEach((pt, idx) => {
          const offset = this.localOffsetToLatLon(
            anchorGeo,
            pt.x - anchorLocal.x,
            pt.y - anchorLocal.y
          );
          const labelNumber = pt.pointNumber ?? startNum + idx;
          localizedPoints.push({
            id: `tr-${rid}-${idx}`,
            label: `${rec.name || "Traverse"} P${labelNumber}`,
            lat: offset.lat,
            lon: offset.lon,
            source: "traverse",
          });
        });
      });
    } else {
      const fileId = this.elements.localizationPointFile?.value;
      const pointIdxStr = this.elements.localizationPointNumber?.value || "0";
      const pointIdx = parseInt(pointIdxStr, 10) || 0;
      const file = project.pointFiles?.find((pf) => pf.id === fileId);
      if (!file || !file.points || !file.points[pointIdx]) {
        this.setLocalizationStatus("Choose a valid point file and point.");
        return;
      }
      const anchorPt = file.points[pointIdx];
      const anchorE = parseFloat(anchorPt.x);
      const anchorN = parseFloat(anchorPt.y);
      if (!Number.isFinite(anchorE) || !Number.isFinite(anchorN)) {
        this.setLocalizationStatus(
          "Anchor point is missing numeric coordinates."
        );
        return;
      }
      anchorLocal = { x: anchorE, y: anchorN };
      anchorLabel = `${file.name || "Points"} ${
        anchorPt.pointNumber || "point"
      }`;

      (project.pointFiles || []).forEach((pf) => {
        (pf.points || []).forEach((pt, idx) => {
          const e = parseFloat(pt.x);
          const n = parseFloat(pt.y);
          if (!Number.isFinite(e) || !Number.isFinite(n)) return;
          const offset = this.localOffsetToLatLon(
            anchorGeo,
            e - anchorLocal.x,
            n - anchorLocal.y
          );
          localizedPoints.push({
            id: `pf-${pf.id}-${idx}`,
            label: `${pf.name || "Points"} ${pt.pointNumber || idx + 1}`,
            lat: offset.lat,
            lon: offset.lon,
            source: "pointFile",
          });
        });
      });
    }

    project.localization = {
      source,
      anchorLabel,
      anchorLocal,
      anchorGeo,
      createdAt: new Date().toISOString(),
      points: localizedPoints,
    };
    this.saveProjects();
    this.setLocalizationStatus(`Localized ${localizedPoints.length} point(s).`);
    this.updateLocalizationSummary();
    this.navigationController?.onProjectChanged();
    this.navigationController?.updateNavigationState();
  }

  clearGpsLocalization() {
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    if (!project || !project.localization) {
      this.setLocalizationStatus("No localization to clear.");
      return;
    }
    project.localization = null;
    this.saveProjects();
    this.setLocalizationStatus("Localization cleared.");
    this.updateLocalizationSummary();
    this.navigationController?.onProjectChanged();
    this.navigationController?.updateNavigationState();
  }

  localOffsetToLatLon(anchorGeo, deltaEastFeet, deltaNorthFeet) {
    const R = 6378137; // meters
    const metersPerFoot = 0.3048;
    const dNorth = deltaNorthFeet * metersPerFoot;
    const dEast = deltaEastFeet * metersPerFoot;
    const dLat = (dNorth / R) * (180 / Math.PI);
    const dLon =
      (dEast / (R * Math.cos((anchorGeo.lat * Math.PI) / 180))) *
      (180 / Math.PI);
    return { lat: anchorGeo.lat + dLat, lon: anchorGeo.lon + dLon };
  }

  setLocalizationStatus(message) {
    if (this.elements.localizationStatus) {
      this.elements.localizationStatus.textContent = message;
    }
  }

  updateLocalizationSummary() {
    const summary = this.elements.localizationSummary;
    if (!summary) return;
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    const loc = project?.localization;
    if (!project) {
      summary.textContent = "Select a project to localize coordinates.";
      return;
    }
    if (!loc) {
      summary.textContent =
        "Enter a known GPS coordinate to localize your traverse or point file.";
      return;
    }
    summary.textContent = `Localized to ${
      loc.anchorLabel
    } at ${loc.anchorGeo.lat.toFixed(6)}, ${loc.anchorGeo.lon.toFixed(6)} (${
      loc.points?.length || 0
    } point targets).`;
  }

  updateBearingArrow(input) {
    const svg = input
      ?.closest(".bearing-cell")
      ?.querySelector(".bearing-arrow svg");
    if (!svg) return;
    const bearing = input.value || "";
    try {
      const parsed = this.parseBearing(bearing);
      if (!parsed) throw new Error("Invalid");
      const { quadrant, angleDegrees } = parsed;
      let az = 0;
      const angle = angleDegrees || 0;
      switch (quadrant) {
        case 1:
          az = angle;
          break;
        case 2:
          az = 180 - angle;
          break;
        case 3:
          az = 180 + angle;
          break;
        case 4:
          az = 360 - angle;
          break;
      }
      svg.style.opacity = 1;
      svg.style.transform = `rotate(${az}deg)`;
    } catch (e) {
      svg.style.opacity = 0.3;
      svg.style.transform = "rotate(0deg)";
    }
  }

  updateAllBearingArrows() {
    this.elements.callsTableBody
      .querySelectorAll(".bearing")
      .forEach((input) => this.updateBearingArrow(input));
  }
  };

export default TraverseGeometryMixin;
