import ProjectRepository from "../services/ProjectRepository.js";
import Project from "../models/Project.js";
import SurveyRecord from "../models/SurveyRecord.js";
import TraverseInstruction from "../models/TraverseInstruction.js";
import CornerEvidence from "../models/CornerEvidence.js";
import EvidenceTie from "../models/EvidenceTie.js";
import CornerEvidenceService from "../services/CornerEvidenceService.js";
import EquipmentLog from "../models/EquipmentLog.js";
import PointController from "./PointController.js";
import NavigationController from "./NavigationController.js";

export default class AppController {
  constructor() {
    this.STORAGE_KEY = "carlsonSurveyProjects";
    this.repository = new ProjectRepository(this.STORAGE_KEY);
    this.projects = this.repository.loadProjects();
    this.currentProjectId = null;
    this.currentRecordId = null;
    this.commandTexts = {
      createPoint: "",
      occupyPoint: "",
      drawPoints: "",
      drawLines: "",
    };
    this.cornerEvidenceService = new CornerEvidenceService();
    this.currentEvidencePhoto = null;
    this.currentEvidenceLocation = null;
    this.currentEvidenceTies = [];
    this.currentTraversePointOptions = [];
    this.currentEquipmentLocation = null;

    this.cacheDom();
    this.appLaunchers = document.querySelectorAll(".app-tile");
    this.pointController = new PointController({
      elements: {
        pointImportButton: this.elements.pointImportButton,
        pointsFileInput: this.elements.pointsFileInput,
        pointsTableBody: this.elements.pointsTableBody,
        addPointRowButton: this.elements.addPointRowButton,
        pointFileSelect: this.elements.pointFileSelect,
        newPointFileButton: this.elements.newPointFileButton,
        downloadPointsButton: this.elements.downloadPointsButton,
      },
      getCurrentProject: () =>
        this.currentProjectId ? this.projects[this.currentProjectId] : null,
      saveProjects: () => this.saveProjects(),
    });
    this.navigationController = new NavigationController({
      elements: {
        compassCanvas: this.elements.navigationCompass,
        headingLabel: this.elements.navigationHeadingValue,
        targetBearingLabel: this.elements.navigationTargetBearing,
        targetDistanceLabel: this.elements.navigationTargetDistance,
        offsetLabel: this.elements.navigationOffset,
        statusLabel: this.elements.navigationStatus,
        bookmarkName: this.elements.navigationBookmarkName,
        saveBookmarkButton: this.elements.saveNavigationBookmark,
        bookmarkStatus: this.elements.navigationBookmarkStatus,
        targetSelect: this.elements.navigationTargetSelect,
        equipmentSelect: this.elements.navigationEquipmentSelect,
        bookmarksList: this.elements.navigationBookmarksList,
        refreshButton: this.elements.refreshNavigation,
        clearTargetButton: this.elements.clearNavigationTarget,
      },
      getCurrentProject: () =>
        this.currentProjectId ? this.projects[this.currentProjectId] : null,
      saveProjects: () => this.saveProjects(),
      getEquipmentLogs: () =>
        this.currentProjectId
          ? this.projects[this.currentProjectId]?.equipmentLogs || []
          : [],
    });
    this.bindStaticEvents();
    this.initialize();
  }

