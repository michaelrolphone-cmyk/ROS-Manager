const ExportImportMixin = (Base) =>
  class extends Base {
  /* ===================== Export / Import ===================== */
  getExportStatusLabel(status = "Draft") {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("final")) {
      return {
        title: "Final — Professional Declaration Signed",
        note: "Ready for recordation with QC checks satisfied.",
      };
    }
    if (normalized.includes("ready")) {
      return {
        title: "Ready for Review",
        note: "Preliminary — review and seal before filing.",
      };
    }
    if (normalized.includes("progress")) {
      return {
        title: "Preliminary — In Progress",
        note: "Work in progress; not for recordation.",
      };
    }
    return {
      title: "Draft — Partial or Incomplete",
      note: "PRELIMINARY — NOT FOR RECORDATION",
    };
  }

  buildExportMetadata(status = "Draft") {
    const label = this.getExportStatusLabel(status);
    return {
      generatedAt: new Date().toISOString(),
      status: label.title,
      note: label.note,
    };
  }

  recordRollingBackups(projectIds = [], payload, filename) {
    const settings = this.globalSettings?.backupSettings || {};
    if (!settings.rollingBackupsEnabled) return;
    if (!this.rollingBackupService) return;
    const ids = Array.isArray(projectIds) && projectIds.length
      ? projectIds
      : ["all-projects"];
    const serialized =
      typeof payload === "string" ? payload : JSON.stringify(payload || {});
    this.rollingBackupService.addBackup(
      ids,
      `${settings.filenamePrefix || "carlson-backup"}-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
      serialized,
      settings.maxCopies || 3
    );
    this.renderRollingBackupList?.();
  }

  exportCurrentProject() {
    if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
      alert("No current project to export.");
      return;
    }
    const proj = this.projects[this.currentProjectId];
    const evidence = this.cornerEvidenceService.serializeEvidenceForProject(
      this.currentProjectId
    );
    const research = this.researchDocumentService.serializeProject(
      this.currentProjectId
    );
    const qcSummary = this.buildQualityControlSummaryData(this.currentProjectId);
    const payload = {
      type: "CarlsonSurveyManagerProjects",
      version: 2,
      export: this.buildExportMetadata("Draft"),
      projects: {
        [this.currentProjectId]: proj.toObject(),
      },
      evidence: {
        [this.currentProjectId]: evidence,
      },
      research: {
        [this.currentProjectId]: research,
      },
      qcSummaries: qcSummary
        ? { [this.currentProjectId]: qcSummary }
        : {},
    };
    this.downloadJson(
      payload,
      `carlson-${(proj.name || "project").replace(/[^\w\-]+/g, "_")}.json`
    );
    this.recordRollingBackups([this.currentProjectId], payload);
    this.markProjectsExported([this.currentProjectId]);
  }

  exportAllProjects() {
    if (!this.projects || Object.keys(this.projects).length === 0) {
      alert("No projects to export.");
      return;
    }
    const payload = {
      type: "CarlsonSurveyManagerProjects",
      version: 2,
      export: this.buildExportMetadata("Draft"),
      projects: this.serializeProjects(),
      evidence: this.cornerEvidenceService.serializeAllEvidence(),
      research: this.researchDocumentService.serializeAll(),
      qcSummaries: this.buildAllQualityControlSummaries(),
    };
    this.downloadJson(payload, "carlson-all-projects.json");
    this.recordRollingBackups(Object.keys(this.projects || {}), payload);
    this.markProjectsExported(Object.keys(this.projects || {}));
  }

  computeSmartPackStatus(projectId = this.currentProjectId) {
    if (!projectId || !this.projects?.[projectId]) return "Draft";
    const evidence = this.cornerEvidenceService.getProjectEvidence(projectId);
    const research = this.researchDocumentService.getProjectDocuments(
      projectId
    );
    const qcSummary = this.buildQualityControlSummaryData(projectId);

    const evidenceDraft = (evidence || []).some(
      (ev) => (ev.status || "").toLowerCase() !== "final"
    );
    const researchDraft = (research || []).some(
      (doc) => (doc.status || "").toLowerCase() !== "final"
    );

    if (qcSummary?.results?.overallClass === "qc-pass" && !evidenceDraft && !researchDraft)
      return "Final";
    if (qcSummary) return "Ready for Review";
    return "Draft";
  }

  renderSmartPackStatus(status = null) {
    const label = this.getExportStatusLabel(
      status || this.computeSmartPackStatus()
    );
    if (this.elements.smartPackStatusValue)
      this.elements.smartPackStatusValue.textContent =
        label.title || status || "Draft";
    if (this.elements.smartPackStatusNote)
      this.elements.smartPackStatusNote.textContent =
        label.note || "PRELIMINARY — NOT FOR RECORDATION";
  }

  buildSmartPackBundle(projectId = this.currentProjectId) {
    if (!projectId || !this.projects?.[projectId]) {
      alert("Select a project to export a Smart Pack.");
      return null;
    }

    const project = this.projects[projectId];
    const exportStatus = this.computeSmartPackStatus(projectId);
    const metadata = this.buildExportMetadata(exportStatus);
    const qualityResults = this.computeQualityResults(projectId);
    const qcSummary = this.buildQualityControlSummaryData(projectId);
    const evidence = this.cornerEvidenceService.serializeEvidenceForProject(
      projectId
    );
    const research = this.researchDocumentService.serializeProject(projectId);
    const traverseReports = (qualityResults.traverses || []).map((t) => ({
      id: t.id,
      name: t.name,
      linearMisclosure: t.linearMisclosure,
      misclosureRatio: this.formatRatio(t.linearMisclosure, t.totalLength),
      angularMisclosure: t.angularMisclosure,
      status: t.status,
      message: t.message,
    }));
    const levelReports = (qualityResults.levels || []).map((l) => ({
      id: l.id,
      name: l.name,
      misclosure: l.misclosure,
      allowed: l.allowed,
      status: l.status,
      message: l.message,
    }));
    const recordList = Object.values(project.records || {}).map((record) =>
      typeof record.toObject === "function" ? record.toObject() : record
    );
    const equipmentLogs = (project.equipmentLogs || []).map((log) =>
      typeof log.toObject === "function" ? log.toObject() : log
    );
    const stakeoutEntries = (project.stakeoutEntries || []).map((entry) =>
      typeof entry.toObject === "function" ? entry.toObject() : entry
    );
    const levelRuns = (project.levelRuns || []).map((run) =>
      typeof run.toObject === "function" ? run.toObject() : run
    );

    return {
      type: "CarlsonDocumentSmartPack",
      version: 1,
      export: metadata,
      status: exportStatus,
      project: project.toObject(),
      records: recordList,
      traverses: traverseReports,
      levels: levelReports,
      equipmentLogs,
      stakeoutEntries,
      levelRuns,
      evidence,
      research,
      qcSummary,
    };
  }

  buildSmartPackHtml(bundle) {
    const label = this.getExportStatusLabel(bundle?.status || "Draft");
    const traverseRows = (bundle.traverses || [])
      .map(
        (t) => `
      <tr>
        <td>${this.escapeHtml(t.name)}</td>
        <td>${this.escapeHtml(this.formatLevelNumber(t.linearMisclosure))}</td>
        <td>${this.escapeHtml(t.misclosureRatio || "—")}</td>
        <td>${this.escapeHtml(this.formatDegrees(t.angularMisclosure))}</td>
        <td>${this.escapeHtml(t.message)}</td>
      </tr>`
      )
      .join("");
    const levelRows = (bundle.levels || [])
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
    const evidenceList = (bundle.evidence || [])
      .map(
        (ev, idx) => `
        <li>
          <strong>${idx + 1}. ${this.escapeHtml(
          ev.title || ev.pointLabel || "Evidence"
        )}</strong> — ${this.escapeHtml(ev.status || "Draft")}
          <div class="muted">${this.escapeHtml(
            this.buildEvidenceTrs(ev) || ev.trs || "TRS not set"
          )}</div>
          ${buildAnnotatedPhotoHtml({
            photo: ev.photo,
            annotations: ev.photoAnnotations,
            metadata: ev.photoMetadata,
            maxWidth: "520px",
          })}
        </li>`
      )
      .join("");
    const equipmentList = (bundle.equipmentLogs || [])
      .map(
        (log) => `
        <li><strong>${this.escapeHtml(log.equipmentUsed?.join(", ") || "Equipment")}</strong>
        <div class="muted">Setup: ${this.escapeHtml(log.setupAt || "")}</div>
        <div class="muted">Base height: ${this.escapeHtml(
          log.baseHeight || ""
        )}</div></li>`
      )
      .join("");
    const stakeoutList = (bundle.stakeoutEntries || [])
      .map(
        (entry) => `
        <li><strong>${this.escapeHtml(entry.monumentType || "Stakeout")}</strong>
        <div class="muted">${this.escapeHtml(entry.occurredAt || "")}</div>
        <div class="muted">Crew: ${this.escapeHtml(
          (entry.crewMembers || []).join(", ") || "Unspecified"
        )}</div></li>`
      )
      .join("");
    const researchList = (bundle.research || [])
      .map(
        (doc) => `
        <li><strong>${this.escapeHtml(doc.type || "Document")}</strong> — ${this.escapeHtml(
          doc.status || "Draft"
        )}
        <div class="muted">${this.escapeHtml(doc.jurisdiction || "")}${
          doc.instrument ? ` • ${this.escapeHtml(doc.instrument)}` : ""
        }</div></li>`
      )
      .join("");

    return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Document Generation Smart Pack</title>
        <style>
          body { font-family: "Segoe UI", Tahoma, sans-serif; color: #0f172a; margin: 28px; line-height: 1.6; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          h2 { margin: 20px 0 8px; font-size: 17px; }
          h3 { margin: 12px 0 6px; font-size: 15px; }
          .chip { display: inline-block; padding: 6px 12px; border-radius: 14px; background: #eef2ff; color: #312e81; font-weight: 700; font-size: 12px; }
          .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px 14px; margin-top: 10px; }
          .meta div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
          .section { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          ul { margin: 8px 0 0; padding-left: 18px; }
          .muted { color: #475569; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Document Generation Smart Pack</h1>
        <div class="chip">${this.escapeHtml(label.title || "Draft")}</div>
        ${
          label.note
            ? `<div class="muted">${this.escapeHtml(label.note)}</div>`
            : ""
        }
        <div class="meta">
          <div><strong>Project</strong><br />${this.escapeHtml(
            bundle.project?.name || "Project"
          )}</div>
          <div><strong>Generated</strong><br />${this.escapeHtml(
            bundle.export?.generatedAt
              ? new Date(bundle.export.generatedAt).toLocaleString()
              : new Date().toLocaleString()
          )}</div>
          <div><strong>QC status</strong><br />${this.escapeHtml(
            bundle.qcSummary?.results?.overallLabel || "Not evaluated"
          )}</div>
        </div>

        <div class="section">
          <h2>Traverse closure reports</h2>
          <table>
            <thead><tr><th>Traverse</th><th>Linear</th><th>Ratio</th><th>Angular</th><th>Status</th></tr></thead>
            <tbody>
              ${
                traverseRows ||
                '<tr><td colspan="5">No traverses available.</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Level loop summaries</h2>
          <table>
            <thead><tr><th>Level run</th><th>Misclosure</th><th>Allowed</th><th>Status</th></tr></thead>
            <tbody>
              ${levelRows || '<tr><td colspan="4">No level runs recorded.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Evidence sheets</h2>
          ${
            evidenceList
              ? `<ul>${evidenceList}</ul>`
              : '<p class="muted">No evidence captured yet.</p>'
          }
        </div>

        <div class="section">
          <h2>Equipment setups</h2>
          ${
            equipmentList
              ? `<ul>${equipmentList}</ul>`
              : '<p class="muted">No equipment logs recorded.</p>'
          }
        </div>

        <div class="section">
          <h2>Stakeout / Field notes</h2>
          ${
            stakeoutList
              ? `<ul>${stakeoutList}</ul>`
              : '<p class="muted">No stakeout entries linked.</p>'
          }
        </div>

        <div class="section">
          <h2>Research references</h2>
          ${
            researchList
              ? `<ul>${researchList}</ul>`
              : '<p class="muted">No research documents linked.</p>'
          }
        </div>

      </body>
    </html>`;
  }

  exportSmartPackHtml() {
    const bundle = this.buildSmartPackBundle();
    if (!bundle) return;
    const html = this.buildSmartPackHtml(bundle);
    const fileBase = (bundle.project?.name || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") || "project";
    this.downloadHtml(html, `${fileBase}-smart-pack.html`);
    this.renderSmartPackStatus(bundle.status);
  }

  exportSmartPackJson() {
    const bundle = this.buildSmartPackBundle();
    if (!bundle) return;
    const fileBase = (bundle.project?.name || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") || "project";
    this.downloadJson(bundle, `${fileBase}-smart-pack.json`);
    this.renderSmartPackStatus(bundle.status);
  }

  downloadJson(payload, filename) {
    const seen = new WeakSet();
    const json = JSON.stringify(
      payload,
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return undefined;
          seen.add(value);
        }
        return value;
      },
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    this.downloadBlob(blob, filename);
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadText(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadHtml(content, filename) {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  triggerImport() {
    if (this.elements.importFileInput) {
      this.elements.importFileInput.value = "";
      this.elements.importFileInput.click();
    }
  }

  exportAllData() {
    const payload = {
      type: "CarlsonSurveyManagerData",
      version: 3,
      export: this.buildExportMetadata("Draft"),
      projects: this.serializeProjects(),
      evidence: this.cornerEvidenceService.serializeAllEvidence(),
      research: this.researchDocumentService.serializeAll(),
      globalSettings: this.globalSettings,
      qcSummaries: this.buildAllQualityControlSummaries(),
    };
    this.downloadJson(payload, "carlson-app-data.json");
    this.recordRollingBackups(Object.keys(this.projects || {}), payload);
    this.markProjectsExported(Object.keys(this.projects || {}));
  }

  markProjectsExported(projectIds = [], timestamp = new Date().toISOString()) {
    if (!projectIds?.length) return;
    let changed = false;
    projectIds.forEach((projectId) => {
      if (projectId && this.projects?.[projectId]) {
        this.projects[projectId].lastExportedAt = timestamp;
        changed = true;
      }
    });
    if (changed) {
      this.saveProjects({ skipVersionUpdate: true });
      this.updateSpringboardHero();
    }
  }

  triggerAllDataImport() {
    if (this.elements.importAllDataInput) {
      this.elements.importAllDataInput.value = "";
      this.elements.importAllDataInput.click();
    }
  }

  handleAllDataImport(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.projects || typeof data.projects !== "object") {
          throw new Error("Invalid import file");
        }
        Object.entries(data.projects).forEach(([id, proj]) => {
          this.projects[id] = Project.fromObject(proj);
        });
        const evidenceMap =
          data.evidence && typeof data.evidence === "object"
            ? data.evidence
            : {};
        this.cornerEvidenceService.replaceAllEvidence(evidenceMap);
        const researchMap =
          data.research && typeof data.research === "object"
            ? data.research
            : {};
        this.researchDocumentService.replaceAllDocuments(researchMap);
        if (data.globalSettings) {
          this.globalSettings = this.normalizeGlobalSettings(
            data.globalSettings
          );
          this.ensureGlobalSettingsMetadata();
          this.globalSettingsService.save(this.globalSettings);
          this.renderGlobalSettings();
          this.scheduleSync();
        }
        this.saveProjects();
        this.updateProjectList();
        const importedIds = Object.keys(data.projects);
        if (importedIds.length > 0) {
          this.loadProject(importedIds[0]);
        }
        this.renderGlobalSettings();
        alert("App data import successful!");
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  handleImportFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.projects || typeof data.projects !== "object") {
          throw new Error("Invalid import file");
        }
        Object.entries(data.projects).forEach(([id, proj]) => {
          this.projects[id] = Project.fromObject(proj);
        });
        const evidenceMap =
          data.evidence && typeof data.evidence === "object"
            ? data.evidence
            : {};
        this.cornerEvidenceService.replaceAllEvidence(evidenceMap);
        const researchMap =
          data.research && typeof data.research === "object"
            ? data.research
            : {};
        this.researchDocumentService.replaceAllDocuments(researchMap);
        this.saveProjects();
        this.updateProjectList();
        if (Object.keys(data.projects).length > 0) {
          const firstId = Object.keys(data.projects)[0];
          this.loadProject(firstId);
        }
        alert("Import successful!");
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  getCurrentProject() {
    return this.currentProjectId ? this.projects[this.currentProjectId] : null;
  }

  async createAuditSnapshot() {
    const project = this.getCurrentProject();
    if (!project) {
      this.setAuditStatus("Select or create a project first.");
      return;
    }

    const user = this.getCurrentDeviceProfile?.()?.teamMember || null;
    const qualityResults = this.computeQualityResults?.(project.id) || {};
    const snapshot = await this.auditTrailService.createSnapshot(
      {
        project,
        evidence: this.cornerEvidenceService.serializeAllEvidence(),
        research: this.researchDocumentService.serializeAll(),
        globalSettings: this.globalSettings,
        exportMetadata: this.buildExportMetadata("Audit"),
        qcSummary: this.buildQualityControlSummaryData(),
        qcLevels: qualityResults.levels || [],
      },
      {
        deviceId: this.deviceId,
        user,
      }
    );

    project.auditTrail = project.auditTrail || [];
    project.auditTrail.push(snapshot);
    this.saveProjects();
    this.renderAuditTrail(project);
    this.setAuditStatus("Audit snapshot captured and hashed.");
  }

  renderAuditTrail(project = this.getCurrentProject()) {
    const list = this.elements.auditEntriesList;
    const latestTs = this.elements.latestAuditTimestamp;
    const latestMeta = this.elements.latestAuditMeta;

    if (!list || !latestTs || !latestMeta) return;

    list.innerHTML = "";
    latestTs.textContent = "None";
    latestMeta.textContent = "";

    if (!project || !project.auditTrail?.length) {
      list.textContent = "No snapshots yet.";
      return;
    }

    const sorted = project.auditTrail
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const latest = sorted[0];
    latestTs.textContent = new Date(latest.timestamp).toLocaleString();
    latestMeta.textContent =
      (latest.user ? `${latest.user} • ` : "") +
      (latest.deviceId || "Unknown device");

    sorted.slice(0, 5).forEach((entry) => {
      const row = document.createElement("div");
      row.className = "audit-entry-row";
      const when = new Date(entry.timestamp).toLocaleString();
      const who = entry.user || entry.deviceId || "Unassigned";
      row.innerHTML = `<strong>${when}</strong><span>${who}</span><code>${entry.hash}</code>`;
      list.appendChild(row);
    });
  }

  downloadLatestAudit() {
    const project = this.getCurrentProject();
    if (!project || !project.auditTrail?.length) {
      this.setAuditStatus("No audit snapshots to download yet.");
      return;
    }

    const latest = project.auditTrail
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    const payload = {
      bundle: latest.bundle,
      hash: latest.hash,
      timestamp: latest.timestamp,
      deviceId: latest.deviceId,
      user: latest.user,
    };
    const filename = `${project.name || "project"}-audit-${
      latest.timestamp
    }.json`;
    this.downloadJson(payload, filename);
    this.setAuditStatus("Downloaded latest audit bundle.");
  }

  triggerAuditVerification() {
    if (this.elements.auditFileInput) {
      this.elements.auditFileInput.value = "";
      this.elements.auditFileInput.click();
    }
  }

  async handleAuditVerificationFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.bundle || !data.hash) {
          throw new Error("Invalid audit bundle file");
        }
        const valid = await this.auditTrailService.verifySnapshot(
          data.bundle,
          data.hash
        );
        this.setAuditStatus(valid
          ? "Audit bundle verification PASSED."
          : "Audit bundle verification FAILED.");
      } catch (err) {
        this.setAuditStatus(`Verification failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  setAuditStatus(message) {
    if (this.elements.auditStatus) {
      this.elements.auditStatus.textContent = message;
    }
  }
  };

export default ExportImportMixin;
import { buildAnnotatedPhotoHtml } from "../../services/PhotoAnnotationRenderer.js";
