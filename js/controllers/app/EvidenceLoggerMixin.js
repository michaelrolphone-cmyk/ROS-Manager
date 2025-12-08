import CornerEvidence from "../../models/CornerEvidence.js";
import EvidenceTie from "../../models/EvidenceTie.js";

const EvidenceLoggerMixin = (Base) =>
  class extends Base {
  /* ===================== Evidence Logger ===================== */
  switchTab(targetId) {
    const controllers = this.appControllers || {};
    const targetController =
      controllers[targetId] ||
      controllers.springboardSection ||
      Object.values(controllers)[0];
    const resolvedId = targetController?.id || "springboardSection";
    const buttons = [
      this.elements.traverseTabButton,
      this.elements.pointsTabButton,
      this.elements.evidenceTabButton,
      this.elements.equipmentTabButton,
    ];

    Object.entries(controllers).forEach(([id, controller]) => {
      if (!controller) return;
      if (id === resolvedId) controller.activate();
      else controller.deactivate();
    });

    this.handleSpringboardScroll();

    buttons.forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle("active", btn.dataset.target === resolvedId);
    });

    const onSpringboard = resolvedId === "springboardSection";
    if (!onSpringboard) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    this.appLaunchers?.forEach((launcher) => {
      launcher.classList.toggle("active", launcher.dataset.target === resolvedId);
    });

    if (this.elements.homeButton) {
      this.elements.homeButton.classList.toggle("visible", !onSpringboard);
    }
  }

  refreshEvidenceUI(forceRecordId = null) {
    this.populateEvidenceRecordOptions(forceRecordId);
    this.refreshEvidencePointOptions();
    this.renderEvidenceList();
    this.updateEvidenceSaveState();
  }

  populateEvidenceRecordOptions(forceRecordId = null) {
    const select = this.elements.evidenceRecordSelect;
    const menu = this.elements.evidenceRecordDropdownMenu;
    const label = this.elements.evidenceRecordDropdownLabel;
    if (!select) return;
    select.innerHTML = "";
    if (menu) menu.innerHTML = "";

    const setLabel = (text) => {
      if (label) label.textContent = text;
    };

    if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
      const opt = document.createElement("option");
      opt.textContent = "Create a project to log evidence";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      setLabel(opt.textContent);
      return;
    }

    const records = this.projects[this.currentProjectId].records || {};
    const ids = Object.keys(records);
    if (ids.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "Add a record to attach evidence";
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      setLabel(opt.textContent);
      return;
    }

    const previousSelection = select.value;
    const targetId =
      forceRecordId && records[forceRecordId]
        ? forceRecordId
        : previousSelection && records[previousSelection]
        ? previousSelection
        : this.currentRecordId &&
            this.projects[this.currentProjectId]?.records?.[this.currentRecordId]
          ? this.currentRecordId
          : null;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a record (optional)";
    placeholder.selected = !targetId;
    placeholder.disabled = false;
    select.appendChild(placeholder);
    setLabel(
      targetId ? records[targetId].name || "Untitled record" : placeholder.textContent
    );

    ids.forEach((id) => {
      const recordName = records[id].name || "Untitled record";
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = recordName;
      if (id === targetId) opt.selected = true;
      select.appendChild(opt);

      if (menu) {
        const option = document.createElement("div");
        option.className = "start-option";
        option.dataset.recordId = id;
        const nameSpan = document.createElement("span");
        nameSpan.className = "start-option-name";
        nameSpan.textContent = recordName;
        const canvasWrapper = document.createElement("div");
        canvasWrapper.className = "start-option-canvas";
        const canvas = document.createElement("canvas");
        canvas.width = 50;
        canvas.height = 50;
        canvasWrapper.appendChild(canvas);
        option.append(nameSpan, canvasWrapper);
        option.addEventListener("click", () => {
          select.value = id;
          this.handleEvidenceRecordChange();
          this.closeEvidenceRecordDropdown();
        });
        menu.appendChild(option);
        try {
          const pts = this.computeTraversePointsForRecord(
            this.currentProjectId,
            id
          );
          this.drawTraversePreview(canvas, pts);
        } catch (e) {
          // ignore
        }
      }
    });

    this.syncEvidenceRecordDropdownSelection();
  }

  refreshEvidencePointOptions() {
    const select = this.elements.evidencePointSelect;
    if (!select) return;
    select.innerHTML = "";
    this.currentTraversePointOptions = [];

    const recordId = this.elements.evidenceRecordSelect?.value;
    const options = this.getTraversePointOptions(recordId);
    this.currentTraversePointOptions = options;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = recordId
      ? "Select a traverse point (optional)"
      : "Select a record to show traverse points";
    placeholder.selected = true;
    placeholder.disabled = false;
    select.appendChild(placeholder);

    if (options.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No traverse points yet";
      opt.disabled = true;
      opt.selected = false;
      select.appendChild(opt);
      return;
    }

    options.forEach((optData) => {
      const opt = document.createElement("option");
      opt.value = optData.index.toString();
      opt.textContent = optData.label;
      select.appendChild(opt);
    });
  }

  getTraversePointOptions(recordId) {
    if (!recordId || !this.currentProjectId) return [];
    const project = this.projects[this.currentProjectId];
    if (!project) return [];
    const record = project.records?.[recordId];
    if (!record) return [];
    const traverse = this.computeTraversePointsForRecord(
      this.currentProjectId,
      recordId
    );
    const pts = traverse?.points || [];
    const startNum = parseInt(record.startPtNum, 10);
    const base = Number.isFinite(startNum) ? startNum : 1;
    const sorted = [...pts].sort(
      (a, b) => (a.pointNumber || 0) - (b.pointNumber || 0)
    );
    return sorted.map((p, idx) => {
      const number = p.pointNumber ?? base + idx;
      return {
        index: idx,
        label: `P${number} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`,
        coords: p,
      };
    });
  }

  async readFilesAsDataUrls(fileList) {
    if (!fileList) return [];
    const files = Array.from(fileList);
    const readers = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );
    return Promise.all(readers).catch(() => []);
  }

  async addEvidenceTie() {
    const dist = this.elements.evidenceTieDistance?.value.trim();
    const bearing = this.elements.evidenceTieBearing?.value.trim();
    const desc = this.elements.evidenceTieDescription?.value.trim();
    if (!dist && !bearing && !desc) {
      alert("Add at least one field for a tie.");
      return;
    }
    const photos = await this.readFilesAsDataUrls(
      this.elements.evidenceTiePhotos?.files
    );
    this.currentEvidenceTies.push({
      distance: dist,
      bearing,
      description: desc,
      photos,
    });
    this.elements.evidenceTieDistance.value = "";
    this.elements.evidenceTieBearing.value = "";
    this.elements.evidenceTieDescription.value = "";
    if (this.elements.evidenceTiePhotos)
      this.elements.evidenceTiePhotos.value = "";
    this.renderEvidenceTies();
  }

  renderEvidenceTies() {
    if (!this.elements.evidenceTiesList || !this.elements.evidenceTiesHint)
      return;
    const list = this.elements.evidenceTiesList;
    list.innerHTML = "";
    if (this.currentEvidenceTies.length === 0) {
      this.elements.evidenceTiesHint.textContent = "No ties added yet.";
      return;
    }
    this.elements.evidenceTiesHint.textContent = `${this.currentEvidenceTies.length} tie(s) added.`;
    this.currentEvidenceTies.forEach((tie, idx) => {
      const li = document.createElement("li");
      const parts = [tie.distance, tie.bearing, tie.description].filter(
        Boolean
      );
      const textSpan = document.createElement("span");
      textSpan.textContent = parts.join(" · ");
      li.appendChild(textSpan);
      const removeBtn = document.createElement("span");
      removeBtn.textContent = "Remove";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.marginLeft = "8px";
      removeBtn.style.color = "#1e40af";
      removeBtn.addEventListener("click", () => {
        this.currentEvidenceTies.splice(idx, 1);
        this.renderEvidenceTies();
      });
      li.appendChild(removeBtn);
      if (tie.photos?.length) {
        const photosRow = document.createElement("div");
        photosRow.className = "tie-photos";
        tie.photos.forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.className = "tie-photo-thumb";
          img.alt = "Tie photo";
          photosRow.appendChild(img);
        });
        li.appendChild(photosRow);
      }
      list.appendChild(li);
    });
  }

  handleEvidencePhoto(file) {
    if (!file) {
      this.currentEvidencePhoto = null;
      this.updateEvidenceSaveState();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.currentEvidencePhoto = reader.result;
      this.updateEvidenceSaveState();
    };
    reader.readAsDataURL(file);
  }

  captureEvidenceLocation() {
    if (!navigator.geolocation) {
      if (this.elements.evidenceLocationStatus) {
        this.elements.evidenceLocationStatus.textContent =
          "Geolocation not supported.";
      }
      return;
    }
    if (this.elements.evidenceLocationStatus) {
      this.elements.evidenceLocationStatus.textContent = "Getting location…";
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentEvidenceLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (this.elements.evidenceLocationStatus) {
          this.elements.evidenceLocationStatus.textContent = `Lat ${pos.coords.latitude.toFixed(
            6
          )}, Lon ${pos.coords.longitude.toFixed(
            6
          )} (±${pos.coords.accuracy.toFixed(1)} m)`;
        }
        this.updateEvidenceSaveState();
      },
      () => {
        if (this.elements.evidenceLocationStatus) {
          this.elements.evidenceLocationStatus.textContent =
            "Unable to get location.";
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  updateEvidenceSaveState() {
    if (!this.elements.saveEvidenceButton) return;
    const recordId = this.elements.evidenceRecordSelect?.value || "";
    const type = this.elements.evidenceType?.value || "";
    const cornerType = this.elements.evidenceCornerType?.value || "";
    const cornerStatus = this.elements.evidenceCornerStatus?.value || "";
    const status = this.elements.evidenceStatus?.value || "";
    const condition = this.elements.evidenceCondition?.value || "";
    const canSave =
      !!this.currentProjectId &&
      !!type &&
      !!cornerType &&
      !!cornerStatus &&
      !!status &&
      !!condition;
    this.elements.saveEvidenceButton.disabled = !canSave;
  }

  saveEvidenceEntry() {
    const recordId = this.elements.evidenceRecordSelect?.value || "";
    const pointIndexStr = this.elements.evidencePointSelect?.value || "";
    if (!this.currentProjectId) return;

    this.clearCpfValidationState();

    const hasPointSelection = pointIndexStr !== "";
    const pointIndex = hasPointSelection ? parseInt(pointIndexStr, 10) : null;
    const pointMeta = hasPointSelection
      ? this.currentTraversePointOptions.find((p) => p.index === pointIndex)
      : null;
    const township = this.elements.evidenceTownship?.value.trim() || "";
    const range = this.elements.evidenceRange?.value.trim() || "";
    const section = this.elements.evidenceSection?.value.trim() || "";
    const sectionBreakdown =
      this.elements.evidenceSectionBreakdown?.value.trim() || "";
    const record = recordId
      ? this.projects[this.currentProjectId]?.records?.[recordId]
      : null;
    const entry = new CornerEvidence({
      id: Date.now().toString(),
      projectId: this.currentProjectId,
      recordId,
      recordName: record?.name || (recordId ? "Untitled record" : ""),
      pointIndex: hasPointSelection ? pointIndex : null,
      pointLabel: pointMeta?.label || (hasPointSelection ? "Traverse point" : ""),
      coords: pointMeta?.coords || null,
      township,
      range,
      section,
      sectionBreakdown,
      type: this.elements.evidenceType?.value || "",
      cornerType: this.elements.evidenceCornerType?.value || "",
      cornerStatus: this.elements.evidenceCornerStatus?.value || "",
      status: this.elements.evidenceStatus?.value || "Draft",
      condition: this.elements.evidenceCondition?.value || "",
      basisOfBearing: this.elements.evidenceBasisOfBearing?.value.trim() || "",
      monumentType: this.elements.evidenceMonumentType?.value.trim() || "",
      monumentMaterial:
        this.elements.evidenceMonumentMaterial?.value.trim() || "",
      monumentSize: this.elements.evidenceMonumentSize?.value.trim() || "",
      surveyorName: this.elements.evidenceSurveyorName?.value.trim() || "",
      surveyorLicense:
        this.elements.evidenceSurveyorLicense?.value.trim() || "",
      surveyorFirm: this.elements.evidenceSurveyorFirm?.value.trim() || "",
      surveyDates: this.elements.evidenceSurveyDates?.value.trim() || "",
      surveyCounty: this.elements.evidenceSurveyCounty?.value.trim() || "",
      recordingInfo: this.elements.evidenceRecordingInfo?.value.trim() || "",
      notes: this.elements.evidenceNotes?.value.trim() || "",
      ties: this.currentEvidenceTies.map((tie) =>
        tie instanceof EvidenceTie ? tie : new EvidenceTie({ ...tie })
      ),
      photo: this.currentEvidencePhoto || null,
      location: this.currentEvidenceLocation || null,
      createdAt: new Date().toISOString(),
    });

    entry.title = this.buildEvidenceTitle(entry);

    this.versioningService.touchEntity(entry, { prefix: "evidence" });
    entry.ties = this.versioningService.touchArray(entry.ties || [], "tie");
    this.cornerEvidenceService.addEntry(entry);
    this.scheduleSync();
    this.resetEvidenceForm();
    this.renderEvidenceList();
  }

  renderEvidenceList() {
    if (!this.elements.evidenceList || !this.elements.evidenceSummary) return;
    const evidence = this.cornerEvidenceService.getProjectEvidence(
      this.currentProjectId
    );
    const container = this.elements.evidenceList;
    container.innerHTML = "";
    const qcResults = this.latestQcResults || this.computeQualityResults();
    const failingTraverseIds = qcResults?.failedTraverseIds || [];

    if (!this.currentProjectId) {
      this.elements.evidenceSummary.textContent =
        "Select a project to view evidence.";
      return;
    }

    if (evidence.length === 0) {
      this.elements.evidenceSummary.textContent =
        "No evidence saved for this project yet.";
      return;
    }

    this.elements.evidenceSummary.textContent = `${evidence.length} evidence entr${
      evidence.length === 1 ? "y" : "ies"
    } documented.`;

    evidence
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((ev) => {
        const card = document.createElement("div");
        card.className = "card";
        const title = document.createElement("strong");
        title.textContent =
          ev.title || this.buildEvidenceTitle(ev) || "Untied evidence entry";
        const meta = document.createElement("div");
        meta.className = "subtitle";
        meta.style.marginTop = "4px";
        const recordLabel = ev.recordName || "No record link";
        meta.textContent = `${recordLabel} · Saved ${new Date(
          ev.createdAt
        ).toLocaleString()}`;
        const status = document.createElement("span");
        status.textContent = ev.status || "Draft";
        status.className = `status-chip ${this.getEvidenceStatusClass(
          ev.status
        )}`;
        status.setAttribute("aria-label", ev.status || "Draft");
        status.style.marginTop = "6px";
        card.append(title, meta, status);

        if (ev.recordId && failingTraverseIds.includes(ev.recordId)) {
          card.classList.add("qc-risk-card");
          const qcWarning = document.createElement("div");
          qcWarning.className = "mini-note";
          qcWarning.textContent =
            "QC: traverse closure failed for this linked record.";
          card.appendChild(qcWarning);
        }

        if (ev.coords) {
          const coords = document.createElement("div");
          coords.textContent = `Coords: E ${ev.coords.x.toFixed(
            2
          )}, N ${ev.coords.y.toFixed(2)}`;
          card.appendChild(coords);
        }
        if (ev.type) {
          const type = document.createElement("div");
          type.textContent = `Type: ${ev.type}`;
          card.appendChild(type);
        }
        const trs = this.buildEvidenceTrs(ev);
        if (trs) {
          const trsLine = document.createElement("div");
          trsLine.textContent = `TRS: ${trs}`;
          card.appendChild(trsLine);
        }
        if (ev.cornerType || ev.cornerStatus) {
          const cornerMeta = document.createElement("div");
          const parts = [ev.cornerType, ev.cornerStatus].filter(Boolean);
          cornerMeta.textContent = `Corner classification: ${parts.join(" · ")}`;
          card.appendChild(cornerMeta);
        }
        if (ev.condition) {
          const condition = document.createElement("div");
          condition.textContent = `Condition: ${ev.condition}`;
          card.appendChild(condition);
        }
        if (
          ev.monumentType ||
          ev.monumentMaterial ||
          ev.monumentSize
        ) {
          const monument = document.createElement("div");
          const parts = [ev.monumentType, ev.monumentMaterial, ev.monumentSize]
            .filter(Boolean)
            .join(" · ");
          monument.textContent = `Monument: ${parts}`;
          card.appendChild(monument);
        }
        if (ev.basisOfBearing) {
          const basis = document.createElement("div");
          basis.textContent = `Basis of bearing: ${ev.basisOfBearing}`;
          card.appendChild(basis);
        }
        if (ev.surveyorName || ev.surveyorLicense || ev.surveyorFirm) {
          const surveyor = document.createElement("div");
          const parts = [
            ev.surveyorName,
            ev.surveyorLicense ? `PLS ${ev.surveyorLicense}` : null,
            ev.surveyorFirm,
          ].filter(Boolean);
          surveyor.textContent = `Responsible surveyor: ${parts.join(" · ")}`;
          card.appendChild(surveyor);
        }
        if (ev.surveyDates || ev.surveyCounty || ev.recordingInfo) {
          const recordMeta = document.createElement("div");
          const parts = [
            ev.surveyDates ? `Surveyed ${ev.surveyDates}` : null,
            ev.surveyCounty ? `County: ${ev.surveyCounty}` : null,
            ev.recordingInfo ? `Recording: ${ev.recordingInfo}` : null,
          ].filter(Boolean);
          recordMeta.textContent = parts.join(" · ");
          card.appendChild(recordMeta);
        }
        if (ev.notes) {
          const notes = document.createElement("div");
          notes.style.marginTop = "6px";
          notes.textContent = ev.notes;
          card.appendChild(notes);
        }

        const mediaRow = document.createElement("div");
        mediaRow.className = "evidence-media-grid";
        if (ev.photo) {
          const photoImg = document.createElement("img");
          photoImg.src = ev.photo;
          photoImg.alt = "Evidence photo";
          photoImg.className = "evidence-thumb";
          mediaRow.appendChild(photoImg);
        }
        if (ev.location) {
          const loc = document.createElement("div");
          loc.textContent = `GPS: Lat ${ev.location.lat.toFixed(
            6
          )}, Lon ${ev.location.lon.toFixed(
            6
          )} (±${ev.location.accuracy.toFixed(1)} m)`;
          mediaRow.appendChild(loc);
        }
        if (mediaRow.childNodes.length > 0) {
          card.appendChild(mediaRow);
        }

        if (ev.ties?.length) {
          const tiesWrap = document.createElement("div");
          const tiesHeading = document.createElement("strong");
          tiesHeading.textContent = "Ties";
          const ul = document.createElement("ul");
          ev.ties.forEach((t) => {
            const li = document.createElement("li");
            const parts = [t.distance, t.bearing, t.description].filter(
              Boolean
            );
            li.textContent = parts.join(" · ");
            if (t.photos?.length) {
              const tiePhotos = document.createElement("div");
              tiePhotos.className = "tie-photos";
              t.photos.forEach((src) => {
                const img = document.createElement("img");
                img.src = src;
                img.className = "tie-photo-thumb";
                img.alt = "Tie photo";
                tiePhotos.appendChild(img);
              });
              li.appendChild(tiePhotos);
            }
            ul.appendChild(li);
          });
          tiesWrap.append(tiesHeading, ul);
          card.appendChild(tiesWrap);
        }

        const actionsRow = document.createElement("div");
        actionsRow.style.marginTop = "8px";
        const exportBtn = document.createElement("button");
        exportBtn.type = "button";
        exportBtn.textContent = "Export CPF";
        exportBtn.addEventListener("click", () => this.exportCornerFiling(ev));
        actionsRow.appendChild(exportBtn);
        card.appendChild(actionsRow);
        container.appendChild(card);
      });

    this.appControllers?.chainEvidenceSection?.renderChainEvidenceList?.();
    this.populateResearchEvidenceOptions();
  }

  buildEvidenceTrs(entry = {}) {
    const parts = [];
    if (entry.township) parts.push(entry.township.trim());
    if (entry.range) parts.push(entry.range.trim());
    if (entry.section) parts.push(`Sec ${entry.section}`.trim());
    if (entry.sectionBreakdown) parts.push(entry.sectionBreakdown.trim());
    return parts.join(" ").trim();
  }

  buildEvidenceTitle(entry = {}) {
    const trs = this.buildEvidenceTrs(entry);
    if (trs) return `Corner Evidence – ${trs}`;
    return entry.pointLabel || entry.recordName || "Corner Evidence";
  }

  refreshChainEvidence() {
    this.appControllers?.chainEvidenceSection?.refreshChainEvidence?.();
    this.populateResearchEvidenceOptions();
  }
  };

export default EvidenceLoggerMixin;