  cacheDom() {
    this.elements = {
      projectSelect: document.getElementById("projectSelect"),
      projectDropdownContainer: document.getElementById(
        "projectDropdownContainer"
      ),
      projectDropdownToggle: document.getElementById("projectDropdownToggle"),
      projectDropdownMenu: document.getElementById("projectDropdownMenu"),
      projectDropdownLabel: document.getElementById("projectDropdownLabel"),
      projectActionsContainer: document.getElementById(
        "projectActionsContainer"
      ),
      projectActionsToggle: document.getElementById("projectActionsToggle"),
      projectActionsMenu: document.getElementById("projectActionsMenu"),
      homeButton: document.getElementById("homeButton"),
      projectControls: document.getElementById("projectControls"),
      projectNameInput: document.getElementById("projectNameInput"),
      currentProjectName: document.getElementById("currentProjectName"),
      recordNameInput: document.getElementById("recordNameInput"),
      recordList: document.getElementById("recordList"),
      editor: document.getElementById("editor"),
      currentRecordName: document.getElementById("currentRecordName"),
      startPtNum: document.getElementById("startPtNum"),
      northing: document.getElementById("northing"),
      easting: document.getElementById("easting"),
      elevation: document.getElementById("elevation"),
      bsAzimuth: document.getElementById("bsAzimuth"),
      basis: document.getElementById("basis"),
      firstDist: document.getElementById("firstDist"),
      callsTableBody: document.querySelector("#callsTable tbody"),
      traverseCanvas: document.getElementById("traverseCanvas"),
      projectOverviewCanvas: document.getElementById("projectOverviewCanvas"),
      importFileInput: document.getElementById("importFileInput"),
      pointImportButton: document.getElementById("pointImportButton"),
      pointsFileInput: document.getElementById("pointsFileInput"),
      pointsTableBody: document.querySelector("#pointsTable tbody"),
      addPointRowButton: document.getElementById("addPointRowButton"),
      pointFileSelect: document.getElementById("pointFileSelect"),
      newPointFileButton: document.getElementById("newPointFileButton"),
      downloadPointsButton: document.getElementById("downloadPointsButton"),
      startFromDropdownContainer: document.getElementById(
        "startFromDropdownContainer"
      ),
      startFromDropdownToggle: document.getElementById(
        "startFromDropdownToggle"
      ),
      startFromDropdownMenu: document.getElementById("startFromDropdownMenu"),
      startFromDropdownLabel: document.getElementById("startFromDropdownLabel"),
      addCallButton: document.getElementById("addCallButton"),
      generateCommandsButton: document.getElementById("generateCommandsButton"),
      deleteRecordButton: document.getElementById("deleteRecordButton"),
      cancelProjectButton: document.getElementById("cancelProjectButton"),
      traverseTabButton: document.getElementById("traverseTabButton"),
      pointsTabButton: document.getElementById("pointsTabButton"),
      evidenceTabButton: document.getElementById("evidenceTabButton"),
      equipmentTabButton: document.getElementById("equipmentTabButton"),
      springboardSection: document.getElementById("springboardSection"),
      springboardGrid: document.querySelector(".springboard-grid"),
      navigationSection: document.getElementById("navigationSection"),
      traverseSection: document.getElementById("traverseSection"),
      pointsSection: document.getElementById("pointsSection"),
      evidenceSection: document.getElementById("evidenceSection"),
      equipmentSection: document.getElementById("equipmentSection"),
      evidenceRecordDropdownContainer: document.getElementById(
        "evidenceRecordDropdownContainer"
      ),
      evidenceRecordDropdownToggle: document.getElementById(
        "evidenceRecordDropdownToggle"
      ),
      evidenceRecordDropdownMenu: document.getElementById(
        "evidenceRecordDropdownMenu"
      ),
      evidenceRecordDropdownLabel: document.getElementById(
        "evidenceRecordDropdownLabel"
      ),
      evidenceRecordSelect: document.getElementById("evidenceRecordSelect"),
      evidencePointSelect: document.getElementById("evidencePointSelect"),
      evidenceType: document.getElementById("evidenceType"),
      evidenceCondition: document.getElementById("evidenceCondition"),
      evidenceNotes: document.getElementById("evidenceNotes"),
      evidenceTieDistance: document.getElementById("evidenceTieDistance"),
      evidenceTieBearing: document.getElementById("evidenceTieBearing"),
      evidenceTieDescription: document.getElementById("evidenceTieDescription"),
      evidenceTiePhotos: document.getElementById("evidenceTiePhotos"),
      addEvidenceTie: document.getElementById("addEvidenceTie"),
      evidenceTiesList: document.getElementById("evidenceTiesList"),
      evidenceTiesHint: document.getElementById("evidenceTiesHint"),
      evidencePhoto: document.getElementById("evidencePhoto"),
      evidenceLocationStatus: document.getElementById("evidenceLocationStatus"),
      captureLocation: document.getElementById("captureLocation"),
      saveEvidenceButton: document.getElementById("saveEvidenceButton"),
      resetEvidenceButton: document.getElementById("resetEvidenceButton"),
      evidenceList: document.getElementById("evidenceList"),
      evidenceSummary: document.getElementById("evidenceSummary"),
      equipmentSetupAt: document.getElementById("equipmentSetupAt"),
      equipmentTearDownAt: document.getElementById("equipmentTearDownAt"),
      equipmentBaseHeight: document.getElementById("equipmentBaseHeight"),
      equipmentReferencePoint: document.getElementById("equipmentReferencePoint"),
      equipmentSetupBy: document.getElementById("equipmentSetupBy"),
      captureEquipmentLocation: document.getElementById(
        "captureEquipmentLocation"
      ),
      equipmentLocationStatus: document.getElementById(
        "equipmentLocationStatus"
      ),
      saveEquipmentButton: document.getElementById("saveEquipmentButton"),
      resetEquipmentButton: document.getElementById("resetEquipmentButton"),
      equipmentList: document.getElementById("equipmentList"),
      equipmentSummary: document.getElementById("equipmentSummary"),
      navigationCompass: document.getElementById("navigationCompass"),
      navigationHeadingValue: document.getElementById("navigationHeadingValue"),
      navigationTargetBearing: document.getElementById("navigationTargetBearing"),
      navigationTargetDistance: document.getElementById("navigationTargetDistance"),
      navigationOffset: document.getElementById("navigationOffset"),
      navigationStatus: document.getElementById("navigationStatus"),
      navigationBookmarkName: document.getElementById("navigationBookmarkName"),
      saveNavigationBookmark: document.getElementById("saveNavigationBookmark"),
      navigationBookmarkStatus: document.getElementById("navigationBookmarkStatus"),
      navigationTargetSelect: document.getElementById("navigationTargetSelect"),
      navigationEquipmentSelect: document.getElementById("navigationEquipmentSelect"),
      navigationBookmarksList: document.getElementById("navigationBookmarksList"),
      refreshNavigation: document.getElementById("refreshNavigation"),
      clearNavigationTarget: document.getElementById("clearNavigationTarget"),
    };
  }

