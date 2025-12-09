import TraverseInstruction from "../../models/TraverseInstruction.js";

const CallsBearingsMixin = (Base) =>
  class extends Base {
  /* ===================== Calls table & bearings ===================== */
  renderCallList(calls = [], container, depth = 0) {
    (calls || []).forEach((call) => {
      const row = this.addCallRow(call, container, null, depth);
      const branchContainer = row.querySelector(".branch-container");
      (call.branches || []).forEach((branch) => {
        this.addBranchSection(branchContainer, row, branch, depth + 1);
      });
    });
  }

  getActiveCodesByKind(kind = "") {
    return (this.globalSettings.pointCodes || []).filter(
      (entry) => !entry.archived && (!kind || entry.kind === kind)
    );
  }

  populateTraverseCodeOptions(select, kind = "", selectedId = "") {
    if (!select) return;
    const previous = select.value || selectedId || "";
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = kind === "line" ? "Line code" : "Point/symbol";
    select.appendChild(placeholder);

    const codes = this.getActiveCodesByKind(kind);
    codes
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .forEach((code) => {
        const opt = document.createElement("option");
        opt.value = code.id;
        opt.textContent = `${code.code}${code.description ? ` — ${code.description}` : ""}`;
        if (code.id === previous) opt.selected = true;
        select.appendChild(opt);
      });
  }

  refreshCallCodeOptions() {
    const lineSelects = document.querySelectorAll("select.line-code");
    lineSelects.forEach((sel) =>
      this.populateTraverseCodeOptions(sel, "line", sel.value)
    );
    const pointSelects = document.querySelectorAll("select.point-code");
    pointSelects.forEach((sel) =>
      this.populateTraverseCodeOptions(sel, "point", sel.value)
    );
  }

  addCallRow(callData = {}, container = this.elements.callsTableBody, label = null, depth = 0) {
    const { bearing = "", distance = "", branches = [] } = callData || {};
    const tbody = container || this.elements.callsTableBody;
    const tr = document.createElement("tr");
    tr.className = "call-row";
    tr.dataset.depth = depth;
    if (depth > 0) tr.classList.add("nested-call-row");

    const numTd = document.createElement("td");
    numTd.className = "call-label";
    numTd.textContent = label || "";

    const geometryTd = document.createElement("td");
    geometryTd.colSpan = 2;
    geometryTd.className = "call-geometry";

    const bearingCell = document.createElement("div");
    bearingCell.className = "bearing-cell";
    const bearingInput = document.createElement("input");
    bearingInput.type = "text";
    bearingInput.className = "bearing";
    bearingInput.value = bearing;
    bearingInput.placeholder = "S 12°34'56\"E";
    bearingInput.addEventListener("input", () => {
      this.updateBearingArrow(bearingInput);
      this.saveCurrentRecord();
      this.generateCommands();
    });
    const arrowSpan = document.createElement("span");
    arrowSpan.className = "bearing-arrow";
    arrowSpan.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 4 L6 14 H18 Z" fill="#1e40af"></path></svg>';
    bearingCell.appendChild(bearingInput);
    bearingCell.appendChild(arrowSpan);
    geometryTd.appendChild(bearingCell);

    const distanceRow = document.createElement("div");
    distanceRow.className = "distance-row";
    const distanceInput = document.createElement("input");
    distanceInput.type = "text";
    distanceInput.className = "distance";
    distanceInput.placeholder = "120.50";
    distanceInput.value = distance;
    distanceInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const codeRow = document.createElement("div");
    codeRow.className = "code-row";
    const lineCodeSelect = document.createElement("select");
    lineCodeSelect.className = "line-code";
    this.populateTraverseCodeOptions(
      lineCodeSelect,
      "line",
      callData.lineCodeId || ""
    );

    const pointCodeSelect = document.createElement("select");
    pointCodeSelect.className = "point-code";
    this.populateTraverseCodeOptions(
      pointCodeSelect,
      "point",
      callData.pointCodeId || ""
    );
    pointCodeSelect.addEventListener("change", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    codeRow.append(lineCodeSelect, pointCodeSelect);

    const curveRow = document.createElement("div");
    curveRow.className = "curve-row";

    const curveDirectionSelect = document.createElement("select");
    curveDirectionSelect.className = "curve-direction";
    [
      { value: "", label: "Straight segment" },
      { value: "right", label: "Curve right" },
      { value: "left", label: "Curve left" },
    ].forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if ((callData.curveDirection || "").toLowerCase() === value)
        opt.selected = true;
      curveDirectionSelect.appendChild(opt);
    });
    const curveRadiusInput = document.createElement("input");
    curveRadiusInput.type = "number";
    curveRadiusInput.step = "any";
    curveRadiusInput.className = "curve-radius";
    curveRadiusInput.placeholder = "Radius";
    curveRadiusInput.value = callData.curveRadius || "";
    curveRadiusInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveArcLengthInput = document.createElement("input");
    curveArcLengthInput.type = "number";
    curveArcLengthInput.step = "any";
    curveArcLengthInput.className = "curve-arc-length";
    curveArcLengthInput.placeholder = "Arc length";
    curveArcLengthInput.value = callData.curveArcLength || "";
    curveArcLengthInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveChordLengthInput = document.createElement("input");
    curveChordLengthInput.type = "number";
    curveChordLengthInput.step = "any";
    curveChordLengthInput.className = "curve-chord-length";
    curveChordLengthInput.placeholder = "Chord length";
    curveChordLengthInput.value = callData.curveChordLength || "";
    curveChordLengthInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveChordBearingInput = document.createElement("input");
    curveChordBearingInput.type = "text";
    curveChordBearingInput.className = "curve-chord-bearing";
    curveChordBearingInput.placeholder = "Chord bearing";
    curveChordBearingInput.value = callData.curveChordBearing || "";
    curveChordBearingInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveDeltaAngleInput = document.createElement("input");
    curveDeltaAngleInput.type = "number";
    curveDeltaAngleInput.step = "any";
    curveDeltaAngleInput.className = "curve-delta-angle";
    curveDeltaAngleInput.placeholder = "Delta angle";
    curveDeltaAngleInput.value = callData.curveDeltaAngle || "";
    curveDeltaAngleInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveTangentInput = document.createElement("input");
    curveTangentInput.type = "number";
    curveTangentInput.step = "any";
    curveTangentInput.className = "curve-tangent";
    curveTangentInput.placeholder = "Tangent";
    curveTangentInput.value = callData.curveTangent || "";
    curveTangentInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const curveFields = [
      curveRadiusInput,
      curveArcLengthInput,
      curveChordLengthInput,
      curveChordBearingInput,
      curveDeltaAngleInput,
      curveTangentInput,
    ];

    const updateCallInputVisibility = () => {
      const isCurve = !!curveDirectionSelect.value;
      bearingTd.style.display = isCurve ? "none" : "";
      distanceRow.style.display = isCurve ? "none" : "";
      curveFields.forEach((field) => {
        field.style.display = isCurve ? "" : "none";
      });
    };

    curveDirectionSelect.addEventListener("change", () => {
      updateCallInputVisibility();
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const offsetRow = document.createElement("div");
    offsetRow.className = "offset-row";
    const offsetDirection = document.createElement("select");
    offsetDirection.className = "offset-direction";
    [
      { value: "", label: "Offset side" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ].forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === (callData.offsetDirection || "")) opt.selected = true;
      offsetDirection.appendChild(opt);
    });
    offsetDirection.addEventListener("change", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const offsetDistance = document.createElement("input");
    offsetDistance.type = "number";
    offsetDistance.step = "any";
    offsetDistance.placeholder = "Offset (ft)";
    offsetDistance.className = "offset-distance";
    offsetDistance.value = callData.offsetDistance || "";
    offsetDistance.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const offsetReference = document.createElement("select");
    offsetReference.className = "offset-reference";
    [
      { value: "", label: "Reference" },
      { value: "cl", label: "Center line (CL)" },
      { value: "sec", label: "Section line (SEC)" },
    ].forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === (callData.offsetReference || "")) opt.selected = true;
      offsetReference.appendChild(opt);
    });
    offsetReference.addEventListener("change", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

    offsetRow.append(offsetReference, offsetDistance, offsetDirection);

    const updateOffsetVisibility = () => {
      const hasLineCode = Boolean(lineCodeSelect.value);
      offsetRow.style.display = hasLineCode ? "" : "none";
    };

    lineCodeSelect.addEventListener("change", () => {
      updateOffsetVisibility();
      this.saveCurrentRecord();
      this.generateCommands();
    });

    updateOffsetVisibility();

    curveRow.append(
      curveDirectionSelect,
      curveRadiusInput,
      curveArcLengthInput,
      curveChordLengthInput,
      curveChordBearingInput,
      curveDeltaAngleInput,
      curveTangentInput
    );
    const rowControls = document.createElement("div");
    rowControls.className = "row-controls";

    const moveUp = document.createElement("button");
    moveUp.type = "button";
    moveUp.textContent = "↑";
    moveUp.addEventListener("click", () => this.moveRow(tr, -1));

    const moveDown = document.createElement("button");
    moveDown.type = "button";
    moveDown.textContent = "↓";
    moveDown.addEventListener("click", () => this.moveRow(tr, 1));

    const branchButton = document.createElement("button");
    branchButton.type = "button";
    branchButton.textContent = "Branch";
    branchButton.addEventListener("click", () => {
      this.addBranchSection(
        tr.querySelector(".branch-container"),
        tr,
        [],
        depth + 1
      );
      this.reindexRows();
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.addEventListener("click", () => this.removeRow(tr));

    rowControls.append(moveUp, moveDown, branchButton, remove);
    distanceRow.append(distanceInput, rowControls);
    distanceRow.append(codeRow, offsetRow);
    geometryTd.appendChild(distanceRow);

    const branchContainer = document.createElement("div");
    branchContainer.className = "branch-container";
    geometryTd.append(curveRow, branchContainer);

    tr.append(numTd, geometryTd);
    tbody.appendChild(tr);

    updateCallInputVisibility();

    if ((branches || []).length > 0) {
      branches.forEach((branch) =>
        this.addBranchSection(branchContainer, tr, branch, depth + 1)
      );
    }

    this.updateBearingArrow(bearingInput);
    return tr;
  }

  addBranchSection(container, parentRow, branchCalls = [], depth = 1) {
    if (!container) return;
    const section = document.createElement("div");
    section.className = "branch-section";

    const header = document.createElement("div");
    header.className = "branch-header";
    const labelText =
      parentRow?.dataset?.callLabel ||
      parentRow?.querySelector(".call-label")?.textContent ||
      "";
    const title = document.createElement("span");
    title.textContent = labelText
      ? `Branch from #${labelText}`
      : "Branch from point";

    const addCallBtn = document.createElement("button");
    addCallBtn.type = "button";
    addCallBtn.textContent = "+ Add Branch Call";
    addCallBtn.addEventListener("click", () => {
      this.addCallRow({}, branchBody, null, depth);
      this.reindexRows();
      this.saveCurrentRecord();
      this.generateCommands();
    });

    const removeBranchBtn = document.createElement("button");
    removeBranchBtn.type = "button";
    removeBranchBtn.textContent = "Remove Branch";
    removeBranchBtn.addEventListener("click", () => {
      section.remove();
      this.reindexRows();
      this.saveCurrentRecord();
      this.generateCommands();
    });

    header.append(title, addCallBtn, removeBranchBtn);

    const branchTable = document.createElement("table");
    branchTable.className = "calls-table branch-table";
    const branchBody = document.createElement("tbody");
    branchTable.appendChild(branchBody);

    section.append(header, branchTable);
    container.appendChild(section);

    (branchCalls || []).forEach((call) => {
      const row = this.addCallRow(call, branchBody, null, depth);
      (call.branches || []).forEach((sub) =>
        this.addBranchSection(row.querySelector(".branch-container"), row, sub, depth + 1)
      );
    });
  }

  moveRow(row, direction) {
    const container = row.closest("tbody") || this.elements.callsTableBody;
    const rows = Array.from(container.children).filter(
      (child) => child.tagName === "TR"
    );
    const index = rows.indexOf(row);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;
    const reference = rows[newIndex];
    if (direction > 0) {
      reference.after(row);
    } else {
      reference.before(row);
    }
    this.reindexRows();
    this.saveCurrentRecord();
    this.generateCommands();
  }

  removeRow(row) {
    row.remove();
    this.reindexRows();
    this.saveCurrentRecord();
    this.generateCommands();
  }

  reindexRows() {
    const assignLabels = (tbody, base) => {
      if (!tbody) return;
      const rows = Array.from(tbody.children).filter(
        (child) => child.tagName === "TR"
      );
      rows.forEach((tr, idx) => {
        const label = typeof base === "number" ? base + idx : `${base}.${idx + 1}`;
        tr.dataset.callLabel = label;
        const labelCell = tr.querySelector(".call-label");
        if (labelCell) labelCell.textContent = label;
        const branchTitles = Array.from(
          tr.querySelectorAll(":scope .branch-header span")
        );
        branchTitles.forEach((span) => {
          span.textContent = label ? `Branch from #${label}` : "Branch from point";
        });
        const branchSections = Array.from(tr.querySelectorAll(":scope .branch-section"));
        branchSections.forEach((section) => {
          const body = section.querySelector("tbody");
          assignLabels(body, label);
        });
      });
    };

    assignLabels(this.elements.callsTableBody, 2);
  }

  serializeCallsFromContainer(container) {
    const tbody = container || this.elements.callsTableBody;
    const rows = Array.from(tbody.children).filter((c) => c.tagName === "TR");
    const calls = [];

    rows.forEach((tr) => {
      const bearing = tr.querySelector(".bearing")?.value?.trim() || "";
      const distance = tr.querySelector(".distance")?.value?.trim() || "";
      const curveRadius =
        tr.querySelector(".curve-radius")?.value?.trim() || "";
      const curveDirection =
        tr.querySelector(".curve-direction")?.value?.trim() || "";
      const curveArcLength =
        tr.querySelector(".curve-arc-length")?.value?.trim() || "";
      const curveChordLength =
        tr.querySelector(".curve-chord-length")?.value?.trim() || "";
      const curveChordBearing =
        tr.querySelector(".curve-chord-bearing")?.value?.trim() || "";
      const curveDeltaAngle =
        tr.querySelector(".curve-delta-angle")?.value?.trim() || "";
      const curveTangent =
        tr.querySelector(".curve-tangent")?.value?.trim() || "";
      const lineCodeId = tr.querySelector(".line-code")?.value?.trim() || "";
      const pointCodeId = tr.querySelector(".point-code")?.value?.trim() || "";
      const offsetReference =
        tr.querySelector(".offset-reference")?.value?.trim() || "";
      const offsetDistance =
        tr.querySelector(".offset-distance")?.value?.trim() || "";
      const offsetDirection =
        tr.querySelector(".offset-direction")?.value?.trim() || "";
      const branches = [];
      Array.from(tr.querySelectorAll(":scope .branch-section")).forEach(
        (section) => {
          const branchBody = section.querySelector("tbody");
          if (branchBody)
            branches.push(this.serializeCallsFromContainer(branchBody));
        }
      );
      calls.push(
        new TraverseInstruction(
          bearing,
          distance,
          branches,
          curveRadius,
          curveDirection,
          curveArcLength,
          curveChordLength,
          curveChordBearing,
          curveDeltaAngle,
          curveTangent,
          lineCodeId,
          pointCodeId,
          offsetReference,
          offsetDistance,
          offsetDirection
        )
      );
    });

    return calls;
  }

  parseBearing(bearing) {
    if (!bearing.trim()) return null;
    let s = bearing
      .toUpperCase()
      .replace(/[^NSEW0-9°'"-]/g, "")
      .replace(/DEG|°/g, "-")
      .replace(/'|′/g, "-")
      .replace(/"/g, "");

    let quadrant, angleStr;
    if (s.startsWith("N") && s.includes("E")) {
      quadrant = 1;
      angleStr = s.slice(1, s.indexOf("E"));
    } else if (s.startsWith("S") && s.includes("E")) {
      quadrant = 2;
      angleStr = s.slice(1, s.indexOf("E"));
    } else if (s.startsWith("S") && s.includes("W")) {
      quadrant = 3;
      angleStr = s.slice(1, s.indexOf("W"));
    } else if (s.startsWith("N") && s.includes("W")) {
      quadrant = 4;
      angleStr = s.slice(1, s.indexOf("W"));
    } else throw new Error("Invalid bearing: " + bearing);

    const parts = angleStr
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);
    const d = parseInt(parts[0] || 0, 10);
    const m = parseInt(parts[1] || 0, 10);
    const sec = parseInt(parts[2] || 0, 10);

    if (m >= 60 || sec >= 60 || d > 90) throw new Error("Invalid DMS");

    const mmss = ("00" + m).slice(-2) + ("00" + sec).slice(-2);
    const formatted = d + "." + mmss;

    const angleDegrees = d + m / 60 + sec / 3600;
    return { quadrant, formatted, angleDegrees };
  }

  callIsCurve(call) {
    return !!this.computeCurveMetrics(call);
  }

  computeCurveMetrics(call, startAzimuth = 0) {
    if (!call) return null;
    const radius = parseFloat(call.curveRadius);
    const direction = (call.curveDirection || "").toLowerCase();
    if (!Number.isFinite(radius) || radius <= 0) return null;
    const dirSign = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    if (dirSign === 0) return null;

    const arcLengthInput = parseFloat(call.curveArcLength || call.distance);
    const chordLengthInput = parseFloat(call.curveChordLength);
    const deltaAngleInput = parseFloat(call.curveDeltaAngle);
    const tangentInput = parseFloat(call.curveTangent);

    let deltaDeg = Number.isFinite(deltaAngleInput)
      ? Math.abs(deltaAngleInput)
      : NaN;
    if (!Number.isFinite(deltaDeg)) {
      if (Number.isFinite(arcLengthInput)) {
        deltaDeg = Math.abs((arcLengthInput / radius) * (180 / Math.PI));
      } else if (Number.isFinite(chordLengthInput)) {
        deltaDeg = Math.abs(
          (2 * Math.asin(chordLengthInput / (2 * radius)) * 180) / Math.PI
        );
      } else if (Number.isFinite(tangentInput)) {
        deltaDeg = Math.abs((2 * Math.atan(tangentInput / radius) * 180) / Math.PI);
      }
    }

    if (!Number.isFinite(deltaDeg) || deltaDeg <= 0) return null;
    const deltaRad = (deltaDeg * Math.PI) / 180;
    const arcLength = Number.isFinite(arcLengthInput)
      ? Math.abs(arcLengthInput)
      : radius * deltaRad;
    const chordLength = Number.isFinite(chordLengthInput)
      ? Math.abs(chordLengthInput)
      : 2 * radius * Math.sin(deltaRad / 2);
    const tangentLength = Number.isFinite(tangentInput)
      ? Math.abs(tangentInput)
      : radius * Math.tan(deltaRad / 2);

    let chordBearingAzimuth = null;
    if (call.curveChordBearing) {
      try {
        const parsed = this.parseBearing(call.curveChordBearing);
        if (parsed) chordBearingAzimuth = this.bearingToAzimuth(parsed);
      } catch (e) {
        chordBearingAzimuth = null;
      }
    }
    if (!Number.isFinite(chordBearingAzimuth)) {
      chordBearingAzimuth = this.normalizeAzimuth(
        (startAzimuth || 0) + dirSign * (deltaDeg / 2)
      );
    }

    const endAzimuth = this.normalizeAzimuth((startAzimuth || 0) + dirSign * deltaDeg);

    return {
      radius,
      direction,
      deltaDegrees: deltaDeg,
      deltaSign: dirSign,
      deltaRad,
      arcLength,
      chordLength,
      tangentLength,
      chordBearingAzimuth,
      endAzimuth,
    };
  }

  normalizeAzimuth(azimuth = 0) {
    let az = azimuth % 360;
    if (az < 0) az += 360;
    return az;
  }

  bearingToAzimuth(parsed) {
    if (!parsed) return 0;
    const angle = parsed.angleDegrees || 0;
    switch (parsed.quadrant) {
      case 1:
        return angle;
      case 2:
        return 180 - angle;
      case 3:
        return 180 + angle;
      case 4:
        return 360 - angle;
      default:
        return angle;
    }
  }

  formatAngleForQuadrant(angleDegrees = 0) {
    const normalized = Math.max(0, Math.min(90, angleDegrees));
    let d = Math.floor(normalized);
    let remainder = (normalized - d) * 60;
    let m = Math.floor(remainder);
    let s = Math.round((remainder - m) * 60);

    if (s === 60) {
      s = 0;
      m += 1;
    }
    if (m === 60) {
      m = 0;
      d += 1;
    }

    const mmss = `${("00" + m).slice(-2)}${("00" + s).slice(-2)}`;
    return `${d}.${mmss}`;
  }

  azimuthToQuadrantBearing(azimuth = 0) {
    const az = this.normalizeAzimuth(azimuth);
    let quadrant = 1;
    let angle = az;
    if (az > 90 && az < 180) {
      quadrant = 2;
      angle = 180 - az;
    } else if (az >= 180 && az < 270) {
      quadrant = 3;
      angle = az - 180;
    } else if (az >= 270) {
      quadrant = 4;
      angle = 360 - az;
    }

    return { quadrant, formatted: this.formatAngleForQuadrant(angle) };
  }

  buildCallSegments(call, startAzimuth = 0, metrics = null) {
    const distance = parseFloat(call?.distance) || 0;
    const curveMetrics = metrics || this.computeCurveMetrics(call, startAzimuth);

    if (!curveMetrics) {
      return {
        segments: [
          {
            distance,
            azimuth: this.normalizeAzimuth(startAzimuth),
            isCurve: false,
          },
        ],
        endAzimuth: this.normalizeAzimuth(startAzimuth),
      };
    }

    const segmentCount = Math.max(
      4,
      Math.ceil(Math.abs(curveMetrics.deltaDegrees) / 15)
    );
    const segmentDeltaDeg =
      curveMetrics.deltaSign *
      (Math.abs(curveMetrics.deltaDegrees) / segmentCount);

    const segments = [];
    let currentAz = this.normalizeAzimuth(startAzimuth);
    for (let i = 0; i < segmentCount; i++) {
      const chordAz = this.normalizeAzimuth(currentAz + segmentDeltaDeg / 2);
      const chordLength =
        2 * curveMetrics.radius *
        Math.sin((Math.abs(segmentDeltaDeg) * Math.PI) / 360);
      segments.push({
        distance: chordLength,
        azimuth: chordAz,
        isCurve: true,
      });
      currentAz = this.normalizeAzimuth(currentAz + segmentDeltaDeg);
    }

    return { segments, endAzimuth: currentAz };
  }

  getAllCalls(record) {
    const calls = [];
    if (record.basis && record.firstDist) {
      calls.push(new TraverseInstruction(record.basis, record.firstDist));
    }
    (record.calls || []).forEach((c) => {
      const normalized =
        c instanceof TraverseInstruction
          ? c
          : TraverseInstruction.fromObject(c);
      const hasBranch = (normalized.branches || []).length > 0;
      const isCurve = this.callIsCurve(normalized);
      if (normalized.bearing || normalized.distance || hasBranch || isCurve) {
        calls.push(normalized);
      }
    });
    return calls;
  }

  setCommandText(group, text) {
    this.commandTexts[group] = text || "";
    const previewEl = document.getElementById(`preview-${group}`);
    const fullEl = document.getElementById(`full-${group}`);
    if (previewEl) previewEl.textContent = text || "(empty)";
    if (fullEl) fullEl.value = text || "";
  }

  copyGroup(group) {
    const text = this.commandTexts[group] || "";
    navigator.clipboard
      .writeText(text)
      .then(() => alert(`Copied ${group} commands!`))
      .catch(() => alert("Copy failed"));
  }

  toggleExpand(group) {
    const card = document.querySelector(`.command-card[data-group="${group}"]`);
    if (!card) return;
    card.classList.toggle("expanded");
  }

  fitCanvasToDisplaySize(canvas) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || 0));
    const height = Math.max(1, Math.floor(rect.height || 0));
    if (
      width &&
      height &&
      (canvas.width !== width || canvas.height !== height)
    ) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  };

export default CallsBearingsMixin;
