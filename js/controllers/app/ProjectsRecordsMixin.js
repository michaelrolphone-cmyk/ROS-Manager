import Project from "../../models/Project.js";
import SurveyRecord from "../../models/SurveyRecord.js";
import Point from "../../models/Point.js";
import ChainEvidenceAppController from "../apps/ChainEvidenceAppController.js";
import EquipmentAppController from "../apps/EquipmentAppController.js";
import EvidenceAppController from "../apps/EvidenceAppController.js";
import HelpAppController from "../apps/HelpAppController.js";
import LevelingAppController from "../apps/LevelingAppController.js";
import ExportsAppController from "../apps/ExportsAppController.js";
import NavigationAppController from "../apps/NavigationAppController.js";
import PointsAppController from "../apps/PointsAppController.js";
import QcAppController from "../apps/QcAppController.js";
import ResearchAppController from "../apps/ResearchAppController.js";
import SettingsAppController from "../apps/SettingsAppController.js";
import SpringboardAppController from "../apps/SpringboardAppController.js";
import TraverseAppController from "../apps/TraverseAppController.js";
import VicinityMapAppController from "../apps/VicinityMapAppController.js";
import StakeoutAppController from "../apps/StakeoutAppController.js";
import { buildMapboxStaticUrl, getMapboxToken } from "../../services/MapboxService.js";

