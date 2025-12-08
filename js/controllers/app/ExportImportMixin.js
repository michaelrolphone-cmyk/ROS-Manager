const ExportImportMixin = (Base) =>
  class extends Base {
  /* ===================== Export / Import ===================== */
  buildExportMetadata(status = "Draft") {
    const label = this.getExportStatusLabel(status);
    return {
      generatedAt: new Date().toISOString(),
      status: label.title,
      note: label.note,
    };
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
    this.markProjectsExported(Object.keys(this.projects || {}));
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
    const snapshot = await this.auditTrailService.createSnapshot(
      {
        project,
        evidence: this.cornerEvidenceService.serializeAllEvidence(),
        research: this.researchDocumentService.serializeAll(),
        globalSettings: this.globalSettings,
        exportMetadata: this.buildExportMetadata("Audit"),
        qcSummary: this.buildQualityControlSummaryData(),
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