  bindStaticEvents() {
    document
      .getElementById("newProjectButton")
      ?.addEventListener("click", () => this.newProject());
    document
      .getElementById("createProjectButton")
      ?.addEventListener("click", () => this.createProject());
    document
      .getElementById("deleteProjectButton")
      ?.addEventListener("click", () => this.deleteCurrentProject());
    document
      .getElementById("exportCurrentButton")
      ?.addEventListener("click", () => this.exportCurrentProject());
    document
      .getElementById("exportAllButton")
      ?.addEventListener("click", () => this.exportAllProjects());
    document
      .getElementById("importButton")
      ?.addEventListener("click", () => this.triggerImport());
    document
      .getElementById("createRecordButton")
      ?.addEventListener("click", () => this.createRecord());

    this.elements.projectDropdownToggle?.addEventListener("click", () =>
      this.toggleProjectDropdown()
    );

    this.elements.evidenceRecordDropdownToggle?.addEventListener(
      "click",
      () => this.toggleEvidenceRecordDropdown()
    );

    this.elements.projectActionsToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleProjectActionsMenu();
    });

    this.elements.homeButton?.addEventListener("click", () =>
      this.switchTab("springboardSection")
    );

    this.appLaunchers?.forEach((launcher) => {
      launcher.addEventListener("click", () =>
        this.switchTab(launcher.dataset.target)
      );
    });

    this.elements.springboardGrid?.addEventListener("click", (evt) => {
      const launcher = evt.target.closest(".app-tile");
      if (!launcher) return;
      const target = launcher.dataset.target;
      if (target) {
        evt.preventDefault();
        this.switchTab(target);
      }
    });

    document.addEventListener("click", (e) => {
      if (!this.elements.projectActionsContainer?.contains(e.target)) {
        this.closeProjectActionsMenu();
      }
      if (!this.elements.evidenceRecordDropdownContainer?.contains(e.target)) {
        this.closeEvidenceRecordDropdown();
      }
    });

    this.elements.projectActionsMenu?.addEventListener("click", () =>
      this.closeProjectActionsMenu()
    );

    this.elements.projectSelect?.addEventListener("change", (e) =>
      this.loadProject(e.target.value)
    );

    this.elements.startFromDropdownToggle?.addEventListener("click", () =>
      this.toggleStartFromDropdown()
    );

    if (this.elements.importFileInput) {
      this.elements.importFileInput.addEventListener("change", (e) =>
        this.handleImportFile(e.target)
      );
    }

    this.elements.recordNameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.createRecord();
      }
    });

    this.elements.projectNameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.createProject();
      }
    });

    [
      this.elements.startPtNum,
      this.elements.northing,
      this.elements.easting,
      this.elements.elevation,
      this.elements.bsAzimuth,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.saveCurrentRecord());
    });

    [this.elements.basis, this.elements.firstDist].forEach((el) => {
      el?.addEventListener("input", () => {
        this.saveCurrentRecord();
        this.generateCommands();
      });
    });

    this.elements.addCallButton?.addEventListener("click", () =>
      this.addCallRow()
    );

    this.elements.generateCommandsButton?.addEventListener("click", () =>
      this.generateCommands()
    );

    this.elements.deleteRecordButton?.addEventListener("click", () =>
      this.deleteCurrentRecord()
    );

    this.elements.cancelProjectButton?.addEventListener("click", () =>
      this.hideProjectForm()
    );

    const commandGrid = document.querySelector(".command-grid");
    commandGrid?.addEventListener("click", (evt) => this.handleCommandGrid(evt));

    window.addEventListener("resize", () => this.handleResize());

    this.elements.traverseTabButton?.addEventListener("click", () =>
      this.switchTab("traverseSection")
    );
    this.elements.pointsTabButton?.addEventListener("click", () =>
      this.switchTab("pointsSection")
    );
    this.elements.evidenceTabButton?.addEventListener("click", () =>
      this.switchTab("evidenceSection")
    );
    this.elements.equipmentTabButton?.addEventListener("click", () =>
      this.switchTab("equipmentSection")
    );

    this.elements.evidenceRecordSelect?.addEventListener("change", () => {
      this.handleEvidenceRecordChange();
    });

    this.elements.evidencePointSelect?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );

    this.elements.addEvidenceTie?.addEventListener("click", () =>
      this.addEvidenceTie()
    );

    this.elements.evidencePhoto?.addEventListener("change", (e) =>
      this.handleEvidencePhoto(e.target.files?.[0] || null)
    );

    this.elements.captureLocation?.addEventListener("click", () =>
      this.captureEvidenceLocation()
    );

    this.elements.captureEquipmentLocation?.addEventListener("click", () =>
      this.captureEquipmentLocation()
    );

    this.elements.saveEvidenceButton?.addEventListener("click", () =>
      this.saveEvidenceEntry()
    );

    this.elements.resetEvidenceButton?.addEventListener("click", () =>
      this.resetEvidenceForm()
    );

    this.elements.evidenceType?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );
    this.elements.evidenceCondition?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );

    [
      this.elements.equipmentSetupAt,
      this.elements.equipmentTearDownAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentSetupBy,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateEquipmentSaveState());
    });

    this.elements.saveEquipmentButton?.addEventListener("click", () =>
      this.saveEquipmentEntry()
    );

    this.elements.resetEquipmentButton?.addEventListener("click", () =>
      this.resetEquipmentForm()
    );
  }

  initialize() {
    this.updateProjectList();
    const projectIds = Object.keys(this.projects);
    if (projectIds.length > 0) {
      this.loadProject(projectIds[0]);
    } else {
      this.drawProjectOverview();
      this.pointController.renderPointsTable();
    }
    this.refreshEvidenceUI();
    this.renderEvidenceTies();
    this.refreshEquipmentUI();
    this.switchTab("springboardSection");
  }

  saveProjects() {
    this.repository.saveProjects(this.projects);
  }

  /* ===================== Export / Import ===================== */
  exportCurrentProject() {
    if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
      alert("No current project to export.");
      return;
    }
    const proj = this.projects[this.currentProjectId];
    const evidence = this.cornerEvidenceService.serializeEvidenceForProject(
      this.currentProjectId
    );
    const payload = {
      type: "CarlsonSurveyManagerProjects",
      version: 2,
      projects: {
        [this.currentProjectId]: proj.toObject(),
      },
      evidence: {
        [this.currentProjectId]: evidence,
      },
    };
    this.downloadJson(
      payload,
      `carlson-${(proj.name || "project").replace(/[^\w\-]+/g, "_")}.json`
    );
  }

  exportAllProjects() {
    if (!this.projects || Object.keys(this.projects).length === 0) {
      alert("No projects to export.");
      return;
    }
    const payload = {
      type: "CarlsonSurveyManagerProjects",
      version: 2,
      projects: this.serializeProjects(),
      evidence: this.cornerEvidenceService.serializeAllEvidence(),
    };
    this.downloadJson(payload, "carlson-all-projects.json");
  }

  downloadJson(payload, filename) {
    const json = JSON.stringify(payload, null, 2);
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

  triggerImport() {
    if (this.elements.importFileInput) {
      this.elements.importFileInput.value = "";
      this.elements.importFileInput.click();
    }
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

  /* ===================== Projects & Records ===================== */
  loadProject(id) {
    if (!id || !this.projects[id]) {
      this.currentProjectId = null;
      this.currentRecordId = null;
      this.elements.currentProjectName.textContent = "No project selected";
      this.elements.editor.style.display = "none";
      this.renderRecordList();
      this.updateProjectList();
      this.drawProjectOverview();
      this.hideProjectForm();
      this.refreshEvidenceUI();
      this.resetEquipmentForm();
      this.refreshEquipmentUI();
      this.pointController.renderPointsTable();
      this.refreshEvidenceUI();
      this.navigationController?.onProjectChanged();
      return;
    }

    this.currentProjectId = id;
    this.currentRecordId = null;
    this.elements.currentProjectName.textContent = this.projects[id].name;
    this.elements.editor.style.display = "none";
    this.renderRecordList();
    this.updateProjectList();
    this.drawProjectOverview();
    this.hideProjectForm();
    this.pointController.renderPointsTable();
    this.refreshEvidenceUI();
    this.resetEquipmentForm();
    this.refreshEquipmentUI();
    this.navigationController?.onProjectChanged();
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

  deleteCurrentProject() {
    if (!this.currentProjectId || !confirm("Delete entire project and all records?"))
      return;
    delete this.projects[this.currentProjectId];
    this.cornerEvidenceService.removeProjectEvidence(this.currentProjectId);
    this.saveProjects();
    this.currentProjectId = null;
    this.currentRecordId = null;
    this.elements.currentProjectName.textContent = "No project selected";
    this.elements.editor.style.display = "none";
    this.renderRecordList();
    this.updateProjectList();
    this.drawProjectOverview();
    this.pointController.renderPointsTable();
  }

  renderRecordList() {
    const container = this.elements.recordList;
    if (!this.currentProjectId || !this.projects[this.currentProjectId]) {
      container.innerHTML = "<p>Select or create a project first.</p>";
      return;
    }
    const records = this.projects[this.currentProjectId].records || {};
    if (Object.keys(records).length === 0) {
      container.innerHTML = "<p>No records yet. Create one above.</p>";
      this.drawProjectOverview();
      return;
    }
    container.innerHTML = "";
    Object.keys(records).forEach((id) => {
      const record = records[id];
      const div = document.createElement("div");
      div.className = "record-item";
      if (id === this.currentRecordId) div.classList.add("active");

      const titleSpan = document.createElement("span");
      titleSpan.className = "record-title";
      titleSpan.textContent = record.name;

      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "record-canvas";
      const miniCanvas = document.createElement("canvas");
      miniCanvas.width = 80;
      miniCanvas.height = 80;
      canvasWrapper.appendChild(miniCanvas);

      div.appendChild(titleSpan);
      div.appendChild(canvasWrapper);

      div.addEventListener("click", () => this.loadRecord(id));
      container.appendChild(div);

      try {
        const pts = this.computeTraversePointsForRecord(
          this.currentProjectId,
          id
        );
        this.drawTraversePreview(miniCanvas, pts);
      } catch (e) {
        // ignore icon errors
      }
    });

    this.drawProjectOverview();
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

  createRecord() {
    if (!this.currentProjectId || !this.projects[this.currentProjectId])
      return alert("Select a project first");
    const name = (this.elements.recordNameInput?.value || "").trim();
    if (!name) return alert("Enter a record name");
    const id = Date.now().toString();
    const newRecord = new SurveyRecord({
      name,
      calls: [],
      startFromRecordId: null,
    });
    this.projects[this.currentProjectId].records[id] = newRecord;
    if (this.elements.recordNameInput) this.elements.recordNameInput.value = "";
    this.saveProjects();
    this.loadRecord(id);
    this.renderRecordList();
    this.updateProjectList();
  }

  loadRecord(id) {
    this.currentRecordId = id;
    const record = this.projects[this.currentProjectId].records[id];
    this.elements.currentRecordName.textContent = record.name;
    this.elements.startPtNum.value = record.startPtNum || "1";
    this.elements.northing.value = record.northing || "5000";
    this.elements.easting.value = record.easting || "5000";
    this.elements.elevation.value = record.elevation || "0";
    this.elements.bsAzimuth.value = record.bsAzimuth || "0.0000";
    this.elements.basis.value = record.basis || "";
    this.elements.firstDist.value = record.firstDist || "";
    this.elements.editor.style.display = "block";

    const tbody = this.elements.callsTableBody;
    tbody.innerHTML = "";
    (record.calls || []).forEach((call, i) =>
      this.addCallRow(call.bearing, call.distance, i + 2)
    );

    this.updateStartFromDropdownUI();
    this.updateAllBearingArrows();
    this.renderRecordList();
    this.generateCommands();
    this.refreshEvidenceUI(record.id);
  }

  /* ===================== Evidence Logger ===================== */
  switchTab(targetId) {
    const sections = [
      this.elements.springboardSection,
      this.elements.traverseSection,
      this.elements.pointsSection,
      this.elements.evidenceSection,
      this.elements.equipmentSection,
      this.elements.navigationSection,
    ];
    const validSection = sections.find((sec) => sec?.id === targetId);
    const resolvedTarget = validSection ? targetId : "springboardSection";
    const buttons = [
      this.elements.traverseTabButton,
      this.elements.pointsTabButton,
      this.elements.evidenceTabButton,
      this.elements.equipmentTabButton,
    ];

    sections.forEach((sec) => {
      if (!sec) return;
      const isTarget = sec.id === resolvedTarget;
      sec.classList.toggle("active", isTarget);
      sec.style.display = isTarget ? "block" : "none";
    });

    buttons.forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle("active", btn.dataset.target === resolvedTarget);
    });

    this.appLaunchers?.forEach((launcher) => {
      launcher.classList.toggle(
        "active",
        launcher.dataset.target === resolvedTarget
      );
    });

    if (this.elements.homeButton) {
      const showHome = resolvedTarget !== "springboardSection";
      this.elements.homeButton.classList.toggle("visible", showHome);
    }

    this.appLaunchers?.forEach((launcher) => {
      if (launcher.dataset.target === targetId)
        launcher.classList.add("active");
      else launcher.classList.remove("active");
    });

    if (this.elements.homeButton) {
      const showHome = targetId !== "springboardSection";
      this.elements.homeButton.classList.toggle("visible", showHome);
    }

    if (targetId === "evidenceSection") {

      this.refreshEvidenceUI();
    } else if (resolvedTarget === "equipmentSection") {
      this.refreshEquipmentUI();
    }
    if (resolvedTarget === "pointsSection") {
      this.pointController.renderPointsTable();
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

    const targetId =
      forceRecordId && records[forceRecordId]
        ? forceRecordId
        : this.currentRecordId && records[this.currentRecordId]
          ? this.currentRecordId
          : ids[0];

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

    if (options.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No traverse points yet";
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

  getTraversePointOptions(recordId) {
    if (!recordId || !this.currentProjectId) return [];
    const project = this.projects[this.currentProjectId];
    if (!project) return [];
    const record = project.records?.[recordId];
    if (!record) return [];
    const pts = this.computeTraversePointsForRecord(
      this.currentProjectId,
      recordId
    );
    const startNum = parseInt(record.startPtNum, 10);
    const base = Number.isFinite(startNum) ? startNum : 1;
    return (pts || []).map((p, idx) => ({
      index: idx,
      label: `P${base + idx} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`,
      coords: p,
    }));
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
    if (this.elements.evidenceTiePhotos) this.elements.evidenceTiePhotos.value = "";
    this.renderEvidenceTies();
  }

  renderEvidenceTies() {
    if (!this.elements.evidenceTiesList || !this.elements.evidenceTiesHint) return;
    const list = this.elements.evidenceTiesList;
    list.innerHTML = "";
    if (this.currentEvidenceTies.length === 0) {
      this.elements.evidenceTiesHint.textContent = "No ties added yet.";
      return;
    }
    this.elements.evidenceTiesHint.textContent = `${this.currentEvidenceTies.length} tie(s) added.`;
    this.currentEvidenceTies.forEach((tie, idx) => {
      const li = document.createElement("li");
      const parts = [tie.distance, tie.bearing, tie.description].filter(Boolean);
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
          this.elements.evidenceLocationStatus.textContent =
            `Lat ${pos.coords.latitude.toFixed(6)}, Lon ${pos.coords.longitude.toFixed(6)} (±${pos.coords.accuracy.toFixed(1)} m)`;
        }
        this.updateEvidenceSaveState();
      },
      () => {
        if (this.elements.evidenceLocationStatus) {
          this.elements.evidenceLocationStatus.textContent = "Unable to get location.";
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  updateEvidenceSaveState() {
    if (!this.elements.saveEvidenceButton) return;
    const recordId = this.elements.evidenceRecordSelect?.value || "";
    const pointVal = this.elements.evidencePointSelect?.value || "";
    const type = this.elements.evidenceType?.value || "";
    const condition = this.elements.evidenceCondition?.value || "";
    const canSave =
      !!this.currentProjectId &&
      !!recordId &&
      pointVal !== "" &&
      !!type &&
      !!condition;
    this.elements.saveEvidenceButton.disabled = !canSave;
  }

  saveEvidenceEntry() {
    const recordId = this.elements.evidenceRecordSelect?.value;
    const pointIndexStr = this.elements.evidencePointSelect?.value;
    if (!this.currentProjectId || !recordId || !pointIndexStr) return;

    const pointIndex = parseInt(pointIndexStr, 10);
    const pointMeta = this.currentTraversePointOptions.find(
      (p) => p.index === pointIndex
    );
    const record = this.projects[this.currentProjectId]?.records?.[recordId];
    const entry = new CornerEvidence({
      id: Date.now().toString(),
      projectId: this.currentProjectId,
      recordId,
      recordName: record?.name || "Record",
      pointIndex,
      pointLabel: pointMeta?.label || "Traverse point",
      coords: pointMeta?.coords || null,
      type: this.elements.evidenceType?.value || "",
      condition: this.elements.evidenceCondition?.value || "",
      notes: this.elements.evidenceNotes?.value.trim() || "",
      ties: this.currentEvidenceTies.map(
        (tie) =>
          tie instanceof EvidenceTie ? tie : new EvidenceTie({ ...tie })
      ),
      photo: this.currentEvidencePhoto || null,
      location: this.currentEvidenceLocation || null,
      createdAt: new Date().toISOString(),
    });

    this.cornerEvidenceService.addEntry(entry);
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

    if (!this.currentProjectId) {
      this.elements.evidenceSummary.textContent = "Select a project to view evidence.";
      return;
    }

    if (evidence.length === 0) {
      this.elements.evidenceSummary.textContent =
        "No evidence saved for this project yet.";
      return;
    }

    this.elements.evidenceSummary.textContent = `${evidence.length} point(s) documented.`;

    evidence
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((ev) => {
        const card = document.createElement("div");
        card.className = "card";
        const title = document.createElement("strong");
        title.textContent = ev.pointLabel || "Traverse point";
        const meta = document.createElement("div");
        meta.className = "subtitle";
        meta.style.marginTop = "4px";
        meta.textContent = `${ev.recordName || "Record"} · Saved ${new Date(
          ev.createdAt
        ).toLocaleString()}`;
        card.append(title, meta);

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
        if (ev.condition) {
          const condition = document.createElement("div");
          condition.textContent = `Condition: ${ev.condition}`;
          card.appendChild(condition);
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
          )}, Lon ${ev.location.lon.toFixed(6)} (±${ev.location.accuracy.toFixed(
            1
          )} m)`;
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
            const parts = [t.distance, t.bearing, t.description].filter(Boolean);
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
        exportBtn.addEventListener("click", () =>
          this.exportCornerFiling(ev)
        );
        actionsRow.appendChild(exportBtn);
        card.appendChild(actionsRow);
        container.appendChild(card);
      });
  }

  /* ===================== Equipment Setup ===================== */
  refreshEquipmentUI() {
    this.renderEquipmentList();
    this.updateEquipmentSaveState();
  }

  resetEquipmentForm() {
    [
      this.elements.equipmentSetupAt,
      this.elements.equipmentTearDownAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentSetupBy,
    ].forEach((el) => {
      if (el) el.value = "";
    });
    if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "";
    }
    this.currentEquipmentLocation = null;
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
      !!this.currentProjectId &&
      requiredFields.every((el) => el && el.value.trim().length > 0);
    this.elements.saveEquipmentButton.disabled = !canSave;
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
        };
        if (this.elements.equipmentLocationStatus) {
          this.elements.equipmentLocationStatus.textContent = `Lat ${pos.coords.latitude.toFixed(6)}, Lon ${pos.coords.longitude.toFixed(
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
    if (!this.currentProjectId || !this.projects[this.currentProjectId]) return;
    const project = this.projects[this.currentProjectId];
    const entry = new EquipmentLog({
      id: Date.now().toString(),
      setupAt: this.elements.equipmentSetupAt?.value || "",
      tearDownAt: this.elements.equipmentTearDownAt?.value || "",
      baseHeight: this.elements.equipmentBaseHeight?.value.trim() || "",
      referencePoint:
        this.elements.equipmentReferencePoint?.value.trim() || "",
      setupBy: this.elements.equipmentSetupBy?.value.trim() || "",
      location: this.currentEquipmentLocation,
      recordedAt: new Date().toISOString(),
    });

    project.equipmentLogs = project.equipmentLogs || [];
    project.equipmentLogs.push(entry);
    this.saveProjects();
    this.renderEquipmentList();
    this.navigationController?.onEquipmentLogsChanged();
    this.resetEquipmentForm();
  }

  renderEquipmentList() {
    if (!this.elements.equipmentList || !this.elements.equipmentSummary) return;
    const container = this.elements.equipmentList;
    container.innerHTML = "";

    const project = this.projects[this.currentProjectId];
    if (!project) {
      this.elements.equipmentSummary.textContent =
        "Select a project to view equipment logs.";
      return;
    }

    const logs = project.equipmentLogs || [];
    if (logs.length === 0) {
      this.elements.equipmentSummary.textContent =
        "No equipment setups saved yet.";
      return;
    }

    this.elements.equipmentSummary.textContent = `${logs.length} entr${
      logs.length === 1 ? "y" : "ies"
    } logged.`;

    logs
      .slice()
      .sort((a, b) => new Date(b.setupAt || b.recordedAt) - new Date(a.setupAt || a.recordedAt))
      .forEach((log) => {
        const card = document.createElement("div");
        card.className = "card";
        const setupTime = log.setupAt
          ? new Date(log.setupAt).toLocaleString()
          : "Not set";
        const teardownTime = log.tearDownAt
          ? new Date(log.tearDownAt).toLocaleString()
          : "Not recorded";
        const locationText = log.location
          ? `Lat ${log.location.lat.toFixed(6)}, Lon ${log.location.lon.toFixed(
              6
            )} (±${log.location.accuracy.toFixed(1)} m)`
          : "No GPS captured";
        card.innerHTML = `
          <strong>Base Station Setup</strong>
          <div class="subtitle" style="margin-top:4px">Logged ${new Date(
            log.recordedAt
          ).toLocaleString()}</div>
          <div>Setup at: ${this.escapeHtml(setupTime)}</div>
          <div>Tear down: ${this.escapeHtml(teardownTime)}</div>
          <div>Base height: ${this.escapeHtml(log.baseHeight || "")}</div>
          <div>Reference point: ${this.escapeHtml(
            log.referencePoint || ""
          )}</div>
          <div>Set up by: ${this.escapeHtml(log.setupBy || "")}</div>
          <div>Location: ${this.escapeHtml(locationText)}</div>
        `;
        container.appendChild(card);
      });
  }

  exportCornerFiling(entry) {
    if (!entry) return;
    const projectName = this.projects[entry.projectId]?.name || "Project";
    const lines = [];
    lines.push("Corner Perpetuation Filing");
    lines.push(`Project: ${projectName}`);
    lines.push(`Record: ${entry.recordName || "Record"}`);
    lines.push(`Traverse Point: ${entry.pointLabel || "Traverse point"}`);
    lines.push(`Created: ${new Date(entry.createdAt).toLocaleString()}`);
    if (entry.coords) {
      lines.push(
        `Coordinates: Easting ${entry.coords.x.toFixed(2)}, Northing ${entry.coords.y.toFixed(2)}`
      );
    }
    if (entry.location) {
      lines.push(
        `GPS: Lat ${entry.location.lat.toFixed(6)}, Lon ${entry.location.lon.toFixed(6)} (±${entry.location.accuracy.toFixed(1)} m)`
      );
    }
    if (entry.type) lines.push(`Evidence Type: ${entry.type}`);
    if (entry.condition) lines.push(`Condition: ${entry.condition}`);
    if (entry.notes) {
      lines.push("Notes:");
      lines.push(entry.notes);
    }
    if (entry.ties?.length) {
      lines.push("Ties:");
      entry.ties.forEach((tie, idx) => {
        const pieces = [tie.distance || "", tie.bearing || "", tie.description || ""]
          .filter(Boolean)
          .join(" · ");
        const photoLabel = tie.photos?.length
          ? ` (Photos attached: ${tie.photos.length})`
          : "";
        lines.push(`  ${idx + 1}. ${pieces}${photoLabel}`);
      });
    }
    if (entry.photo) {
      lines.push("Monument Photo: Captured (image stored with exports)");
    }
    const fileBase = (entry.pointLabel || "corner")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    this.downloadText(lines.join("\n"), `${fileBase}-cpf.txt`);
  }

  resetEvidenceForm() {
    if (this.elements.evidenceType) this.elements.evidenceType.value = "";
    if (this.elements.evidenceCondition) this.elements.evidenceCondition.value = "";
    if (this.elements.evidenceNotes) this.elements.evidenceNotes.value = "";
    if (this.elements.evidencePhoto) this.elements.evidencePhoto.value = "";
    if (this.elements.evidenceTiePhotos) this.elements.evidenceTiePhotos.value = "";
    if (this.elements.evidenceLocationStatus)
      this.elements.evidenceLocationStatus.textContent = "";
    this.currentEvidencePhoto = null;
    this.currentEvidenceLocation = null;
    this.currentEvidenceTies = [];
    this.renderEvidenceTies();
    this.updateEvidenceSaveState();
  }

  escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  saveCurrentRecord() {
    if (!this.currentRecordId) return;
    const record = this.projects[this.currentProjectId].records[
      this.currentRecordId
    ];
    record.startPtNum = this.elements.startPtNum.value.trim();
    record.northing = this.elements.northing.value.trim();
    record.easting = this.elements.easting.value.trim();
    record.elevation = this.elements.elevation.value.trim();
    record.bsAzimuth = this.elements.bsAzimuth.value.trim();
    record.basis = this.elements.basis.value.trim();
    record.firstDist = this.elements.firstDist.value.trim();

    record.calls = [];
    this.elements.callsTableBody.querySelectorAll("tr").forEach((tr) => {
      const bearing = tr.querySelector(".bearing").value.trim();
      const dist = tr.querySelector(".distance").value.trim();
      if (bearing || dist) {
        record.calls.push(new TraverseInstruction(bearing, dist));
      }
    });

    this.saveProjects();
  }

  deleteCurrentRecord() {
    if (!this.currentRecordId || !confirm("Delete this record?")) return;
    delete this.projects[this.currentProjectId].records[this.currentRecordId];
    this.saveProjects();
    this.currentRecordId = null;
    this.elements.editor.style.display = "none";
    this.renderRecordList();
    this.updateProjectList();
  }

  /* ===================== Calls table & bearings ===================== */
  addCallRow(bearing = "", dist = "", num = null) {
    const tbody = this.elements.callsTableBody;
    const tr = document.createElement("tr");
    const n = num || tbody.children.length + 2;

    const numTd = document.createElement("td");
    numTd.textContent = n;

    const bearingTd = document.createElement("td");
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
    bearingTd.appendChild(bearingCell);

    const distTd = document.createElement("td");
    distTd.colSpan = 2;
    const distanceRow = document.createElement("div");
    distanceRow.className = "distance-row";
    const distanceInput = document.createElement("input");
    distanceInput.type = "text";
    distanceInput.className = "distance";
    distanceInput.placeholder = "120.50";
    distanceInput.value = dist;
    distanceInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });
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

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.addEventListener("click", () => this.removeRow(tr));

    rowControls.append(moveUp, moveDown, remove);
    distanceRow.append(distanceInput, rowControls);
    distTd.appendChild(distanceRow);

    tr.append(numTd, bearingTd, distTd);
    tbody.appendChild(tr);

    this.updateBearingArrow(bearingInput);
  }

  moveRow(row, direction) {
    const tbody = this.elements.callsTableBody;
    const index = Array.from(tbody.children).indexOf(row);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tbody.children.length) return;
    const reference = tbody.children[newIndex];
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
    this.elements.callsTableBody.querySelectorAll("tr").forEach((tr, idx) => {
      const firstCell = tr.querySelector("td");
      if (firstCell) firstCell.textContent = idx + 2;
    });
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

  getAllCalls(record) {
    const allCalls = [];
    if (record.basis && record.firstDist) {
      allCalls.push({ bearing: record.basis, distance: record.firstDist });
    }
    (record.calls || []).forEach((c) => {
      if (c.bearing && c.distance) allCalls.push(c);
    });
    return allCalls;
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
    const card = document.querySelector(
      `.command-card[data-group="${group}"]`
    );
    if (!card) return;
    card.classList.toggle("expanded");
  }

  fitCanvasToDisplaySize(canvas) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || 0));
    const height = Math.max(1, Math.floor(rect.height || 0));
    if (width && height && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  /* ===================== Traverse geometry & drawing ===================== */
  computeTraversePointsForRecord(projectId, recordId, memo = {}, visiting = {}) {
    const project = this.projects[projectId];
    if (!project) return [];
    const records = project.records || {};
    const record = records[recordId];
    if (!record) return [];

    if (memo[recordId]) return memo[recordId];
    if (visiting[recordId]) {
      const startE = parseFloat(record.easting) || 0;
      const startN = parseFloat(record.northing) || 0;
      const pts = [{ x: startE, y: startN }];
      memo[recordId] = pts;
      return pts;
    }
    visiting[recordId] = true;

    let startX;
    let startY;
    const linkId = record.startFromRecordId;
    if (linkId && records[linkId]) {
      const prevPts = this.computeTraversePointsForRecord(
        projectId,
        linkId,
        memo,
        visiting
      );
      if (prevPts && prevPts.length > 0) {
        const last = prevPts[prevPts.length - 1];
        startX = last.x;
        startY = last.y;
      }
    }
    if (startX === undefined || startY === undefined) {
      startX = parseFloat(record.easting) || 0;
      startY = parseFloat(record.northing) || 0;
    }

    const pts = [{ x: startX, y: startY }];
    let currentE = startX;
    let currentN = startY;

    const allCalls = this.getAllCalls(record);
    allCalls.forEach((call) => {
      const parsed = this.parseBearing(call.bearing);
      if (!parsed) return;
      const dist = parseFloat(call.distance) || 0;
      const theta = ((parsed.angleDegrees || 0) * Math.PI) / 180;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      let dE = 0;
      let dN = 0;
      switch (parsed.quadrant) {
        case 1:
          dE = dist * sinT;
          dN = dist * cosT;
          break;
        case 2:
          dE = dist * sinT;
          dN = -dist * cosT;
          break;
        case 3:
          dE = -dist * sinT;
          dN = -dist * cosT;
          break;
        case 4:
          dE = -dist * sinT;
          dN = dist * cosT;
          break;
      }

      currentE += dE;
      currentN += dN;
      pts.push({ x: currentE, y: currentN });
    });

    memo[recordId] = pts;
    delete visiting[recordId];
    return pts;
  }

  drawTraversePreview(canvas, points) {
    if (!canvas) return;
    this.fitCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
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
    ctx.beginPath();
    const first = toCanvas(points[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const c = toCanvas(points[i]);
      ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();

    ctx.fillStyle = "#16a34a";
    const start = toCanvas(points[0]);
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    const end = toCanvas(points[points.length - 1]);
    ctx.beginPath();
    ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawProjectCompositeOnCanvas(projectId, canvas, small = false) {
    if (!canvas) return;
    this.fitCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (!projectId || !this.projects[projectId]) return;
    const records = this.projects[projectId].records || {};
    const recordIds = Object.keys(records);
    if (recordIds.length === 0) return;

    const polylines = [];
    let allPts = [];
    const memo = {};
    const visiting = {};

    recordIds.forEach((rid) => {
      const pts = this.computeTraversePointsForRecord(
        projectId,
        rid,
        memo,
        visiting
      );
      if (pts && pts.length > 0) {
        polylines.push({ id: rid, points: pts });
        allPts = allPts.concat(pts);
      }
    });

    if (allPts.length === 0) return;

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

    polylines.forEach((poly, idx) => {
      const pts = poly.points;
      if (pts.length === 0) return;

      const color = colors[idx % colors.length];
      ctx.lineWidth = small ? 1 : 2;
      ctx.strokeStyle = color;

      ctx.beginPath();
      const first = toCanvas(pts[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const c = toCanvas(pts[i]);
        ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();

      const start = toCanvas(pts[0]);
      const end = toCanvas(pts[pts.length - 1]);
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.arc(start.x, start.y, small ? 2 : 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(end.x, end.y, small ? 2 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
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

  /* ===================== Commands generation ===================== */
  generateCommands() {
    if (!this.currentRecordId) return;
    this.saveCurrentRecord();
    const record = this.projects[this.currentProjectId].records[
      this.currentRecordId
    ];

    try {
      let createPointText = "";
      createPointText += "EA\n";
      createPointText += `${record.northing}\n`;
      createPointText += `${record.easting}\n`;
      createPointText += `${record.elevation}\n\n`;
      this.setCommandText("createPoint", createPointText);

      let occupyPointText = "";
      occupyPointText += "OCCPOINT\n";
      occupyPointText += `${record.startPtNum}\n`;
      occupyPointText += "N\n\n\n\n";
      this.setCommandText("occupyPoint", occupyPointText);

      const allCalls = this.getAllCalls(record);

      let drawPointsText = "";
      if (allCalls.length === 0) {
        drawPointsText = "(No traverse calls entered)\n";
      } else {
        drawPointsText += "T\n";
        allCalls.forEach((call) => {
          const parsed = this.parseBearing(call.bearing);
          drawPointsText += `${parsed.quadrant}\n`;
          drawPointsText += `${parsed.formatted}\n`;
          drawPointsText += `${call.distance}\n`;
          drawPointsText += "0\n";
        });
        drawPointsText += "E\n";
      }
      this.setCommandText("drawPoints", drawPointsText);

      let drawLinesText = "";
      if (allCalls.length === 0) {
        drawLinesText = "(No traverse calls entered)\n";
      } else {
        drawLinesText += "L\n";
        drawLinesText += "P\n";
        drawLinesText += "1\n";
        allCalls.forEach((call) => {
          const parsed = this.parseBearing(call.bearing);
          drawLinesText += "D\n";
          drawLinesText += "F\n";
          drawLinesText += `${call.distance}\n`;
          drawLinesText += "A\n";
          drawLinesText += `${parsed.quadrant}\n`;
          drawLinesText += `${parsed.formatted}\n`;
        });
        drawLinesText += "Q\n";
      }
      this.setCommandText("drawLines", drawLinesText);

      const pts = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      this.drawTraversePreview(this.elements.traverseCanvas, pts);

      this.updateAllBearingArrows();
      this.renderRecordList();
      this.updateProjectList();
      this.drawProjectOverview();
    } catch (e) {
      this.setCommandText("createPoint", "Error: " + e.message);
      this.setCommandText("occupyPoint", "");
      this.setCommandText("drawPoints", "");
      this.setCommandText("drawLines", "");
      const canvas = this.elements.traverseCanvas;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  handleResize() {
    this.drawProjectOverview();
    if (this.currentProjectId && this.currentRecordId) {
      const pts = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      this.drawTraversePreview(this.elements.traverseCanvas, pts);
    }
  }

  /* ===================== Dropdowns ===================== */
  toggleEvidenceRecordDropdown() {
    this.elements.evidenceRecordDropdownContainer?.classList.toggle("open");
  }

  closeEvidenceRecordDropdown() {
    this.elements.evidenceRecordDropdownContainer?.classList.remove("open");
  }

  syncEvidenceRecordDropdownSelection() {
    const select = this.elements.evidenceRecordSelect;
    const menu = this.elements.evidenceRecordDropdownMenu;
    const label = this.elements.evidenceRecordDropdownLabel;
    if (label && select) {
      const selectedOpt = select.options[select.selectedIndex];
      label.textContent = selectedOpt?.textContent || "Select a record";
    }
    if (menu && select) {
      const currentId = select.value;
      menu.querySelectorAll(".start-option").forEach((node) => {
        if (node.dataset.recordId === currentId) node.classList.add("active");
        else node.classList.remove("active");
      });
    }
  }

  handleEvidenceRecordChange() {
    this.refreshEvidencePointOptions();
    this.updateEvidenceSaveState();
    this.syncEvidenceRecordDropdownSelection();
  }

  toggleProjectDropdown() {
    this.elements.projectDropdownContainer.classList.toggle("open");
    this.updateProjectList();
  }

  closeProjectDropdown() {
    this.elements.projectDropdownContainer.classList.remove("open");
  }

  updateProjectList() {
    const select = this.elements.projectSelect;
    const dropdownMenu = this.elements.projectDropdownMenu;
    if (!select || !dropdownMenu) return;

    select.innerHTML = "";
    dropdownMenu.innerHTML = "";

    Object.entries(this.projects).forEach(([id, proj]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = proj.name;
      if (id === this.currentProjectId) opt.selected = true;
      select.appendChild(opt);

      const option = document.createElement("div");
      option.className = "project-option";
      if (id === this.currentProjectId) option.classList.add("active");

      const nameSpan = document.createElement("span");
      nameSpan.className = "project-option-name";
      nameSpan.textContent = proj.name;

      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "project-option-canvas";
      const projCanvas = document.createElement("canvas");
      projCanvas.width = 80;
      projCanvas.height = 40;
      canvasWrapper.appendChild(projCanvas);

      option.appendChild(nameSpan);
      option.appendChild(canvasWrapper);

      option.addEventListener("click", () => {
        this.loadProject(id);
        this.closeProjectDropdown();
      });

      dropdownMenu.appendChild(option);

      try {
        this.drawProjectCompositeOnCanvas(id, projCanvas, true);
      } catch (e) {
        // ignore
      }
    });

    const selected = this.currentProjectId
      ? this.projects[this.currentProjectId]?.name
      : "No project";
    if (this.elements.projectDropdownLabel) {
      this.elements.projectDropdownLabel.textContent = selected || "No project";
    }
  }

  toggleStartFromDropdown() {
    this.elements.startFromDropdownContainer.classList.toggle("open");
    this.updateStartFromDropdownUI();
  }

  closeStartFromDropdown() {
    this.elements.startFromDropdownContainer.classList.remove("open");
  }

  updateStartFromDropdownUI() {
    const menu = this.elements.startFromDropdownMenu;
    if (!menu) return;
    menu.innerHTML = "";
    if (!this.currentProjectId) return;

    const records = this.projects[this.currentProjectId].records || {};
    const recordIds = Object.keys(records);
    if (recordIds.length === 0) return;

    const noneOpt = document.createElement("div");
    noneOpt.className = "start-option";
    noneOpt.innerHTML = "<span class=\"start-option-name\">Manual Start</span>";
    noneOpt.addEventListener("click", () => {
      this.setStartFromRecord(null);
      this.closeStartFromDropdown();
    });
    menu.appendChild(noneOpt);

    recordIds.forEach((rid) => {
      if (rid === this.currentRecordId) return;
      const record = records[rid];
      const opt = document.createElement("div");
      opt.className = "start-option";
      const name = document.createElement("span");
      name.className = "start-option-name";
      name.textContent = record.name;
      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "start-option-canvas";
      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;
      canvasWrapper.appendChild(canvas);
      opt.append(name, canvasWrapper);

      opt.addEventListener("click", () => {
        this.setStartFromRecord(rid);
        this.closeStartFromDropdown();
      });

      menu.appendChild(opt);

      try {
        const pts = this.computeTraversePointsForRecord(
          this.currentProjectId,
          rid
        );
        this.drawTraversePreview(canvas, pts);
      } catch (e) {
        // ignore
      }
    });

    const record = this.currentRecordId
      ? this.projects[this.currentProjectId].records[this.currentRecordId]
      : null;
    const label = record?.startFromRecordId
      ? records[record.startFromRecordId]?.name || "Linked Start"
      : "Manual Start";
    if (this.elements.startFromDropdownLabel) {
      this.elements.startFromDropdownLabel.textContent = label;
    }
  }

  setStartFromRecord(recordId) {
    if (!this.currentRecordId) return;
    const record = this.projects[this.currentProjectId].records[
      this.currentRecordId
    ];
    record.startFromRecordId = recordId;
    this.saveProjects();
    this.updateStartFromDropdownUI();
    this.generateCommands();
  }

  /* ===================== Misc helpers ===================== */
  serializeProjects() {
    const obj = {};
    Object.entries(this.projects).forEach(([id, proj]) => {
      obj[id] = proj.toObject();
    });
    return obj;
  }

  handleCommandGrid(evt) {
    const target = evt.target;
    const card = target.closest(".command-card");
    if (!card) return;
    const group = card.dataset.group;
    if (target.tagName === "BUTTON") {
      evt.stopPropagation();
      this.copyGroup(group);
      return;
    }
    this.toggleExpand(group);
  }
}