const ProjectsRecordsMixin = (Base) =>
  class extends Base {
    /* ===================== Projects & Records ===================== */
    loadProject(id, options = {}) {
      const { preserveRecord = false } = options;
      const previousRecordId =
        preserveRecord && this.currentProjectId === id
          ? this.currentRecordId
          : null;

      if (!id || !this.projects[id]) {
        this.currentProjectId = null;
        this.currentRecordId = null;
        this.elements.editor.style.display = "none";
        this.appControllers?.traverseSection?.renderRecords();
        this.updateProjectList();
        this.drawProjectOverview();
        this.hideProjectForm();
        this.refreshEvidenceUI();
        this.refreshResearchUI();
        this.resetEquipmentForm();
        this.refreshEquipmentUI();
        this.appControllers?.stakeoutSection?.refreshOptions?.();
        this.appControllers?.stakeoutSection?.resetForm?.();
        this.appControllers?.stakeoutSection?.renderStakeoutList?.();
        this.pointController.renderPointsTable();
        this.refreshEvidenceUI();
        this.populateLocalizationSelectors();
        this.navigationController?.onProjectChanged();
        this.populatePointGenerationOptions();
        this.populateProjectDetailsForm(null);
        this.renderAuditTrail();
        this.updateSpringboardHero();
        this.renderSmartPackStatus?.();
        this.renderRollingBackupList?.();
        this.levelingController?.onProjectChanged();
        this.populateQcSettings(null);
        this.renderQualityDashboard();
        this.appControllers?.chainEvidenceSection?.resetChainFilters?.();
        return;
      }

      this.currentProjectId = id;
      const recordExists = Boolean(
        previousRecordId &&
          this.projects[id]?.records &&
          this.projects[id].records[previousRecordId]
      );
      this.currentRecordId = recordExists ? previousRecordId : null;
      if (!this.currentRecordId && this.elements.editor)
        this.elements.editor.style.display = "none";

      this.appControllers?.chainEvidenceSection?.resetChainFilters?.();
      this.appControllers?.traverseSection?.renderRecords();
      this.updateProjectList();
      this.drawProjectOverview();
      this.hideProjectForm();
      this.pointController.renderPointsTable();
      this.refreshEvidenceUI();
      this.refreshResearchUI();
      this.resetEquipmentForm();
      this.refreshEquipmentUI();
      this.appControllers?.stakeoutSection?.refreshOptions?.();
      this.appControllers?.stakeoutSection?.resetForm?.();
      this.appControllers?.stakeoutSection?.renderStakeoutList?.();
      this.populateLocalizationSelectors();
      this.navigationController?.onProjectChanged();
      this.populatePointGenerationOptions();
      this.populateProjectDetailsForm(this.projects[id]);
      this.renderAuditTrail();
      this.updateSpringboardHero();
      this.renderSmartPackStatus?.();
      this.renderRollingBackupList?.();
      this.handleSpringboardScroll();
      this.levelingController?.onProjectChanged();
      this.populateQcSettings(this.projects[id]);
      this.renderQualityDashboard();

      if (this.currentRecordId) {
        this.loadRecord(this.currentRecordId);
      }
    }

    newProject() {
      this.showProjectForm();
    }

    createProject() {
      const input = this.elements.projectNameInput;
      const name = (input?.value || "").trim();
      if (!name) return alert("Enter a project name");
      const id = Date.now().toString();
      this.projects[id] = new Project({ name, records: {}, points: [] });
      this.saveProjects();
      if (input) input.value = "";
      this.hideProjectForm();
      this.loadProject(id);
    }

    populateProjectDetailsForm(project) {
      const fields = [
        [this.elements.projectDetailName, project?.name || ""],
        [this.elements.projectClientInput, project?.clientName || ""],
        [this.elements.projectClientPhoneInput, project?.clientPhone || ""],
        [this.elements.projectClientEmailInput, project?.clientEmail || ""],
        [this.elements.projectAddressInput, project?.address || ""],
        [
          this.elements.projectTownshipInput,
          project?.townships?.length ? project.townships.join(", ") : "",
        ],
        [
          this.elements.projectRangeInput,
          project?.ranges?.length ? project.ranges.join(", ") : "",
        ],
        [
          this.elements.projectSectionInput,
          project?.sections?.length ? project.sections.join(", ") : "",
        ],
        [this.elements.projectSectionQuadrant, project?.sectionQuadrant || ""],
        [this.elements.projectPlatBook, project?.platBook || ""],
        [this.elements.projectPlatPageStart, project?.platPageStart || ""],
        [this.elements.projectPlatPageEnd, project?.platPageEnd || ""],
        [this.elements.projectDescriptionInput, project?.description || ""],
      ];

      const hasProject = Boolean(project);

      fields.forEach(([el, value]) => {
        if (el) {
          el.value = value;
          el.disabled = !hasProject;
        }
      });

      const aliquots = Array.isArray(project?.aliquots) ? project.aliquots : [];
      const aliquotInputs = [
        this.elements.projectAliquot1,
        this.elements.projectAliquot2,
        this.elements.projectAliquot3,
      ];

      aliquotInputs.forEach((el, idx) => {
        if (!el) return;
        el.value = aliquots[idx] || "";
        el.disabled = !hasProject;
      });

      if (this.elements.editProjectDetailsButton) {
        this.elements.editProjectDetailsButton.disabled = !hasProject;
      }

      this.setProjectDetailsEditing(false);
    }

    parseDelimitedInput(value = "") {
      return value
        .split(/[,;\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    normalizeTrsComponent(value = "", padLength = 2) {
      const digits = (value.match(/\d+/g) || []).join("");
      if (!digits) return "";
      return padLength > 0 ? digits.padStart(padLength, "0") : digits;
    }

    normalizeBookOrPage(value = "") {
      const digits = (value.match(/\d+/g) || []).join("");
      return digits;
    }

    aliquotToCode(value = "") {
      const map = { NE: "1", SE: "2", SW: "3", NW: "4" };
      return map[value.toUpperCase?.() || ""] || "0";
    }

    buildAliquotCodes(aliquots = []) {
      const codes = aliquots.slice(0, 3).map((a) => this.aliquotToCode(a));
      while (codes.length < 3) codes.push("0");
      return codes.join("");
    }

    buildProjectIndexNumber(project) {
      if (!project) return "";
      const township =
        this.normalizeTrsComponent(project.townships?.[0], 0) || "0";
      const range = this.normalizeTrsComponent(project.ranges?.[0], 0) || "0";
      const section = this.normalizeTrsComponent(project.sections?.[0]) || "00";
      const quadrant = this.aliquotToCode(project.sectionQuadrant) || "0";
      const aliquotCodes = this.buildAliquotCodes(project.aliquots) || "000";
      const book = this.normalizeBookOrPage(project.platBook) || "0";
      const pageStart = this.normalizeBookOrPage(project.platPageStart) || "0";
      const pageEnd = this.normalizeBookOrPage(project.platPageEnd) || "";

      const base = `${township}${range}${quadrant}-${section}-${aliquotCodes}-${book}-${pageStart}`;
      return pageEnd ? `${base}-${pageEnd || "0"}` : base;
    }

    setProjectDetailsEditing(isEditing) {
      const card = this.elements.projectDetailsCard;
      const hasProject = Boolean(
        this.currentProjectId && this.projects[this.currentProjectId]
      );
      if (!card) return;
      card.classList.toggle("editing", Boolean(isEditing && hasProject));
    }

    saveProjectDetails() {
      if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
        alert("Create or select a project first.");
        return;
      }

      const project = this.projects[this.currentProjectId];
      project.name =
        (this.elements.projectDetailName?.value || project.name || "").trim() ||
        project.name;
      project.clientName = (this.elements.projectClientInput?.value || "").trim();
      project.clientPhone = (
        this.elements.projectClientPhoneInput?.value || ""
      ).trim();
      project.clientEmail = (
        this.elements.projectClientEmailInput?.value || ""
      ).trim();
      project.address = (this.elements.projectAddressInput?.value || "").trim();
      project.townships = this.parseDelimitedInput(
        this.elements.projectTownshipInput?.value
      );
      project.ranges = this.parseDelimitedInput(
        this.elements.projectRangeInput?.value
      );
      project.sections = this.parseDelimitedInput(
        this.elements.projectSectionInput?.value
      );
      project.sectionQuadrant =
        this.elements.projectSectionQuadrant?.value || "";
      project.aliquots = [
        this.elements.projectAliquot1?.value || "",
        this.elements.projectAliquot2?.value || "",
        this.elements.projectAliquot3?.value || "",
      ].filter((entry) => entry && entry.trim().length > 0);
      project.platBook = (this.elements.projectPlatBook?.value || "").trim();
      project.platPageStart =
        (this.elements.projectPlatPageStart?.value || "").trim();
      project.platPageEnd =
        (this.elements.projectPlatPageEnd?.value || "").trim();
      project.description = (
        this.elements.projectDescriptionInput?.value || ""
      ).trim();

      this.saveProjects();
      this.updateProjectList();
      this.updateSpringboardHero();
      this.handleSpringboardScroll();
      this.setProjectDetailsEditing(false);
    }

    populateQcSettings(project) {
      const settings = this.getProjectQcSettings(project);
      if (this.elements.qcTraverseAngularTolerance)
        this.elements.qcTraverseAngularTolerance.value =
          settings.traverseAngularTolerance ?? "";
      if (this.elements.qcTraverseLinearTolerance)
        this.elements.qcTraverseLinearTolerance.value =
          settings.traverseLinearTolerance ?? "";
      if (this.elements.qcLevelTolerance)
        this.elements.qcLevelTolerance.value =
          settings.levelMisclosurePerDistance ?? "";
      if (this.elements.qcSettingsStatus)
        this.elements.qcSettingsStatus.textContent = "";
    }

    getProjectQcSettings(project) {
      return {
        ...this.defaultQcSettings,
        ...((project && project.qcSettings) || {}),
      };
    }

    saveQcSettings() {
      if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
        alert("Select a project first.");
        return;
      }

      const project = this.projects[this.currentProjectId];
      const settings = this.getProjectQcSettings(project);
      const angular = parseFloat(
        this.elements.qcTraverseAngularTolerance?.value
      );
      const linear = parseFloat(
        this.elements.qcTraverseLinearTolerance?.value
      );
      const level = parseFloat(this.elements.qcLevelTolerance?.value);

      if (Number.isFinite(angular)) settings.traverseAngularTolerance = angular;
      if (Number.isFinite(linear)) settings.traverseLinearTolerance = linear;
      if (Number.isFinite(level)) settings.levelMisclosurePerDistance = level;

      project.qcSettings = settings;
      this.saveProjects();
      this.populateQcSettings(project);
      this.renderQualityDashboard();

      if (this.elements.qcSettingsStatus) {
        this.elements.qcSettingsStatus.textContent = "Tolerances saved.";
        setTimeout(() => {
          if (this.elements.qcSettingsStatus)
            this.elements.qcSettingsStatus.textContent = "";
        }, 2500);
      }
    }

    computeQualityResults(projectId = this.currentProjectId) {
      const project = projectId ? this.projects[projectId] : null;

      const results = {
        traverses: [],
        levels: [],
        overallClass: "",
        overallLabel: "No checks yet",
        failedTraverseIds: [],
      };

      if (!project) return results;

      const qcSettings = this.getProjectQcSettings(project);
      const records = project.records || {};
      Object.entries(records).forEach(([id, record], idx) => {
        const geometry = this.computeTraversePointsForRecord(projectId, id);
        const mainLine = geometry?.polylines?.[0] || geometry?.points || [];
        const expectsClosure = record.expectedToClose !== false;
        let totalLength = 0;
        let linearMisclosure = null;
        let angularMisclosure = null;
        let ratio = null;
        let misclosureDirection = null;
        let misclosureBearing = null;
        let closureTarget = null;
        const startPointNumber =
          mainLine[0]?.pointNumber ?? record.startPtNum ?? null;
        let status = "warn";
        let message = "Add traverse calls to compute closure.";

        if (mainLine.length >= 2) {
          for (let i = 1; i < mainLine.length; i++) {
            const prev = mainLine[i - 1];
            const curr = mainLine[i];
            totalLength += Math.hypot(curr.x - prev.x, curr.y - prev.y);
          }
          const closurePointNumber = parseInt(record.closurePointNumber, 10);
          closureTarget = Number.isFinite(closurePointNumber)
            ? mainLine.find((pt) => pt.pointNumber === closurePointNumber) || mainLine[0]
            : mainLine[0];
          const start = mainLine[0];
          const end = mainLine[mainLine.length - 1];
          const dx = end.x - closureTarget.x;
          const dy = end.y - closureTarget.y;
          linearMisclosure = Math.hypot(dx, dy);

          const startAz =
            (Math.atan2(mainLine[1].x - start.x, mainLine[1].y - start.y) *
              180) /
            Math.PI;
          const endAz =
            (Math.atan2(end.x - mainLine[mainLine.length - 2].x, end.y - mainLine[
              mainLine.length - 2
            ].y) *
              180) /
            Math.PI;
          angularMisclosure = Math.abs(
            this.normalizeAngleDiff(endAz - startAz)
          );

          ratio = totalLength > 0 ? linearMisclosure / totalLength : Number.POSITIVE_INFINITY;
          const angularPass = Number.isFinite(qcSettings.traverseAngularTolerance)
            ? angularMisclosure <= qcSettings.traverseAngularTolerance
            : null;
          const linearPass = Number.isFinite(qcSettings.traverseLinearTolerance)
            ? ratio <= qcSettings.traverseLinearTolerance
            : null;
          const misclosureAzimuth = (Math.atan2(dx, dy) * 180) / Math.PI;
          misclosureBearing = this.azimuthToQuadrantBearing(
            this.normalizeAzimuth(misclosureAzimuth)
          );
          misclosureDirection = misclosureBearing?.quadrant
            ? `${misclosureBearing.quadrant}-${misclosureBearing.formatted}`
            : this.formatDegrees(this.normalizeAzimuth(misclosureAzimuth));

          if (!Number.isFinite(linearMisclosure)) {
            status = "warn";
            message = "Need numeric distances to compute closure.";
          } else if (!expectsClosure) {
            status = "warn";
            message = "Open traverse; closure not evaluated.";
          } else if ((angularPass === false || linearPass === false) && qcSettings) {
            status = "fail";
            message = "Fails tolerance";
            results.failedTraverseIds.push(id);
          } else if (angularPass === null && linearPass === null) {
            status = "warn";
            message = "Set tolerances to evaluate.";
          } else {
            status = "pass";
            message = "Passes tolerance";
          }
        }

        results.traverses.push({
          id,
          name: record.name || `Record ${idx + 1}`,
          totalLength,
          linearMisclosure,
          angularMisclosure,
          misclosureRatio: ratio,
          misclosureDirection,
          misclosureBearing: misclosureBearing?.formatted || null,
          closurePointNumber:
            closureTarget?.pointNumber ?? record.startPtNum ?? startPointNumber,
          status,
          message,
        });
      });

      const levelRuns = project.levelRuns || [];
      levelRuns.forEach((run, idx) => {
        const stats = this.levelingController?.computeLevelingRows
          ? this.levelingController.computeLevelingRows(run)
          : {};
        const k = Math.max(stats.rows?.length || 0, 1);
        const allowed =
          Number.isFinite(qcSettings.levelMisclosurePerDistance)
            ? qcSettings.levelMisclosurePerDistance * Math.sqrt(k)
            : null;
        const misclosure = Number.isFinite(stats?.misclosure)
          ? Math.abs(stats.misclosure)
          : null;
        let status = "warn";
        let message = "Add a closing elevation to evaluate.";
        if (Number.isFinite(misclosure) && Number.isFinite(allowed)) {
          status = misclosure <= allowed ? "pass" : "fail";
          message =
            misclosure <= allowed
              ? "Passes tolerance"
              : "Fails tolerance";
        } else if (Number.isFinite(misclosure)) {
          status = "warn";
          message = "Set tolerance to evaluate.";
        }

        results.levels.push({
          id: run.id,
          name: run.name || `Level run ${idx + 1}`,
          misclosure,
          allowed,
          status,
          message,
        });
      });

      const hasChecks = results.traverses.length > 0 || results.levels.length > 0;
      const hasFails =
        results.traverses.some((t) => t.status === "fail") ||
        results.levels.some((l) => l.status === "fail");
      const hasWarnings =
        results.traverses.some((t) => t.status === "warn") ||
        results.levels.some((l) => l.status === "warn");

      if (!hasChecks) {
        results.overallClass = "";
        results.overallLabel = "No checks yet";
      } else if (hasFails) {
        results.overallClass = "qc-fail";
        results.overallLabel = "QC failed";
      } else if (hasWarnings) {
        results.overallClass = "qc-warning";
        results.overallLabel = "Needs attention";
      } else {
        results.overallClass = "qc-pass";
        results.overallLabel = "QC passed";
      }

      return results;
    }

    renderClosureSummary(recordId = this.currentRecordId) {
      const {
        closureStatusChip,
        closurePointLabel,
        closureLinear,
        closureAngular,
        closureDirection,
        closureRatio,
      } = this.elements;
      if (!closureStatusChip) return;

      const reset = () => {
        closureStatusChip.className = "status-chip";
        closureStatusChip.textContent = "No traverse loaded";
        if (closurePointLabel) closurePointLabel.textContent = "—";
        if (closureLinear) closureLinear.textContent = "—";
        if (closureAngular) closureAngular.textContent = "—";
        if (closureDirection) closureDirection.textContent = "—";
        if (closureRatio) closureRatio.textContent = "";
      };

      if (!this.currentProjectId || !recordId) {
        reset();
        return;
      }

      const results = this.computeQualityResults(this.currentProjectId);
      const traverse = results.traverses.find((t) => t.id === recordId);
      if (!traverse) {
        reset();
        return;
      }

      const statusClass =
        traverse.status === "fail"
          ? "qc-fail"
          : traverse.status === "warn"
          ? "qc-warning"
          : traverse.status === "pass"
          ? "qc-pass"
          : "";
      closureStatusChip.className = `status-chip ${statusClass}`.trim();
      closureStatusChip.textContent = traverse.message || "";

      if (closurePointLabel) {
        const label = traverse.closurePointNumber
          ? `P${traverse.closurePointNumber}`
          : "Start";
        closurePointLabel.textContent = label;
      }
      if (closureLinear)
        closureLinear.textContent = this.formatLevelNumber(
          traverse.linearMisclosure
        );
      if (closureAngular)
        closureAngular.textContent = this.formatDegrees(traverse.angularMisclosure);
      if (closureDirection)
        closureDirection.textContent = traverse.misclosureDirection || "—";
      if (closureRatio)
        closureRatio.textContent = this.formatRatio(
          traverse.linearMisclosure,
          traverse.totalLength
        );
    }

    renderQualityDashboard() {
      this.appControllers?.qcSection?.renderQualityDashboard();
      this.renderSmartPackStatus?.();
      this.renderClosureSummary();
    }

    buildQualityControlSummaryData(projectId = this.currentProjectId) {
      if (!projectId) return null;
      const project = this.projects[projectId];
      if (!project) return null;

      const results = this.computeQualityResults(projectId);
      const settings = this.getProjectQcSettings(project);
      const evidence = this.cornerEvidenceService.getProjectEvidence(projectId);

      const failures = results.traverses.filter((t) => t.status === "fail");
      const affectedEvidence = failures.map((fail) => {
        const linked = evidence.filter((ev) => ev.recordId === fail.id);
        return {
          traverseId: fail.id,
          traverseName: fail.name,
          evidence:
            linked.length > 0
              ? linked.map((ev) => ({
                  id: ev.id,
                  title:
                    ev.title || this.buildEvidenceTitle(ev) || "Untitled evidence",
                  trs: this.buildEvidenceTrs(ev) || null,
                  status: ev.status || "Draft",
                }))
              : [],
        };
      });

      return {
        project: {
          id: projectId,
          name: project.name || "Project",
        },
        generatedAt: new Date().toISOString(),
        settings: {
          traverseAngularTolerance: settings.traverseAngularTolerance,
          traverseLinearTolerance: settings.traverseLinearTolerance,
          levelMisclosurePerDistance: settings.levelMisclosurePerDistance,
        },
        overrides: project.qcOverrides || [],
        results,
        affectedEvidence,
      };
    }

  buildQualityControlSummaryHtml(summary, exportStatus = "Draft") {
    const label = this.getExportStatusLabel(exportStatus);
    const profile = this.getProfessionalProfile?.() || {};
    const basis = this.getProjectBasisOfBearing?.(summary.project) || "";
    const formatNumber = (value, digits = 3) =>
      Number.isFinite(value) ? value.toFixed(digits) : "—";
      const formatRatio = (misclosure, length) =>
        this.formatRatio(misclosure, length) || "—";

      const traverseRows = summary.results.traverses
        .map(
          (t) => `
          <tr>
            <td>${this.escapeHtml(t.name)}</td>
            <td>${this.escapeHtml(this.formatLevelNumber(t.linearMisclosure))}</td>
            <td>${this.escapeHtml(formatRatio(t.linearMisclosure, t.totalLength))}</td>
            <td>${this.escapeHtml(t.closurePointNumber ? `P${t.closurePointNumber}` : "Start")}</td>
            <td>${this.escapeHtml(t.misclosureDirection || "—")}</td>
            <td>${this.escapeHtml(this.formatDegrees(t.angularMisclosure))}</td>
            <td>${this.escapeHtml(t.message)}</td>
          </tr>`
        )
        .join("");

      const levelRows = summary.results.levels
        .map(
          (l) => `
          <tr>
            <td>${this.escapeHtml(l.name)}</td>
            <td>${this.escapeHtml(this.formatLevelNumber(l.misclosure))}</td>
            <td>${this.escapeHtml(this.formatLevelNumber(l.allowed))}</td>
            <td>${this.escapeHtml(l.message)}</td>
          </tr>`
        )
        .join("");

      const evidenceBlocks = summary.affectedEvidence
        .map((item) => {
          const evList =
            item.evidence.length > 0
              ? `<ul>${item.evidence
                  .map(
                    (ev) => `
                <li><strong>${this.escapeHtml(ev.title)}</strong>${
                  ev.trs ? ` — ${this.escapeHtml(ev.trs)}` : ""
                } (${this.escapeHtml(ev.status)})</li>`
                  )
                  .join("\n")}</ul>`
              : `<p class="muted">No evidence linked to this traverse.</p>`;
          return `<div class="section">
            <h3>${this.escapeHtml(item.traverseName)}</h3>
            ${evList}
          </div>`;
        })
        .join("");

      return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Quality Control Summary</title>
      <style>
        body { font-family: "Segoe UI", Tahoma, sans-serif; color: #1c1c1c; margin: 28px; line-height: 1.5; }
        h1 { margin: 0 0 6px; font-size: 22px; }
        h2 { margin: 18px 0 8px; font-size: 16px; letter-spacing: 0.2px; }
        h3 { margin: 12px 0 6px; font-size: 14px; }
        .chip { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #eef2ff; color: #2a3a8f; font-weight: 600; font-size: 12px; }
        .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 14px; margin-top: 10px; }
        .meta div { padding: 6px 8px; background: #f5f7fb; border-radius: 6px; }
        .section { border: 1px solid #d7dce5; border-radius: 8px; padding: 10px 12px; margin-top: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { border: 1px solid #d7dce5; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; }
        .muted { color: #5b6475; font-size: 12px; margin-top: 4px; }
        .signature-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 14px; align-items: stretch; }
        .sig-box { border: 1px dashed #d7dce5; padding: 12px; min-height: 100px; }
        .seal-box { border: 2px solid #1c1c1c; min-height: 110px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
      </style>
    </head>
    <body>
      <h1>Quality Control Summary</h1>
      <div class="chip">${this.escapeHtml(label.title)}</div>
      ${label.note ? `<div class="muted">${this.escapeHtml(label.note)}</div>` : ""}
      <div class="meta">
        <div><strong>Project</strong><br />${this.escapeHtml(
          summary.project.name
        )}</div>
        <div><strong>Generated</strong><br />${this.escapeHtml(
          new Date(summary.generatedAt).toLocaleString()
        )}</div>
        <div><strong>Overall status</strong><br />${this.escapeHtml(
          summary.results.overallLabel || "No checks yet"
        )}</div>
      </div>

      ${this.buildProfessionalHeader?.(profile, summary.project, { basisOfBearing: basis }) || ""}

      <div class="section">
        <h2>Tolerances</h2>
        <p class="muted">Overrides: ${summary.overrides.length || 0}
          recorded${summary.overrides.length ? " (not yet surfaced in UI)" : ""}.</p>
        <ul>
          <li>Traverse angular: ${this.escapeHtml(
            formatNumber(summary.settings.traverseAngularTolerance, 2)
          )}°</li>
          <li>Traverse linear misclosure per distance: ${this.escapeHtml(
            summary.settings.traverseLinearTolerance || "—"
          )}</li>
          <li>Level misclosure factor (× √K): ${this.escapeHtml(
            formatNumber(summary.settings.levelMisclosurePerDistance, 3)
          )}</li>
        </ul>
      </div>

      <div class="section">
        <h2>Traverse checks</h2>
        <table>
          <thead>
            <tr>
              <th>Traverse</th>
              <th>Linear misclosure</th>
              <th>Misclosure ratio</th>
              <th>Closure point</th>
              <th>Misclosure bearing</th>
              <th>Angular misclosure</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${traverseRows || '<tr><td colspan="6">No traverses evaluated.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Level loop checks</h2>
        <table>
          <thead>
            <tr>
              <th>Level run</th>
              <th>Misclosure</th>
              <th>Allowed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${levelRows || '<tr><td colspan="4">No level loops evaluated.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Affected evidence for failed checks</h2>
        ${
          evidenceBlocks ||
          '<p class="muted">All traverses are passing or no evidence is linked to failed traverses.</p>'
        }
      </div>
    </body>
  </html>`;
    }

    buildAllQualityControlSummaries() {
      const summaries = {};
      Object.keys(this.projects || {}).forEach((projectId) => {
        const summary = this.buildQualityControlSummaryData(projectId);
        if (summary) summaries[projectId] = summary;
      });
      return summaries;
    }

    exportQualityControlSummary() {
      const summary = this.buildQualityControlSummaryData();
      if (!summary) {
        alert("Select a project to export QC results.");
        return;
      }

      const filename = `qc-summary-${(summary.project.name || "project")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.html`;
      const html = this.buildQualityControlSummaryHtml(summary, "Draft");
      this.downloadHtml(html, filename);
    }

    formatRatio(misclosure, length) {
      if (!Number.isFinite(misclosure) || !Number.isFinite(length) || length === 0)
        return "—";
      if (misclosure === 0) return "Closed";
      const ratio = length / misclosure;
      return `1:${Math.round(ratio).toLocaleString()}`;
    }

    formatDegrees(value) {
      return Number.isFinite(value) ? `${value.toFixed(2)}°` : "—";
    }

    normalizeAngleDiff(angle) {
      const normalized = ((angle + 180) % 360) - 180;
      return normalized;
    }

    formatLevelNumber(value) {
      return Number.isFinite(value) ? value.toFixed(3) : "—";
    }

    deleteCurrentProject() {
      if (
        !this.currentProjectId ||
        !confirm("Delete entire project and all records?")
      )
        return;
      delete this.projects[this.currentProjectId];
      this.cornerEvidenceService.removeProjectEvidence(this.currentProjectId);
      this.researchDocumentService.removeProjectDocuments(this.currentProjectId);
      this.saveProjects();
      this.currentProjectId = null;
      this.currentRecordId = null;
      this.elements.editor.style.display = "none";
      this.appControllers?.traverseSection?.renderRecords();
      this.updateProjectList();
      this.drawProjectOverview();
      this.pointController.renderPointsTable();
      this.populateProjectDetailsForm(null);
      this.updateSpringboardHero();
      this.handleSpringboardScroll();
    }

    toggleProjectActionsMenu() {
      this.elements.projectActionsContainer?.classList.toggle("open");
    }

    closeProjectActionsMenu() {
      this.elements.projectActionsContainer?.classList.remove("open");
    }

    showProjectForm() {
      this.closeProjectActionsMenu();
      if (this.elements.projectControls) {
        this.elements.projectControls.classList.add("visible");
      }
      this.elements.projectNameInput?.focus();
    }

    hideProjectForm() {
      if (this.elements.projectControls) {
        this.elements.projectControls.classList.remove("visible");
      }
      if (this.elements.projectNameInput) {
        this.elements.projectNameInput.value = "";
      }
    }

    populatePointGenerationOptions() {
      const select = this.elements.pointsFromRecordSelect;
      const button = this.elements.generatePointsFromTraverseButton;
      if (!select) return;

      const previous = select.value;
      select.innerHTML = "";

      const project = this.currentProjectId
        ? this.projects[this.currentProjectId]
        : null;

      const disable = (message) => {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = message;
        opt.disabled = true;
        opt.selected = true;
        select.appendChild(opt);
        select.disabled = true;
        if (button) button.disabled = true;
      };

      if (!project) {
        disable("Select a project first");
        return;
      }

      const records = project.records || {};
      const ids = Object.keys(records);
      if (!ids.length) {
        disable("No records yet");
        return;
      }

      select.disabled = false;
      if (button) button.disabled = false;

      ids.forEach((id, idx) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = records[id].name || `Record ${idx + 1}`;
        if (id === previous || (!previous && idx === 0)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }

    createRecord() {
      if (!this.currentProjectId || !this.projects[this.currentProjectId])
        return alert("Select a project first");
      const name = (this.elements.recordNameInput?.value || "").trim();
      if (!name) return alert("Enter a record name");
      const id = Date.now().toString();
      const newRecord = new SurveyRecord({
        id,
        name,
        calls: [],
        startFromRecordId: null,
      });
      this.projects[this.currentProjectId].records[id] = newRecord;
      if (this.elements.recordNameInput) this.elements.recordNameInput.value = "";
      this.saveProjects();
      this.loadRecord(id);
      this.appControllers?.traverseSection?.renderRecords();
      this.updateProjectList();
    }

    loadRecord(id) {
      this.currentRecordId = id;
      const record = this.projects[this.currentProjectId].records[id];
      this.elements.currentRecordName.textContent = record.name;
      if (this.elements.recordStatus) {
        this.elements.recordStatus.value = record.status || "Draft";
      }
      this.elements.startPtNum.value = record.startPtNum || "1";
      this.elements.northing.value = record.northing || "5000";
      this.elements.easting.value = record.easting || "5000";
      this.elements.elevation.value = record.elevation || "0";
      this.elements.bsAzimuth.value = record.bsAzimuth || "0.0000";
      this.elements.basis.value = record.basis || "";
      this.elements.firstDist.value = record.firstDist || "";
      if (this.elements.closurePointNumber)
        this.elements.closurePointNumber.value = record.closurePointNumber || "";
      if (this.elements.expectedToClose)
        this.elements.expectedToClose.checked = record.expectedToClose !== false;
      this.elements.editor.style.display = "block";

      const tbody = this.elements.callsTableBody;
      tbody.innerHTML = "";
      this.renderCallList(record.calls || [], tbody, 0);
      this.reindexRows();

      this.updateStartFromDropdownUI();
      this.updateAllBearingArrows();
      this.appControllers?.traverseSection?.renderRecords();
      this.generateCommands();
      this.refreshEvidenceUI(record.id);
      this.populatePointGenerationOptions();
      this.renderClosureSummary(record.id);
    }

    generatePointFileFromRecord() {
      const project = this.currentProjectId
        ? this.projects[this.currentProjectId]
        : null;
      if (!project) return alert("Select a project first");

      const recordId = this.elements.pointsFromRecordSelect?.value;
      const record = project.records?.[recordId];
      if (!record) return alert("Choose a record to generate points from.");

      const traverse = this.computeTraversePointsForRecord(
        this.currentProjectId,
        recordId
      );
      const traversePoints = traverse?.points || [];
      if (!traversePoints.length) {
        alert("No traverse points available for this record.");
        return;
      }

      const startNumber = parseInt(record.startPtNum, 10);
      const baseNumber = Number.isFinite(startNumber) ? startNumber : 1;
      const elevation = record.elevation || "";
      const descriptionBase = record.name
        ? `Generated from ${record.name}`
        : "Generated from traverse";

      const sortedPoints = [...traversePoints].sort(
        (a, b) => (a.pointNumber || 0) - (b.pointNumber || 0)
      );

      const points = sortedPoints.map(
        (pt, idx) =>
          new Point({
            pointNumber:
              (pt.pointNumber ?? baseNumber + idx).toString() || "",
            x: pt.x?.toString() || "",
            y: pt.y?.toString() || "",
            elevation,
            description: descriptionBase,
          })
      );

      const name = `${record.name || "Record"} Points`;
      const created = this.pointController.createPointFileFromPoints(name, points);
      if (created) {
        alert(`Created point file "${created.name}" with ${points.length} point(s).`);
      }
    }

    formatListForDisplay(list) {
      if (!Array.isArray(list) || list.length === 0) return "—";
      return list.join(", ");
    }

    formatDateTimeForDisplay(value) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    getExportAlert(project) {
      if (!project) return { warning: "", lastExport: null };
      const lastExport = project?.lastExportedAt
        ? new Date(project.lastExportedAt)
        : null;
      const updatedAt = project?.updatedAt ? new Date(project.updatedAt) : null;
      const now = new Date();
      const stale = lastExport
        ? (now.getTime() - lastExport.getTime()) / (1000 * 60 * 60 * 24) > 7
        : false;
      const hasUnexportedChanges =
        lastExport && updatedAt && updatedAt > lastExport;

      let warning = "";
      if (!lastExport) {
        warning = "No export recorded. Export now to avoid data loss.";
      } else if (stale && hasUnexportedChanges) {
        warning =
          "Export is older than 7 days and changes have not been saved to an export.";
      } else if (stale) {
        warning = "No export in the last 7 days. Create a backup.";
      } else if (hasUnexportedChanges) {
        warning = "Recent changes have not been exported yet.";
      }

      return { warning, lastExport };
    }

    updateSpringboardHero() {
      const project = this.currentProjectId
        ? this.projects[this.currentProjectId]
        : null;
      const hero = this.elements.springboardHero;
      const titleEl = this.elements.springboardProjectTitle;
      const nameEl = this.elements.springboardProjectName;
      const indexEl = this.elements.springboardProjectIndex;
      const descEl = this.elements.springboardProjectDescription;
      const thumbCanvas = this.elements.springboardCompositeCanvas;
      const thumbWrapper = thumbCanvas?.parentElement;
      const thumbEmpty = this.elements.springboardCompositeEmpty;
      const hasProject = Boolean(project);
      const indexNumber = hasProject
        ? this.buildProjectIndexNumber(project)
        : "";

      if (hero) {
        hero.classList.toggle("empty", !project);
        if (!project) hero.classList.remove("collapsed");
      }

      if (thumbWrapper) {
        thumbWrapper.classList.toggle("has-geometry", false);
      }

      if (!project) {
        if (nameEl) nameEl.textContent = "No project selected";
        else if (titleEl) titleEl.textContent = "No project selected";
        if (indexEl) {
          indexEl.textContent = "";
          indexEl.style.display = "none";
        }
        if (descEl)
          descEl.textContent =
            "Create or open a project to see its location context.";
      } else {
        const projectName = project.name || "Active Project";
        if (nameEl) nameEl.textContent = projectName;
        else if (titleEl) titleEl.textContent = projectName;
        if (indexEl) {
          indexEl.textContent = indexNumber;
          indexEl.style.display = indexNumber ? "inline-flex" : "none";
        } else if (titleEl && !nameEl && indexNumber) {
          titleEl.textContent = `${projectName} (${indexNumber})`;
        }
        if (descEl)
          descEl.textContent =
            project.description?.trim() ||
            "Add a project description to guide the crew.";
      }

      if (thumbEmpty) {
        thumbEmpty.textContent = hasProject
          ? "Add traverse calls to see an overview"
          : "Select a project to see an overview";
      }

      const setValue = (el, value) => {
        if (!el) return;
        el.textContent = value && value.trim ? value.trim() : value;
      };

      const setContactAction = (el, href) => {
        if (!el) return;
        if (href) {
          el.href = href;
          el.setAttribute("aria-disabled", "false");
          el.classList.remove("disabled");
        } else {
          el.removeAttribute("href");
          el.setAttribute("aria-disabled", "true");
          el.classList.add("disabled");
        }
      };

      const phone = project?.clientPhone?.trim() || "";
      const address = project?.address?.trim() || "";
      const email = project?.clientEmail?.trim() || "";

      setValue(this.elements.springboardClientValue, project?.clientName || "—");
      setValue(this.elements.springboardClientPhoneValue, phone || "—");
      setValue(this.elements.springboardAddressValue, address || "—");
      setValue(this.elements.springboardClientEmailValue, email || "—");

      const phoneHref = phone ? `tel:${phone.replace(/[^0-9+]/g, "")}` : "";
      const mapHref = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address
          )}`
        : "";
      const emailHref = email ? `mailto:${email}` : "";

      setContactAction(this.elements.springboardCallButton, phoneHref);
      setContactAction(this.elements.springboardMapButton, mapHref);
      setContactAction(this.elements.springboardEmailButton, emailHref);

      const formatPart = (label, values) => {
        const normalized = Array.isArray(values) ? values : [];
        if (normalized.length === 0) return "";
        const formatted = this.formatListForDisplay(normalized);
        if (formatted === "—") return "";
        return `${label} ${formatted}`;
      };

      const trsParts = [
        formatPart("T", project?.townships),
        formatPart("R", project?.ranges),
        formatPart("Sec", project?.sections),
      ].filter(Boolean);

      setValue(
        this.elements.springboardTrsValue,
        trsParts.length ? trsParts.join(" • ") : "—"
      );

      const { warning, lastExport } = this.getExportAlert(project);
      setValue(
        this.elements.springboardLastExportValue,
        this.formatDateTimeForDisplay(lastExport)
      );
      if (this.elements.springboardExportWarning) {
        this.elements.springboardExportWarning.textContent = warning;
        this.elements.springboardExportWarning.style.display = warning
          ? "block"
          : "none";
      }
      if (this.elements.exportStatusHealthyMessage) {
        this.elements.exportStatusHealthyMessage.style.display =
          !warning && hasProject ? "block" : "none";
      }
      if (this.elements.springboardExportNowButton) {
        this.elements.springboardExportNowButton.style.display =
          warning && hasProject ? "inline-block" : "none";
        this.elements.springboardExportNowButton.disabled = !hasProject;
      }

      const hasComposite =
        hasProject &&
        this.drawProjectCompositeOnCanvas(
          this.currentProjectId,
          thumbCanvas,
          true
        );

      if (!hasComposite && thumbCanvas) {
        this.fitCanvasToDisplaySize(thumbCanvas);
        const ctx = thumbCanvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      }

      if (thumbWrapper) {
        thumbWrapper.classList.toggle("has-geometry", Boolean(hasComposite));
      }

      this.updateSpringboardMapLayer(project);
      this.updateVicinityMap(project);
    }

    async updateSpringboardMapLayer(project) {
      const header = this.elements.pageHeader;
      if (!header) return;

      const address = project?.address?.trim();
      if (!address) {
        this.currentMapAddressKey = "";
        this.currentMapUrl = null;
        header.style.setProperty(
          "--header-map-layer",
          this.defaultHeaderMapLayer
        );
        return;
      }

      const normalizedAddress = address.toLowerCase();
      if (this.currentMapAddressKey === normalizedAddress && this.currentMapUrl) {
        header.style.setProperty(
          "--header-map-layer",
          `url('${this.currentMapUrl}')`
        );
        return;
      }

      this.currentMapAddressKey = normalizedAddress;
      header.style.setProperty("--header-map-layer", this.defaultHeaderMapLayer);
      const requestId = Date.now();
      this.pendingMapRequestId = requestId;

      try {
        const mapUrl = await this.resolveAddressToMap(address);
        if (this.pendingMapRequestId !== requestId) return;
        this.currentMapUrl = mapUrl;
        header.style.setProperty(
          "--header-map-layer",
          mapUrl ? `url('${mapUrl}')` : this.defaultHeaderMapLayer
        );
      } catch (err) {
        console.warn("Map lookup failed", err);
      }
    }

    async updateVicinityMap(project) {
      const image = this.elements.vicinityMapImage;
      const placeholder = this.elements.vicinityMapPlaceholder;
      const status = this.elements.vicinityMapStatus;
      const addressEl = this.elements.vicinityMapAddress;
      const linkEl = this.elements.vicinityMapLink;
      const frame = placeholder?.parentElement;

      if (!image || !placeholder || !status || !addressEl || !linkEl || !frame)
        return;

      const address = project?.address?.trim();
      const mapHref = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address
          )}`
        : "";

      image.src = "";
      frame.classList.remove("has-map");
      placeholder.textContent = address
        ? "Looking up the vicinity map..."
        : "No address configured yet.";
      addressEl.textContent = address || "—";

      if (mapHref) {
        linkEl.href = mapHref;
        linkEl.setAttribute("aria-disabled", "false");
      } else {
        linkEl.removeAttribute("href");
        linkEl.setAttribute("aria-disabled", "true");
      }

      if (!address) {
        status.textContent =
          "Add an address in Project Details to see a map preview.";
        return;
      }

      status.textContent = "Fetching map preview...";
      const requestId = Date.now();
      this.vicinityMapRequestId = requestId;

      try {
        const mapUrl = await this.resolveAddressToMap(address);
        if (this.vicinityMapRequestId !== requestId) return;

        if (mapUrl) {
          image.src = mapUrl;
          frame.classList.add("has-map");
          status.textContent = "Static vicinity map preview ready.";
        } else {
          frame.classList.remove("has-map");
          placeholder.textContent =
            "Map preview unavailable. Open the address in Maps instead.";
          status.textContent =
            "Map preview unavailable. Use the external link if needed.";
        }
      } catch (err) {
        console.warn("Vicinity map lookup failed", err);
        if (this.vicinityMapRequestId === requestId) {
          status.textContent =
            "Map preview unavailable right now. Use the Maps link instead.";
          frame.classList.remove("has-map");
        }
      }
    }

    buildTileMapPreview(lat, lon, zoom = 19) {
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return null;

      return buildMapboxStaticUrl(parsedLat, parsedLon, {
        zoom,
        width: 1200,
        height: 600,
        markerColor: "ef4444",
      });
    }

    async resolveAddressToMap(address) {
      const normalized = address.trim().toLowerCase();
      if (this.geocodeCache[normalized] !== undefined) {
        return this.geocodeCache[normalized];
      }

      if (typeof fetch !== "function") {
        this.geocodeCache[normalized] = null;
        return null;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            address
          )}.json?limit=1&access_token=${getMapboxToken()}`
        );
        const data = await response.json();
        if (Array.isArray(data?.features) && data.features.length) {
          const [lon, lat] = data.features[0]?.center || [];
          const mapUrl = this.buildTileMapPreview(lat, lon, 19);
          this.geocodeCache[normalized] = mapUrl;
          return mapUrl;
        }
      } catch (err) {
        console.warn("Geocode lookup failed", err);
      }

      this.geocodeCache[normalized] = null;
      return null;
    }

    escapeHtml(str = "") {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    renderMarkdown(md = "") {
      const lines = md.replace(/\r\n/g, "\n").split("\n");
      let html = "";
      let inList = false;

      const closeList = () => {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      };

      lines.forEach((line) => {
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        if (heading) {
          closeList();
          const level = heading[1].length;
          const tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
          html += `<${tag}>${this.escapeHtml(heading[2].trim())}</${tag}>`;
          return;
        }

        const listItem = line.match(/^-[\s]+(.*)/);
        if (listItem) {
          if (!inList) html += "<ul>";
          inList = true;
          html += `<li>${this.escapeHtml(listItem[1].trim())}</li>`;
          return;
        }

        if (!line.trim()) {
          closeList();
          return;
        }

        closeList();
        html += `<p>${this.escapeHtml(line.trim())}</p>`;
      });

      closeList();
      return html || "<p>No help content found.</p>";
    }

    createAppControllers() {
      const getCurrentProject = () =>
        this.currentProjectId ? this.projects[this.currentProjectId] : null;

      return {
        springboardSection: new SpringboardAppController({
          id: "springboardSection",
          section: this.elements.springboardSection,
          onScroll: () => this.handleSpringboardScroll(),
        }),
        vicinityMapSection: new VicinityMapAppController({
          id: "vicinityMapSection",
          section: this.elements.vicinityMapSection,
          refreshMap: () => this.updateVicinityMap(getCurrentProject()),
        }),
        traverseSection: new TraverseAppController({
          id: "traverseSection",
          section: this.elements.traverseSection,
          elements: {
            recordList: this.elements.recordList,
          },
          getProjects: () => this.projects,
          getCurrentProjectId: () => this.currentProjectId,
          getCurrentRecordId: () => this.currentRecordId,
          computeTraversePointsForRecord: (projectId, recordId) =>
            this.computeTraversePointsForRecord(projectId, recordId),
          drawTraversePreview: (canvas, points) =>
            this.drawTraversePreview(canvas, points),
          drawProjectOverview: () => this.drawProjectOverview(),
          populatePointGenerationOptions: () => this.populatePointGenerationOptions(),
          loadRecord: (id) => this.loadRecord(id),
          buildStatusChip: (status) => this.buildStatusChip(status),
        }),
        pointsSection: new PointsAppController({
          id: "pointsSection",
          section: this.elements.pointsSection,
          pointController: this.pointController,
        }),
        levelingSection: new LevelingAppController({
          id: "levelingSection",
          section: this.elements.levelingSection,
          levelingController: this.levelingController,
        }),
        qcSection: new QcAppController({
          id: "qcSection",
          section: this.elements.qcSection,
          elements: {
            qcOverallStatus: this.elements.qcOverallStatus,
            qcSummary: this.elements.qcSummary,
            qcTraverseList: this.elements.qcTraverseList,
            qcLevelList: this.elements.qcLevelList,
          },
          getCurrentProjectId: () => this.currentProjectId,
          computeQualityResults: () => this.computeQualityResults(),
          formatLevelNumber: (value) => this.formatLevelNumber(value),
          formatRatio: (misclosure, length) =>
            this.formatRatio(misclosure, length),
          formatDegrees: (value) => this.formatDegrees(value),
          switchTab: (target) => this.switchTab(target),
          loadRecord: (id) => this.loadRecord(id),
          getLevelingController: () => this.levelingController,
          onResultsComputed: (results) => {
            this.latestQcResults = results;
          },
        }),
        exportsSection: new ExportsAppController({
          id: "exportsSection",
          section: this.elements.exportsSection,
        }),
        evidenceSection: new EvidenceAppController({
          id: "evidenceSection",
          section: this.elements.evidenceSection,
          refreshEvidence: () => this.refreshEvidenceUI(),
        }),
        chainEvidenceSection: new ChainEvidenceAppController({
          id: "chainEvidenceSection",
          section: this.elements.chainEvidenceSection,
          elements: {
            chainEvidenceList: this.elements.chainEvidenceList,
            chainEvidenceSummary: this.elements.chainEvidenceSummary,
            chainTrsFilter: this.elements.chainTrsFilter,
            chainCornerTypeFilter: this.elements.chainCornerTypeFilter,
            chainCornerStatusFilter: this.elements.chainCornerStatusFilter,
            chainStatusFilter: this.elements.chainStatusFilter,
            chainStartDate: this.elements.chainStartDate,
            chainEndDate: this.elements.chainEndDate,
            chainApplyFilters: this.elements.chainApplyFilters,
            chainResetFilters: this.elements.chainResetFilters,
            chainExportAll: this.elements.chainExportAll,
          },
          getCurrentProjectId: () => this.currentProjectId,
          getProjectEvidence: () =>
            this.currentProjectId
              ? this.cornerEvidenceService.getProjectEvidence(
                  this.currentProjectId
                )
              : [],
          computeQualityResults: () => this.computeQualityResults(),
          getLatestQcResults: () => this.latestQcResults,
          getResearchDocuments: (projectId) =>
            this.researchDocumentService.getProjectDocuments(projectId),
          buildEvidenceTitle: (entry) => this.buildEvidenceTitle(entry),
          buildEvidenceTrs: (entry) => this.buildEvidenceTrs(entry),
          buildStatusChip: (status) => this.buildStatusChip(status),
          getCpfCompleteness: (entry) => this.getCpfCompleteness(entry),
          exportCornerFiling: (entry) => this.exportCornerFiling(entry),
          downloadHtml: (html, name) => this.downloadHtml(html, name),
          escapeHtml: (text) => this.escapeHtml(text),
        }),
        researchSection: new ResearchAppController({
          id: "researchSection",
          section: this.elements.researchSection,
          elements: {
            researchEvidenceSelect: this.elements.researchEvidenceSelect,
            researchDocumentType: this.elements.researchDocumentType,
            researchJurisdiction: this.elements.researchJurisdiction,
            researchInstrument: this.elements.researchInstrument,
            researchBookPage: this.elements.researchBookPage,
            researchDocumentNumber: this.elements.researchDocumentNumber,
            researchTownship: this.elements.researchTownship,
            researchRange: this.elements.researchRange,
            researchSections: this.elements.researchSections,
            researchAliquots: this.elements.researchAliquots,
            researchSource: this.elements.researchSource,
            researchDateReviewed: this.elements.researchDateReviewed,
            researchReviewer: this.elements.researchReviewer,
            researchStatus: this.elements.researchStatus,
            researchClassification: this.elements.researchClassification,
            researchNotes: this.elements.researchNotes,
            researchCornerNotes: this.elements.researchCornerNotes,
            researchTraverseLinks: this.elements.researchTraverseLinks,
            researchStakeoutLinks: this.elements.researchStakeoutLinks,
            researchCornerIds: this.elements.researchCornerIds,
            researchList: this.elements.researchList,
            researchSummary: this.elements.researchSummary,
            researchFormStatus: this.elements.researchFormStatus,
            saveResearchButton: this.elements.saveResearchButton,
            resetResearchButton: this.elements.resetResearchButton,
            exportResearchButton: this.elements.exportResearchButton,
          },
          getCurrentProjectId: () => this.currentProjectId,
          getProjectEvidence: () =>
            this.currentProjectId
              ? this.cornerEvidenceService.getProjectEvidence(
                  this.currentProjectId
                )
              : [],
          getResearchDocuments: (projectId) =>
            this.researchDocumentService.getProjectDocuments(projectId),
          addResearchDocument: (doc) =>
            this.researchDocumentService.addEntry(doc),
          buildExportMetadata: (status) => this.buildExportMetadata(status),
          getExportStatusLabel: (status) => this.getExportStatusLabel(status),
          downloadText: (text, name) => this.downloadText(text, name),
          getProjectName: () =>
            this.projects[this.currentProjectId]?.name || "Project",
          onResearchListUpdated: () =>
            this.appControllers?.chainEvidenceSection?.renderChainEvidenceList?.(),
        }),
        equipmentSection: new EquipmentAppController({
          id: "equipmentSection",
          section: this.elements.equipmentSection,
          elements: {
            equipmentSetupAt: this.elements.equipmentSetupAt,
            equipmentTearDownAt: this.elements.equipmentTearDownAt,
            equipmentBaseHeight: this.elements.equipmentBaseHeight,
            equipmentReferencePoint: this.elements.equipmentReferencePoint,
            equipmentUsed: this.elements.equipmentUsed,
            equipmentSetupBy: this.elements.equipmentSetupBy,
            equipmentWorkNotes: this.elements.equipmentWorkNotes,
            equipmentReferencePointPicker:
              this.elements.equipmentReferencePointPicker,
            equipmentReferencePointOptions:
              this.elements.equipmentReferencePointOptions,
            equipmentFormStatus: this.elements.equipmentFormStatus,
            saveEquipmentButton: this.elements.saveEquipmentButton,
            resetEquipmentButton: this.elements.resetEquipmentButton,
            equipmentLocationStatus: this.elements.equipmentLocationStatus,
            equipmentList: this.elements.equipmentList,
            equipmentSummary: this.elements.equipmentSummary,
            captureEquipmentLocation: this.elements.captureEquipmentLocation,
          },
          getProjects: () => this.projects,
          getCurrentProjectId: () => this.currentProjectId,
          getActiveTeamMembers: () => this.getActiveTeamMembers(),
          getEquipmentSettings: () => this.globalSettings.equipment || [],
          saveProjects: () => this.saveProjects(),
          escapeHtml: (text) => this.escapeHtml(text),
          onEquipmentLogsChanged: () =>
            this.navigationController?.onEquipmentLogsChanged(),
          onNavigateToEquipment: (id) => {
            if (!this.navigationController) return;
            this.navigationController.renderEquipmentOptions();
            if (this.elements.navigationEquipmentSelect) {
              this.elements.navigationEquipmentSelect.value = id;
            }
            this.navigationController.applyEquipmentTarget(id);
            this.switchTab("navigationSection");
            this.elements.navigationSection?.scrollIntoView({
              behavior: "smooth",
            });
          },
        }),
        stakeoutSection: new StakeoutAppController({
          id: "stakeoutSection",
          section: this.elements.stakeoutSection,
          elements: {
            stakeoutDatetime: this.elements.stakeoutDatetime,
            stakeoutMonumentType: this.elements.stakeoutMonumentType,
            stakeoutMonumentMaterial: this.elements.stakeoutMonumentMaterial,
            stakeoutWitnessMarks: this.elements.stakeoutWitnessMarks,
            stakeoutDigNotes: this.elements.stakeoutDigNotes,
            stakeoutCrewMembers: this.elements.stakeoutCrewMembers,
            stakeoutEquipmentUsed: this.elements.stakeoutEquipmentUsed,
            stakeoutTraverseSelect: this.elements.stakeoutTraverseSelect,
            stakeoutEvidenceSelect: this.elements.stakeoutEvidenceSelect,
            stakeoutControlPoints: this.elements.stakeoutControlPoints,
            saveStakeoutButton: this.elements.saveStakeoutButton,
            resetStakeoutButton: this.elements.resetStakeoutButton,
            stakeoutFormStatus: this.elements.stakeoutFormStatus,
            stakeoutList: this.elements.stakeoutList,
            stakeoutSummary: this.elements.stakeoutSummary,
          },
          getProjects: () => this.projects,
          getCurrentProjectId: () => this.currentProjectId,
          getActiveTeamMembers: () => this.getActiveTeamMembers(),
          getEquipmentSettings: () => this.globalSettings.equipment || [],
          getProjectEvidence: () =>
            this.currentProjectId
              ? this.cornerEvidenceService.getProjectEvidence(
                  this.currentProjectId
                )
              : [],
          getQualityResults: () => this.computeQualityResults(),
          buildEvidenceTitle: (entry) => this.buildEvidenceTitle(entry),
          escapeHtml: (text) => this.escapeHtml(text),
          saveProjects: () => this.saveProjects(),
          buildStatusChip: (status) => this.buildStatusChip(status),
        }),
        navigationSection: new NavigationAppController({
          id: "navigationSection",
          section: this.elements.navigationSection,
        }),
        settingsSection: new SettingsAppController({
          id: "settingsSection",
          section: this.elements.settingsSection,
        }),
        helpSection: new HelpAppController({
          id: "helpSection",
          section: this.elements.helpSection,
          elements: {
            helpContent: this.elements.helpContent,
            helpStatus: this.elements.helpStatus,
          },
          renderMarkdown: (text) => this.renderMarkdown(text),
          loadHelp: () =>
            this.appControllers?.helpSection?.loadHelpDocument?.(false),
        }),
      };
    }

    handleSpringboardScroll() {
      const header = this.elements.pageHeader;
      if (!header) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      header.style.setProperty("--parallax-offset", `${scrollTop * 0.25}px`);
    }
  };

export default ProjectsRecordsMixin;
