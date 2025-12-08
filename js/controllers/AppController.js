import ProjectRepository from "../services/ProjectRepository.js";
import Project from "../models/Project.js";
import SurveyRecord from "../models/SurveyRecord.js";
import TraverseInstruction from "../models/TraverseInstruction.js";
import CornerEvidence from "../models/CornerEvidence.js";
import EvidenceTie from "../models/EvidenceTie.js";
import CornerEvidenceService from "../services/CornerEvidenceService.js";
import ResearchDocument from "../models/ResearchDocument.js";
import ResearchDocumentService from "../services/ResearchDocumentService.js";
import EquipmentLog from "../models/EquipmentLog.js";
import Point from "../models/Point.js";
import PointController from "./PointController.js";
import NavigationController from "./NavigationController.js";
import LevelingController from "./LevelingController.js";
import ChainEvidenceAppController from "./apps/ChainEvidenceAppController.js";
import EquipmentAppController from "./apps/EquipmentAppController.js";
import EvidenceAppController from "./apps/EvidenceAppController.js";
import HelpAppController from "./apps/HelpAppController.js";
import LevelingAppController from "./apps/LevelingAppController.js";
import NavigationAppController from "./apps/NavigationAppController.js";
import PointsAppController from "./apps/PointsAppController.js";
import QcAppController from "./apps/QcAppController.js";
import ResearchAppController from "./apps/ResearchAppController.js";
import SettingsAppController from "./apps/SettingsAppController.js";
import SpringboardAppController from "./apps/SpringboardAppController.js";
import TraverseAppController from "./apps/TraverseAppController.js";
import VicinityMapAppController from "./apps/VicinityMapAppController.js";
import GlobalSettingsService from "../services/GlobalSettingsService.js";
import VersioningService from "../services/VersioningService.js";
import SyncService from "../services/SyncService.js";
import AuditTrailService from "../services/AuditTrailService.js";

export default class AppController {
  constructor() {
    this.STORAGE_KEY = "carlsonSurveyProjects";
    this.repository = new ProjectRepository(this.STORAGE_KEY);
    this.globalSettingsService = new GlobalSettingsService(
      "carlsonGlobalSettings"
    );
    this.versioningService = new VersioningService();
    this.syncService = new SyncService();
    this.auditTrailService = new AuditTrailService();
    this.projects = this.repository.loadProjects();
    this.globalSettings = this.normalizeGlobalSettings(
      this.globalSettingsService.load()
    );
    this.ensureGlobalSettingsMetadata();
    this.deviceId = this.ensureDeviceId();
    this.currentProjectId = null;
    this.currentRecordId = null;
    this.commandTexts = {
      createPoint: "",
      occupyPoint: "",
      drawPoints: "",
      drawLines: "",
    };
    this.cornerEvidenceService = new CornerEvidenceService();
    this.researchDocumentService = new ResearchDocumentService();
    this.currentEvidencePhoto = null;
    this.currentEvidenceLocation = null;
    this.currentEvidenceTies = [];
    this.currentTraversePointOptions = [];
    this.currentEquipmentLocation = null;
    this.editingEquipmentId = null;
    this.editingTeamMemberId = null;
    this.editingPointCodeId = null;
    this.defaultHeaderMapLayer =
      'url(\'data:image/svg+xml,%3Csvg width="400" height="240" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cg opacity="0.35" stroke="%23a5b4fc" stroke-width="1.5"%3E%3Cpath d="M-40 24C40 52 120 52 200 24C280 -4 360 -4 440 24"/%3E%3Cpath d="M-40 84C40 112 120 112 200 84C280 56 360 56 440 84"/%3E%3Cpath d="M-40 144C40 172 120 172 200 144C280 116 360 116 440 144"/%3E%3Cpath d="M-40 204C40 232 120 232 200 204C280 176 360 176 440 204"/%3E%3Cpath d="M120 -20C92 60 92 140 120 220"/%3E%3Cpath d="M200 -20C172 60 172 140 200 220"/%3E%3Cpath d="M280 -20C252 60 252 140 280 220"/%3E%3C/g%3E%3Ccircle cx="200" cy="120" r="60" stroke="%23638cf5" stroke-width="2.5" opacity="0.35"/%3E%3C/svg%3E\')';
    this.geocodeCache = {};
    this.currentMapAddressKey = "";
    this.currentMapUrl = null;
    this.pendingMapRequestId = 0;
    this.vicinityMapRequestId = 0;
    this.chainFilters = {
      trs: "",
      cornerType: "",
      cornerStatus: "",
      status: "",
      startDate: "",
      endDate: "",
    };
    this.helpLoaded = false;
    this.helpLoading = false;
    this.liveUpdatesSource = null;
    this.liveUpdateRetry = null;
    this.syncPending = null;
    this.syncInProgress = false;
    this.syncQueued = false;
    this.userActivityState = {
      active: false,
      idleDelay: 1800,
      idleTimer: null,
      idleResolver: null,
      idlePromise: null,
    };

    this.defaultQcSettings = {
      traverseAngularTolerance: 0.25,
      traverseLinearTolerance: 0.0002,
      levelMisclosurePerDistance: 0.02,
    };

    this.cacheDom();
    this.setupUserActivityGuards();
    this.appLaunchers = document.querySelectorAll(".app-tile");
    this.pointController = new PointController({
      elements: {
        pointImportButton: this.elements.pointImportButton,
        pointsFileInput: this.elements.pointsFileInput,
        pointsTableBody: this.elements.pointsTableBody,
        addPointRowButton: this.elements.addPointRowButton,
        pointFileSelect: this.elements.pointFileSelect,
        newPointFileButton: this.elements.newPointFileButton,
        renamePointFileButton: this.elements.renamePointFileButton,
        downloadPointsButton: this.elements.downloadPointsButton,
        pointViewModeSelect: this.elements.pointViewModeSelect,
        adjustmentAlgorithm: this.elements.adjustmentAlgorithm,
        adjustmentNotes: this.elements.adjustmentNotes,
        adjustmentSaveButton: this.elements.adjustmentSaveButton,
        adjustmentSummary: this.elements.adjustmentSummary,
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
        cornerType: this.elements.navigationCornerType,
        cornerStatus: this.elements.navigationCornerStatus,
        saveBookmarkButton: this.elements.saveNavigationBookmark,
        bookmarkStatus: this.elements.navigationBookmarkStatus,
        targetSelect: this.elements.navigationTargetSelect,
        equipmentSelect: this.elements.navigationEquipmentSelect,
        bookmarksList: this.elements.navigationBookmarksList,
        refreshButton: this.elements.refreshNavigation,
        clearTargetButton: this.elements.clearNavigationTarget,
        toggleViewButton: this.elements.navigationToggleView,
        nearestPointsList: this.elements.nearestPointsList,
        mapPanel: this.elements.navigationMapPanel,
        mapFrame: this.elements.navigationMapFrame,
        mapStatus: this.elements.navigationMapStatus,
      },
      getCurrentProject: () =>
        this.currentProjectId ? this.projects[this.currentProjectId] : null,
      saveProjects: () => this.saveProjects(),
      getEquipmentLogs: () =>
        this.currentProjectId
          ? this.projects[this.currentProjectId]?.equipmentLogs || []
          : [],
      onTargetChanged: (state) => this.persistNavigationTarget(state),
      getDeviceId: () => this.deviceId,
      getPeerLocations: () => this.getPeerLocations(),
      onLocationUpdate: (coords) => this.recordLiveLocation(coords),
    });
    this.levelingController = new LevelingController({
      elements: {
        levelRunSelect: this.elements.levelRunSelect,
        newLevelRunButton: this.elements.newLevelRunButton,
        levelRunName: this.elements.levelRunName,
        levelStartPoint: this.elements.levelStartPoint,
        levelStartElevation: this.elements.levelStartElevation,
        levelClosingPoint: this.elements.levelClosingPoint,
        levelClosingElevation: this.elements.levelClosingElevation,
        addLevelEntryButton: this.elements.addLevelEntryButton,
        levelEntriesTableBody: this.elements.levelEntriesTableBody,
        levelTotalBs: this.elements.levelTotalBs,
        levelTotalFs: this.elements.levelTotalFs,
        levelMisclosure: this.elements.levelMisclosure,
        levelClosureNote: this.elements.levelClosureNote,
        exportLevelRunButton: this.elements.exportLevelRunButton,
      },
      getCurrentProject: () =>
        this.currentProjectId ? this.projects[this.currentProjectId] : null,
      saveProjects: () => this.saveProjects(),
      getProjectName: () =>
        this.currentProjectId ? this.projects[this.currentProjectId]?.name || "" : "",
    });
    this.appControllers = this.createAppControllers();
    this.bindStaticEvents();
    this.initialize();
  }

  setupUserActivityGuards() {
    const markActive = () => this.markUserActivity();
    [
      "input",
      "change",
      "focusin",
      "pointerdown",
      "touchstart",
      "keydown",
    ].forEach((eventName) =>
      document.addEventListener(eventName, markActive, true)
    );
  }

  markUserActivity() {
    const state = this.userActivityState;
    state.active = true;
    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
    }
    state.idleTimer = setTimeout(() => this.markUserIdle(), state.idleDelay);
  }

  markUserIdle() {
    const state = this.userActivityState;
    state.active = false;
    state.idleTimer = null;
    if (typeof state.idleResolver === "function") {
      state.idleResolver();
      state.idleResolver = null;
      state.idlePromise = null;
    }
  }

  waitForUserIdle() {
    const state = this.userActivityState;
    if (!state.active) return Promise.resolve();
    if (!state.idlePromise) {
      state.idlePromise = new Promise((resolve) => {
        state.idleResolver = resolve;
      });
    }
    return state.idlePromise;
  }

  async runUserSafeRefresh(handler) {
    await this.waitForUserIdle();
    const focusState = this.captureFocusState();
    const result = await handler();
    this.restoreFocusState(focusState);
    return result;
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
      pageHeader: document.querySelector(".header"),
      projectControls: document.getElementById("projectControls"),
      projectNameInput: document.getElementById("projectNameInput"),
      projectDetailName: document.getElementById("projectDetailName"),
      projectClientInput: document.getElementById("projectClientInput"),
      projectClientPhoneInput: document.getElementById(
        "projectClientPhoneInput"
      ),
      projectClientEmailInput: document.getElementById(
        "projectClientEmailInput"
      ),
      projectAddressInput: document.getElementById("projectAddressInput"),
      projectTownshipInput: document.getElementById("projectTownshipInput"),
      projectRangeInput: document.getElementById("projectRangeInput"),
      projectSectionInput: document.getElementById("projectSectionInput"),
      projectDescriptionInput: document.getElementById(
        "projectDescriptionInput"
      ),
      saveProjectDetailsButton: document.getElementById(
        "saveProjectDetailsButton"
      ),
      projectDetailsForm: document.getElementById("projectDetailsForm"),
      editProjectDetailsButton: document.getElementById(
        "editProjectDetailsButton"
      ),
      projectDetailsCard: document.getElementById("projectDetailsCard"),
      springboardHero: document.getElementById("springboardHero"),
      springboardProjectTitle: document.getElementById(
        "springboardProjectTitle"
      ),
      springboardProjectDescription: document.getElementById(
        "springboardProjectDescription"
      ),
      springboardStatusChip: document.getElementById("springboardStatusChip"),
      springboardCompositeCanvas: document.getElementById(
        "springboardCompositeCanvas"
      ),
      springboardCompositeEmpty: document.getElementById(
        "springboardCompositeEmpty"
      ),
      springboardClientValue: document.getElementById("springboardClientValue"),
      springboardClientPhoneValue: document.getElementById(
        "springboardClientPhoneValue"
      ),
      springboardAddressValue: document.getElementById(
        "springboardAddressValue"
      ),
      springboardClientEmailValue: document.getElementById(
        "springboardClientEmailValue"
      ),
      springboardCallButton: document.getElementById("springboardCallButton"),
      springboardMapButton: document.getElementById("springboardMapButton"),
      springboardEmailButton: document.getElementById("springboardEmailButton"),
      springboardTrsValue: document.getElementById("springboardTrsValue"),
      springboardLastExportValue: document.getElementById(
        "springboardLastExportValue"
      ),
      springboardExportWarning: document.getElementById(
        "springboardExportWarning"
      ),
      springboardExportNowButton: document.getElementById(
        "springboardExportNowButton"
      ),
      vicinityMapImage: document.getElementById("vicinityMapImage"),
      vicinityMapPlaceholder: document.getElementById("vicinityMapPlaceholder"),
      vicinityMapStatus: document.getElementById("vicinityMapStatus"),
      vicinityMapAddress: document.getElementById("vicinityMapAddress"),
      vicinityMapLink: document.getElementById("vicinityMapLink"),
      recordNameInput: document.getElementById("recordNameInput"),
      recordList: document.getElementById("recordList"),
      editor: document.getElementById("editor"),
      currentRecordName: document.getElementById("currentRecordName"),
      recordStatus: document.getElementById("recordStatus"),
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
      renamePointFileButton: document.getElementById("renamePointFileButton"),
      downloadPointsButton: document.getElementById("downloadPointsButton"),
      pointViewModeSelect: document.getElementById("pointViewModeSelect"),
      adjustmentAlgorithm: document.getElementById("adjustmentAlgorithm"),
      adjustmentNotes: document.getElementById("adjustmentNotes"),
      adjustmentSaveButton: document.getElementById("adjustmentSaveButton"),
      adjustmentSummary: document.getElementById("adjustmentSummary"),
      pointsFromRecordSelect: document.getElementById("pointsFromRecordSelect"),
      generatePointsFromTraverseButton: document.getElementById(
        "generatePointsFromTraverseButton"
      ),
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
      levelingSection: document.getElementById("levelingSection"),
      springboardSection: document.getElementById("springboardSection"),
      vicinityMapSection: document.getElementById("vicinityMapSection"),
      springboardGrid: document.querySelector(".springboard-grid"),
      navigationSection: document.getElementById("navigationSection"),
      traverseSection: document.getElementById("traverseSection"),
      pointsSection: document.getElementById("pointsSection"),
      settingsSection: document.getElementById("settingsSection"),
      evidenceSection: document.getElementById("evidenceSection"),
      chainEvidenceSection: document.getElementById("chainEvidenceSection"),
      equipmentSection: document.getElementById("equipmentSection"),
      helpSection: document.getElementById("helpSection"),
      helpContent: document.getElementById("helpContent"),
      helpStatus: document.getElementById("helpStatus"),
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
      evidenceTownship: document.getElementById("evidenceTownship"),
      evidenceRange: document.getElementById("evidenceRange"),
      evidenceSection: document.getElementById("evidenceSection"),
      evidenceSectionBreakdown: document.getElementById(
        "evidenceSectionBreakdown"
      ),
      evidenceCornerType: document.getElementById("evidenceCornerType"),
      evidenceCornerStatus: document.getElementById("evidenceCornerStatus"),
      evidenceStatus: document.getElementById("evidenceStatus"),
      evidenceCondition: document.getElementById("evidenceCondition"),
      evidenceBasisOfBearing: document.getElementById(
        "evidenceBasisOfBearing"
      ),
      evidenceMonumentType: document.getElementById("evidenceMonumentType"),
      evidenceMonumentMaterial: document.getElementById(
        "evidenceMonumentMaterial"
      ),
      evidenceMonumentSize: document.getElementById("evidenceMonumentSize"),
      evidenceSurveyorName: document.getElementById("evidenceSurveyorName"),
      evidenceSurveyorLicense: document.getElementById(
        "evidenceSurveyorLicense"
      ),
      evidenceSurveyorFirm: document.getElementById("evidenceSurveyorFirm"),
      evidenceSurveyDates: document.getElementById("evidenceSurveyDates"),
      evidenceSurveyCounty: document.getElementById("evidenceSurveyCounty"),
      evidenceRecordingInfo: document.getElementById("evidenceRecordingInfo"),
      cpfValidationStatus: document.getElementById("cpfValidationStatus"),
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
      chainTrsFilter: document.getElementById("chainTrsFilter"),
      chainCornerTypeFilter: document.getElementById("chainCornerTypeFilter"),
      chainCornerStatusFilter: document.getElementById(
        "chainCornerStatusFilter"
      ),
      chainStatusFilter: document.getElementById("chainStatusFilter"),
      chainStartDate: document.getElementById("chainStartDate"),
      chainEndDate: document.getElementById("chainEndDate"),
      chainApplyFilters: document.getElementById("chainApplyFilters"),
      chainResetFilters: document.getElementById("chainResetFilters"),
      chainEvidenceList: document.getElementById("chainEvidenceList"),
      chainEvidenceSummary: document.getElementById("chainEvidenceSummary"),
      chainExportAll: document.getElementById("chainExportAll"),
      equipmentSetupAt: document.getElementById("equipmentSetupAt"),
      equipmentTearDownAt: document.getElementById("equipmentTearDownAt"),
      equipmentBaseHeight: document.getElementById("equipmentBaseHeight"),
      equipmentReferencePoint: document.getElementById(
        "equipmentReferencePoint"
      ),
      equipmentReferencePointPicker: document.getElementById(
        "equipmentReferencePointPicker"
      ),
      equipmentReferencePointOptions: document.getElementById(
        "equipmentReferencePointOptions"
      ),
      equipmentSetupBy: document.getElementById("equipmentSetupBy"),
      equipmentUsed: document.getElementById("equipmentUsed"),
      captureEquipmentLocation: document.getElementById(
        "captureEquipmentLocation"
      ),
      equipmentLocationStatus: document.getElementById(
        "equipmentLocationStatus"
      ),
      saveEquipmentButton: document.getElementById("saveEquipmentButton"),
      resetEquipmentButton: document.getElementById("resetEquipmentButton"),
      equipmentWorkNotes: document.getElementById("equipmentWorkNotes"),
      equipmentFormStatus: document.getElementById("equipmentFormStatus"),
      equipmentList: document.getElementById("equipmentList"),
      equipmentSummary: document.getElementById("equipmentSummary"),
      navigationCompass: document.getElementById("navigationCompass"),
      navigationHeadingValue: document.getElementById("navigationHeadingValue"),
      navigationTargetBearing: document.getElementById(
        "navigationTargetBearing"
      ),
      navigationTargetDistance: document.getElementById(
        "navigationTargetDistance"
      ),
      navigationOffset: document.getElementById("navigationOffset"),
      navigationStatus: document.getElementById("navigationStatus"),
      navigationBookmarkName: document.getElementById("navigationBookmarkName"),
      navigationCornerType: document.getElementById("navigationCornerType"),
      navigationCornerStatus: document.getElementById("navigationCornerStatus"),
      saveNavigationBookmark: document.getElementById("saveNavigationBookmark"),
      navigationBookmarkStatus: document.getElementById(
        "navigationBookmarkStatus"
      ),
      navigationTargetSelect: document.getElementById("navigationTargetSelect"),
      navigationEquipmentSelect: document.getElementById(
        "navigationEquipmentSelect"
      ),
      navigationBookmarksList: document.getElementById(
        "navigationBookmarksList"
      ),
      navigationToggleView: document.getElementById("navigationToggleView"),
      nearestPointsList: document.getElementById("nearestPointsList"),
      refreshNavigation: document.getElementById("refreshNavigation"),
      clearNavigationTarget: document.getElementById("clearNavigationTarget"),
      navigationMapPanel: document.getElementById("navigationMapPanel"),
      navigationMapFrame: document.getElementById("navigationMapFrame"),
      navigationMapStatus: document.getElementById("navigationMapStatus"),
      localizationSource: document.getElementById("localizationSource"),
      localizationRecord: document.getElementById("localizationRecord"),
      localizationTraversePoint: document.getElementById(
        "localizationTraversePoint"
      ),
      localizationPointFile: document.getElementById("localizationPointFile"),
      localizationPointNumber: document.getElementById(
        "localizationPointNumber"
      ),
      localizationLat: document.getElementById("localizationLat"),
      localizationLon: document.getElementById("localizationLon"),
      localizationStatus: document.getElementById("localizationStatus"),
      localizationSummary: document.getElementById("localizationSummary"),
      localizationTraverseFields: document.getElementById(
        "localizationTraverseFields"
      ),
      localizationPointFileFields: document.getElementById(
        "localizationPointFileFields"
      ),
      applyLocalization: document.getElementById("applyLocalization"),
      clearLocalization: document.getElementById("clearLocalization"),
      equipmentNameInput: document.getElementById("equipmentNameInput"),
      equipmentMakeInput: document.getElementById("equipmentMakeInput"),
      equipmentModelInput: document.getElementById("equipmentModelInput"),
      equipmentManualInput: document.getElementById("equipmentManualInput"),
      equipmentNotesInput: document.getElementById("equipmentNotesInput"),
      saveEquipmentButton: document.getElementById("saveEquipmentButton"),
      resetEquipmentButton: document.getElementById("resetEquipmentButton"),
      equipmentEditHint: document.getElementById("equipmentEditHint"),
      equipmentTableBody: document.getElementById("equipmentTableBody"),
      teamMemberInput: document.getElementById("teamMemberInput"),
      teamMemberRoleInput: document.getElementById("teamMemberRoleInput"),
      teamMemberTitleInput: document.getElementById("teamMemberTitleInput"),
      teamMemberPhoneInput: document.getElementById("teamMemberPhoneInput"),
      teamMemberEmailInput: document.getElementById("teamMemberEmailInput"),
      saveTeamMemberButton: document.getElementById("saveTeamMemberButton"),
      resetTeamMemberButton: document.getElementById("resetTeamMemberButton"),
      teamMemberEditHint: document.getElementById("teamMemberEditHint"),
      teamMemberTableBody: document.getElementById("teamMemberTableBody"),
      deviceTeamMemberSelect: document.getElementById("deviceTeamMemberSelect"),
      deviceIdentifierHint: document.getElementById("deviceIdentifierHint"),
      pointCodeInput: document.getElementById("pointCodeInput"),
      pointCodeDescriptionInput: document.getElementById(
        "pointCodeDescriptionInput"
      ),
      savePointCodeButton: document.getElementById("savePointCodeButton"),
      resetPointCodeButton: document.getElementById("resetPointCodeButton"),
      pointCodeEditHint: document.getElementById("pointCodeEditHint"),
      pointCodeTableBody: document.getElementById("pointCodeTableBody"),
      exportAllDataButton: document.getElementById("exportAllDataButton"),
      importAllDataButton: document.getElementById("importAllDataButton"),
      importAllDataInput: document.getElementById("importAllDataInput"),
      auditFileInput: document.getElementById("auditFileInput"),
      createAuditSnapshotButton: document.getElementById(
        "createAuditSnapshotButton"
      ),
      latestAuditTimestamp: document.getElementById("latestAuditTimestamp"),
      latestAuditMeta: document.getElementById("latestAuditMeta"),
      auditEntriesList: document.getElementById("auditEntriesList"),
      auditStatus: document.getElementById("auditStatus"),
      downloadLatestAuditButton: document.getElementById(
        "downloadLatestAuditButton"
      ),
      verifyAuditButton: document.getElementById("verifyAuditButton"),
      levelRunSelect: document.getElementById("levelRunSelect"),
      newLevelRunButton: document.getElementById("newLevelRunButton"),
      levelRunName: document.getElementById("levelRunName"),
      levelStartPoint: document.getElementById("levelStartPoint"),
      levelStartElevation: document.getElementById("levelStartElevation"),
      levelClosingPoint: document.getElementById("levelClosingPoint"),
      levelClosingElevation: document.getElementById("levelClosingElevation"),
      addLevelEntryButton: document.getElementById("addLevelEntryButton"),
      levelEntriesTableBody: document.getElementById("levelEntriesTableBody"),
      levelTotalBs: document.getElementById("levelTotalBs"),
      levelTotalFs: document.getElementById("levelTotalFs"),
      levelMisclosure: document.getElementById("levelMisclosure"),
      levelClosureNote: document.getElementById("levelClosureNote"),
      exportLevelRunButton: document.getElementById("exportLevelRunButton"),
      qcSection: document.getElementById("qcSection"),
      qcOverallStatus: document.getElementById("qcOverallStatus"),
      qcTraverseAngularTolerance: document.getElementById(
        "qcTraverseAngularTolerance"
      ),
      qcTraverseLinearTolerance: document.getElementById(
        "qcTraverseLinearTolerance"
      ),
      qcLevelTolerance: document.getElementById("qcLevelTolerance"),
      qcSettingsStatus: document.getElementById("qcSettingsStatus"),
      qcSummary: document.getElementById("qcSummary"),
      qcTraverseList: document.getElementById("qcTraverseList"),
      qcLevelList: document.getElementById("qcLevelList"),
      exportQcSummaryButton: document.getElementById("exportQcSummaryButton"),
      saveQcSettingsButton: document.getElementById("saveQcSettingsButton"),
      researchSection: document.getElementById("researchSection"),
      researchList: document.getElementById("researchList"),
      researchSummary: document.getElementById("researchSummary"),
      researchDocumentType: document.getElementById("researchDocumentType"),
      researchJurisdiction: document.getElementById("researchJurisdiction"),
      researchInstrument: document.getElementById("researchInstrument"),
      researchBookPage: document.getElementById("researchBookPage"),
      researchDocumentNumber: document.getElementById("researchDocumentNumber"),
      researchTownship: document.getElementById("researchTownship"),
      researchRange: document.getElementById("researchRange"),
      researchSections: document.getElementById("researchSections"),
      researchAliquots: document.getElementById("researchAliquots"),
      researchSource: document.getElementById("researchSource"),
      researchDateReviewed: document.getElementById("researchDateReviewed"),
      researchReviewer: document.getElementById("researchReviewer"),
      researchStatus: document.getElementById("researchStatus"),
      researchClassification: document.getElementById("researchClassification"),
      researchNotes: document.getElementById("researchNotes"),
      researchCornerNotes: document.getElementById("researchCornerNotes"),
      researchTraverseLinks: document.getElementById("researchTraverseLinks"),
      researchStakeoutLinks: document.getElementById("researchStakeoutLinks"),
      researchCornerIds: document.getElementById("researchCornerIds"),
      researchEvidenceSelect: document.getElementById("researchEvidenceSelect"),
      saveResearchButton: document.getElementById("saveResearchButton"),
      resetResearchButton: document.getElementById("resetResearchButton"),
      exportResearchButton: document.getElementById("exportResearchButton"),
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
    this.elements.springboardExportNowButton?.addEventListener(
      "click",
      () => this.exportCurrentProject()
    );
    document
      .getElementById("exportAllButton")
      ?.addEventListener("click", () => this.exportAllProjects());
    document
      .getElementById("importButton")
      ?.addEventListener("click", () => this.triggerImport());
    document
      .getElementById("createRecordButton")
      ?.addEventListener("click", () => this.createRecord());
    this.elements.editProjectDetailsButton?.addEventListener("click", (e) => {
      e.preventDefault();
      this.setProjectDetailsEditing(true);
    });

    this.elements.projectDetailsForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveProjectDetails();
    });
    this.elements.saveProjectDetailsButton?.addEventListener("click", () =>
      this.saveProjectDetails()
    );

    this.elements.projectDropdownToggle?.addEventListener("click", () =>
      this.toggleProjectDropdown()
    );

    this.elements.evidenceRecordDropdownToggle?.addEventListener("click", () =>
      this.toggleEvidenceRecordDropdown()
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

    this.elements.importAllDataInput?.addEventListener("change", (e) => {
      this.handleAllDataImport(e.target);
    });

    this.elements.saveEquipmentButton?.addEventListener("click", () =>
      this.saveEquipment()
    );
    this.elements.resetEquipmentButton?.addEventListener("click", () =>
      this.resetEquipmentForm()
    );
    this.elements.saveTeamMemberButton?.addEventListener("click", () =>
      this.saveTeamMember()
    );
    this.elements.resetTeamMemberButton?.addEventListener("click", () =>
      this.resetTeamMemberForm()
    );
    this.elements.deviceTeamMemberSelect?.addEventListener("change", (e) =>
      this.setDeviceTeamMember(e.target.value)
    );
    this.elements.savePointCodeButton?.addEventListener("click", () =>
      this.savePointCode()
    );
    this.elements.resetPointCodeButton?.addEventListener("click", () =>
      this.resetPointCodeForm()
    );
    this.elements.exportAllDataButton?.addEventListener("click", () =>
      this.exportAllData()
    );
    this.elements.importAllDataButton?.addEventListener("click", () =>
      this.triggerAllDataImport()
    );
    this.elements.createAuditSnapshotButton?.addEventListener("click", () =>
      this.createAuditSnapshot()
    );
    this.elements.downloadLatestAuditButton?.addEventListener("click", () =>
      this.downloadLatestAudit()
    );
    this.elements.verifyAuditButton?.addEventListener("click", () =>
      this.triggerAuditVerification()
    );
    this.elements.auditFileInput?.addEventListener("change", (e) => {
      this.handleAuditVerificationFile(e.target);
    });

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

    this.bindNavigationLocalizationEvents();

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

    this.elements.recordStatus?.addEventListener("change", () =>
      this.saveCurrentRecord()
    );

    this.elements.addCallButton?.addEventListener("click", () => {
      this.addCallRow();
      this.reindexRows();
      this.saveCurrentRecord();
      this.generateCommands();
    });

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
    commandGrid?.addEventListener("click", (evt) =>
      this.handleCommandGrid(evt)
    );

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

    this.elements.generatePointsFromTraverseButton?.addEventListener(
      "click",
      () => this.generatePointFileFromRecord()
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

    [
      this.elements.chainTrsFilter,
      this.elements.chainCornerTypeFilter,
      this.elements.chainCornerStatusFilter,
      this.elements.chainStatusFilter,
      this.elements.chainStartDate,
      this.elements.chainEndDate,
    ].forEach((el) => {
      const eventName = el?.tagName === "SELECT" ? "change" : "input";
      el?.addEventListener(eventName, () => this.applyChainFiltersFromInputs());
    });
    this.elements.chainApplyFilters?.addEventListener("click", () =>
      this.applyChainFiltersFromInputs()
    );
    this.elements.chainResetFilters?.addEventListener("click", () =>
      this.resetChainFilters()
    );
    this.elements.chainExportAll?.addEventListener("click", () =>
      this.exportChainEvidenceSelection()
    );

    this.elements.cpfValidationStatus?.addEventListener("click", (evt) => {
      const target = evt.target.closest("[data-cpf-field]");
      if (!target) return;
      evt.preventDefault();
      this.focusCpfField(target.dataset.cpfField);
    });

    this.elements.saveResearchButton?.addEventListener("click", () =>
      this.saveResearchDocument()
    );
    this.elements.resetResearchButton?.addEventListener("click", () =>
      this.resetResearchForm()
    );
    this.elements.exportResearchButton?.addEventListener("click", () =>
      this.exportResearchPacket()
    );

    this.elements.saveQcSettingsButton?.addEventListener("click", () =>
      this.saveQcSettings()
    );
    this.elements.exportQcSummaryButton?.addEventListener("click", () =>
      this.exportQualityControlSummary()
    );
    this.elements.qcTraverseList?.addEventListener("click", (evt) =>
      this.appControllers?.qcSection?.handleQcListClick(evt)
    );
    this.elements.qcLevelList?.addEventListener("click", (evt) =>
      this.appControllers?.qcSection?.handleQcListClick(evt)
    );

    [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchDocumentNumber,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchClassification,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateResearchSaveState());
      if (el?.tagName === "SELECT") {
        el.addEventListener("change", () => this.updateResearchSaveState());
      }
    });

    this.elements.evidenceType?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );
    this.elements.evidenceCornerType?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );
    this.elements.evidenceCornerStatus?.addEventListener("change", () =>
      this.updateEvidenceSaveState()
    );
    this.elements.evidenceStatus?.addEventListener("change", () =>
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
      this.elements.equipmentUsed,
      this.elements.equipmentSetupBy,
      this.elements.equipmentWorkNotes,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateEquipmentSaveState());
      if (el?.tagName === "SELECT") {
        el.addEventListener("change", () => this.updateEquipmentSaveState());
      }
    });

    this.elements.equipmentReferencePointPicker?.addEventListener(
      "change",
      (e) => this.handleReferencePointSelection(e)
    );

    this.elements.saveEquipmentButton?.addEventListener("click", () =>
      this.saveEquipmentEntry()
    );

    this.elements.resetEquipmentButton?.addEventListener("click", () =>
      this.resetEquipmentForm()
    );

    window.addEventListener("scroll", () => this.handleSpringboardScroll());
    window.addEventListener("resize", () => this.handleSpringboardScroll());
  }

  bindNavigationLocalizationEvents() {
    this.elements.localizationSource?.addEventListener("change", () =>
      this.toggleLocalizationSource()
    );
    this.elements.localizationRecord?.addEventListener("change", () =>
      this.populateLocalizationTraversePoints()
    );
    this.elements.localizationPointFile?.addEventListener("change", () =>
      this.populateLocalizationPointNumbers()
    );
    this.elements.applyLocalization?.addEventListener("click", () =>
      this.applyGpsLocalization()
    );
    this.elements.clearLocalization?.addEventListener("click", () =>
      this.clearGpsLocalization()
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
      this.populatePointGenerationOptions();
      this.populateProjectDetailsForm(null);
      this.updateSpringboardHero();
    }
    this.populateLocalizationSelectors();
    this.refreshEvidenceUI();
    this.renderEvidenceTies();
    this.refreshEquipmentUI();
    this.renderGlobalSettings();
    this.loadHelpDocument();
    this.switchTab("springboardSection");
    this.handleSpringboardScroll();
    this.setupSyncHandlers();
  }

  setupSyncHandlers() {
    window.addEventListener("online", () => this.syncProjectsWithServer());
    return; // Disabled until bugs fixed
    window.addEventListener("online", () => this.startLiveUpdates());
    window.addEventListener("offline", () => this.stopLiveUpdates());
    if (navigator.onLine) {
      this.syncProjectsWithServer();
      this.startLiveUpdates();
    }
  }

  async syncProjectsWithServer() {
    if (!navigator.onLine) return;
    if (this.syncInProgress) {
      this.syncQueued = true;
      return;
    }
    this.syncInProgress = true;
    try {
      const serializedProjects = {};
      Object.entries(this.projects || {}).forEach(([id, project]) => {
        this.versioningService.ensureProjectTree(id, project);
        serializedProjects[id] = project.toObject();
      });

      const serializedEvidence =
        this.cornerEvidenceService.serializeAllEvidence();

      this.versioningService.ensureEvidenceMap(
        this.cornerEvidenceService.evidenceByProject
      );
      const response = await this.syncService.sync({
        projects: serializedProjects,
        evidence: serializedEvidence,
        globalSettings: this.globalSettings,
      });

      await this.runUserSafeRefresh(async () => {
        const latestProjects = this.serializeProjects();
        const latestEvidence =
          this.cornerEvidenceService.serializeAllEvidence();

        if (response?.projects) {
          const mergedProjects = this.versioningService.mergeDataset(
            latestProjects,
            response.projects
          );
          this.projects = this.repository.deserializeProjects(mergedProjects);
        }
        if (response?.evidence) {
          const mergedEvidence = this.versioningService.mergeDataset(
            latestEvidence,
            response.evidence
          );
          this.cornerEvidenceService.replaceAllEvidence(mergedEvidence);
        }
        if (response?.globalSettings) {
          const mergedSettings = this.versioningService.mergeValues(
            this.globalSettings,
            response.globalSettings
          );
          this.globalSettings = this.mergeGlobalSettings(mergedSettings);
          this.ensureGlobalSettingsMetadata();
          this.globalSettingsService.save(this.globalSettings);
          this.renderGlobalSettings();
        }
        this.saveProjects({ skipVersionUpdate: true, skipSync: true });
        this.stopLiveUpdates();
        this.startLiveUpdates();
        this.updateProjectList();
        const activeId =
          this.currentProjectId && this.projects[this.currentProjectId]
            ? this.currentProjectId
            : Object.keys(this.projects)[0];
        if (activeId) {
          this.loadProject(activeId, { preserveRecord: true });
        } else {
          this.drawProjectOverview();
        }
      });
    } catch (err) {
      console.warn("Sync failed", err);
    } finally {
      this.syncInProgress = false;
      if (this.syncQueued) {
        this.syncQueued = false;
        this.scheduleSync();
      }
    }
  }

  canUseLiveUpdates() {
    return (
      typeof EventSource !== "undefined" &&
      ["http:", "https:"].includes(window.location.protocol)
    );
  }

  startLiveUpdates() {
    if (!navigator.onLine || this.liveUpdatesSource || !this.canUseLiveUpdates()) {
      return;
    }

    try {
      const streamUrl = this.syncService.getStreamUrl();
      this.liveUpdatesSource = new EventSource(streamUrl);
      this.liveUpdatesSource.addEventListener("dataset", (event) =>
        this.applyLiveDataset(event.data)
      );
      this.liveUpdatesSource.onmessage = (event) =>
        this.applyLiveDataset(event.data);
      this.liveUpdatesSource.onerror = () => {
        this.stopLiveUpdates();
        this.scheduleLiveUpdateRetry();
      };
    } catch (err) {
      console.warn("Live updates unavailable", err);
      this.scheduleLiveUpdateRetry();
    }
  }

  stopLiveUpdates() {
    if (this.liveUpdatesSource) {
      this.liveUpdatesSource.close();
      this.liveUpdatesSource = null;
    }
    if (this.liveUpdateRetry) {
      clearTimeout(this.liveUpdateRetry);
      this.liveUpdateRetry = null;
    }
  }

  scheduleLiveUpdateRetry() {
    if (this.liveUpdateRetry || !navigator.onLine) return;
    this.liveUpdateRetry = setTimeout(() => {
      this.liveUpdateRetry = null;
      this.startLiveUpdates();
    }, 5000);
  }

  scheduleSync() {
    return;
    if (!navigator.onLine) return;
    if (this.syncPending) {
      clearTimeout(this.syncPending);
    }
    this.syncPending = setTimeout(() => {
      this.syncPending = null;
      this.syncProjectsWithServer();
    }, 500);
  }

  async applyLiveDataset(rawData) {
    if (!rawData) return;
    try {
      const dataset = JSON.parse(rawData);
      const { projects, evidence, globalSettings } = dataset || {};
      await this.runUserSafeRefresh(async () => {
        const activeProjectId = this.currentProjectId;
        const activeRecordId = this.currentRecordId;
        if (projects) {
          const currentProjects = {};
          Object.entries(this.projects || {}).forEach(([id, project]) => {
            currentProjects[id] = project.toObject();
          });
          const mergedProjects = this.versioningService.mergeDataset(
            currentProjects,
            projects
          );
          this.projects = this.repository.deserializeProjects(mergedProjects);
        }
        if (evidence) {
          const currentEvidence =
            this.cornerEvidenceService.serializeAllEvidence();
          const mergedEvidence = this.versioningService.mergeDataset(
            currentEvidence,
            evidence
          );
          this.cornerEvidenceService.replaceAllEvidence(mergedEvidence);
        }
        if (globalSettings) {
          const mergedSettings = this.versioningService.mergeValues(
            this.globalSettings,
            globalSettings
          );
          this.globalSettings = this.mergeGlobalSettings(mergedSettings);
          this.ensureGlobalSettingsMetadata();
          this.globalSettingsService.save(this.globalSettings);
          this.renderGlobalSettings();
          this.navigationController?.drawCompass();
        }
        if (projects || evidence) {
          this.saveProjects({ skipVersionUpdate: true, skipSync: true });
          this.updateProjectList();
          if (activeProjectId && this.projects && this.projects[activeProjectId]) {
            this.loadProject(activeProjectId, { preserveRecord: true });
            if (
              activeRecordId &&
              this.projects[activeProjectId]?.records?.[activeRecordId]
            ) {
              this.loadRecord(activeRecordId);
            }
          }
        }
      });
    } catch (err) {
      console.warn("Failed to apply live dataset", err);
    }
  }

  saveProjects(options = {}) {
    const { skipVersionUpdate = false, skipSync = false } = options;
    if (skipVersionUpdate) {
      Object.entries(this.projects || {}).forEach(([id, project]) =>
        this.versioningService.ensureProjectTree(id, project)
      );
      this.versioningService.ensureEvidenceMap(
        this.cornerEvidenceService.evidenceByProject
      );
    } else {
      this.versioningService.touchAll(
        this.projects,
        this.cornerEvidenceService.evidenceByProject
      );
    }
    const persisted = this.repository.saveProjects(this.projects);
    if (!persisted) {
      console.warn(
        "Unable to save projects locally. Storage may be full or unavailable."
      );
    }
    this.cornerEvidenceService.saveEvidence();
    this.populateLocalizationSelectors();
    this.navigationController?.renderTargetOptions();
    this.renderReferencePointOptions();
    this.renderQualityDashboard();
    if (!skipSync) {
      this.scheduleSync();
    }
  }

  ensureGlobalSettingsMetadata() {
    this.versioningService.ensureEntity(this.globalSettings, {
      prefix: "settings",
    });
  }

  generateId(prefix = "id") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  normalizeEquipmentEntry(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return {
        id: this.generateId("equip"),
        name: entry.trim(),
        make: "",
        model: "",
        manualUrl: "",
        notes: "",
        archived: false,
      };
    }
    const name = (entry.name || "").trim();
    if (!name) return null;
    return {
      id: entry.id || this.generateId("equip"),
      name,
      make: entry.make || "",
      model: entry.model || "",
      manualUrl: entry.manualUrl || entry.manual || "",
      notes: entry.notes || "",
      archived: Boolean(entry.archived),
    };
  }

  normalizeTeamMember(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return {
        id: this.generateId("team"),
        name: entry.trim(),
        role: "",
        title: "",
        phone: "",
        email: "",
        archived: false,
      };
    }
    const name = (entry.name || "").trim();
    if (!name) return null;
    return {
      id: entry.id || this.generateId("team"),
      name,
      role: entry.role || "",
      title: entry.title || "",
      phone: entry.phone || "",
      email: entry.email || "",
      archived: Boolean(entry.archived),
    };
  }

  normalizePointCode(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return {
        id: this.generateId("pc"),
        code: entry.trim(),
        description: "",
        archived: false,
      };
    }
    const code = (entry.code || "").trim();
    const description = entry.description || "";
    if (!code && !description) return null;
    return {
      id: entry.id || this.generateId("pc"),
      code,
      description,
      archived: Boolean(entry.archived),
    };
  }

  normalizeGlobalSettings(settings = {}) {
    const equipment = Array.isArray(settings.equipment)
      ? settings.equipment
          .map((item) => this.normalizeEquipmentEntry(item))
          .filter(Boolean)
      : [];
    const teamMembers = Array.isArray(settings.teamMembers)
      ? settings.teamMembers
          .map((item) => this.normalizeTeamMember(item))
          .filter(Boolean)
      : [];
    const pointCodes = Array.isArray(settings.pointCodes)
      ? settings.pointCodes
          .map((item) => this.normalizePointCode(item))
          .filter(Boolean)
      : [];
    const sanitized = {
      equipment,
      teamMembers,
      pointCodes,
      deviceProfiles:
        settings.deviceProfiles && typeof settings.deviceProfiles === "object"
          ? settings.deviceProfiles
          : {},
      liveLocations:
        settings.liveLocations && typeof settings.liveLocations === "object"
          ? settings.liveLocations
          : {},
    };
    return { ...settings, ...sanitized };
  }

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
      this.pointController.renderPointsTable();
      this.refreshEvidenceUI();
      this.populateLocalizationSelectors();
      this.navigationController?.onProjectChanged();
      this.populatePointGenerationOptions();
      this.populateProjectDetailsForm(null);
      this.renderAuditTrail();
      this.updateSpringboardHero();
      this.levelingController?.onProjectChanged();
      this.populateQcSettings(null);
      this.renderQualityDashboard();
      this.resetChainFilters();
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

    this.resetChainFilters();
    this.appControllers?.traverseSection?.renderRecords();
    this.updateProjectList();
    this.drawProjectOverview();
    this.hideProjectForm();
    this.pointController.renderPointsTable();
    this.refreshEvidenceUI();
    this.refreshResearchUI();
    this.resetEquipmentForm();
    this.refreshEquipmentUI();
    this.populateLocalizationSelectors();
    this.navigationController?.onProjectChanged();
    this.populatePointGenerationOptions();
    this.populateProjectDetailsForm(this.projects[id]);
    this.renderAuditTrail();
    this.updateSpringboardHero();
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
      [this.elements.projectDescriptionInput, project?.description || ""],
    ];

    const hasProject = Boolean(project);

    fields.forEach(([el, value]) => {
      if (el) {
        el.value = value;
        el.disabled = !hasProject;
      }
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
      let totalLength = 0;
      let linearMisclosure = null;
      let angularMisclosure = null;
      let status = "warn";
      let message = "Add traverse calls to compute closure.";

      if (mainLine.length >= 2) {
        for (let i = 1; i < mainLine.length; i++) {
          const prev = mainLine[i - 1];
          const curr = mainLine[i];
          totalLength += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        }
        const start = mainLine[0];
        const end = mainLine[mainLine.length - 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
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

        const ratio =
          totalLength > 0 ? linearMisclosure / totalLength : Number.POSITIVE_INFINITY;
        const angularPass = Number.isFinite(qcSettings.traverseAngularTolerance)
          ? angularMisclosure <= qcSettings.traverseAngularTolerance
          : null;
        const linearPass = Number.isFinite(qcSettings.traverseLinearTolerance)
          ? ratio <= qcSettings.traverseLinearTolerance
          : null;

        if ((angularPass === false || linearPass === false) && qcSettings) {
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

        if (!Number.isFinite(linearMisclosure)) {
          status = "warn";
          message = "Need numeric distances to compute closure.";
        }
      }

      results.traverses.push({
        id,
        name: record.name || `Record ${idx + 1}`,
        totalLength,
        linearMisclosure,
        angularMisclosure,
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

  renderQualityDashboard() {
    this.appControllers?.qcSection?.renderQualityDashboard();
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
                .join("
          ")}</ul>`
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
            <th>Angular misclosure</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${traverseRows || '<tr><td colspan="5">No traverses evaluated.</td></tr>'}
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
    const descEl = this.elements.springboardProjectDescription;
    const chipEl = this.elements.springboardStatusChip;
    const thumbCanvas = this.elements.springboardCompositeCanvas;
    const thumbWrapper = thumbCanvas?.parentElement;
    const thumbEmpty = this.elements.springboardCompositeEmpty;
    const hasProject = Boolean(project);

    if (hero) {
      hero.classList.toggle("empty", !project);
      if (!project) hero.classList.remove("collapsed");
    }

    if (thumbWrapper) {
      thumbWrapper.classList.toggle("has-geometry", false);
    }

    if (!project) {
      if (titleEl) titleEl.textContent = "No project selected";
      if (descEl)
        descEl.textContent =
          "Create or open a project to see its location context.";
      if (chipEl) chipEl.textContent = "No project";
    } else {
      if (titleEl) titleEl.textContent = project.name || "Active Project";
      if (descEl)
        descEl.textContent =
          project.description?.trim() ||
          "Add a project description to guide the crew.";
      if (chipEl) chipEl.textContent = "Active";
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

  buildTileMapPreview(lat, lon, zoom = 14) {
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return null;
    const n = 2 ** zoom;
    const xtile = Math.floor(((parsedLon + 180) / 360) * n);
    const latRad = (parsedLat * Math.PI) / 180;
    const ytile = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        n
    );
    const bounds = {
      xmin: Math.max(xtile - 1, 0),
      xmax: Math.min(xtile + 1, n - 1),
      ymin: Math.max(ytile - 1, 0),
      ymax: Math.min(ytile + 1, n - 1),
    };
    return `https://bigmap.osmz.ru/bigmap.php?zoom=${zoom}&xmin=${bounds.xmin}&ymin=${bounds.ymin}&xmax=${bounds.xmax}&ymax=${bounds.ymax}&tiles=mapnik&width=1200&height=600&showscale=1&markers=${parsedLat.toFixed(
      6
    )},${parsedLon.toFixed(6)},red-pushpin`;
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
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          address
        )}`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        const { lat, lon } = data[0];
        const tileMap = this.buildTileMapPreview(lat, lon, 13);
        const mapUrl =
          tileMap ||
          `https://nominatim.openstreetmap.org/ui/staticmap.php?center=${lat},${lon}&zoom=14&size=1200x600&markers=${lat},${lon},red-pushpin`;
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

  async loadHelpDocument(force = false) {
    if (this.helpLoading || (this.helpLoaded && !force)) return;
    const container = this.elements.helpContent;
    if (!container) return;
    const status = this.elements.helpStatus;
    this.helpLoading = true;
    if (status) status.textContent = "Loading help from HELP.md…";

    try {
      const res = await fetch("HELP.md");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      container.innerHTML = this.renderMarkdown(text);
      if (status)
        status.textContent =
          "Loaded from HELP.md. Click refresh after editing the file.";
      this.helpLoaded = true;
    } catch (err) {
      console.error("Failed to load help content", err);
      if (status)
        status.textContent = "Couldn't load HELP.md. Confirm it sits by index.html.";
      container.innerHTML =
        "<p>Help content could not be loaded. Make sure HELP.md is next to index.html.</p>";
    } finally {
      this.helpLoading = false;
    }
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
      evidenceSection: new EvidenceAppController({
        id: "evidenceSection",
        section: this.elements.evidenceSection,
        refreshEvidence: () => this.refreshEvidenceUI(),
      }),
      chainEvidenceSection: new ChainEvidenceAppController({
        id: "chainEvidenceSection",
        section: this.elements.chainEvidenceSection,
        refreshChainEvidence: () => this.refreshChainEvidence(),
      }),
      researchSection: new ResearchAppController({
        id: "researchSection",
        section: this.elements.researchSection,
        refreshResearch: () => this.refreshResearchUI(),
      }),
      equipmentSection: new EquipmentAppController({
        id: "equipmentSection",
        section: this.elements.equipmentSection,
        refreshEquipment: () => this.refreshEquipmentUI(),
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
        loadHelp: () => this.loadHelpDocument(),
      }),
    };
  }

  handleSpringboardScroll() {
    const header = this.elements.pageHeader;
    if (!header) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    header.style.setProperty("--parallax-offset", `${scrollTop * 0.25}px`);
  }

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

    this.renderChainEvidenceList();
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
    this.populateChainFilters();
    this.applyChainFiltersFromInputs(false);
    this.renderChainEvidenceList();
  }

  populateChainFilters() {
    const evidence = this.cornerEvidenceService.getProjectEvidence(
      this.currentProjectId
    );
    const types = [
      ...new Set((evidence || []).map((ev) => ev.cornerType).filter(Boolean)),
    ];
    const statuses = [
      ...new Set((evidence || []).map((ev) => ev.cornerStatus).filter(Boolean)),
    ];

    const applyOptions = (select, values, label, selectedValue = "") => {
      if (!select) return;
      const current = selectedValue || select.value;
      select.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = label;
      select.appendChild(placeholder);
      values.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        opt.selected = val === current;
        select.appendChild(opt);
      });
      if (select.value !== current && current) {
        select.value = current;
      }
    };

    applyOptions(
      this.elements.chainCornerTypeFilter,
      types,
      "All corner types",
      this.chainFilters.cornerType
    );
    applyOptions(
      this.elements.chainCornerStatusFilter,
      statuses,
      "All corner statuses",
      this.chainFilters.cornerStatus
    );
  }

  applyChainFiltersFromInputs(render = true) {
    this.chainFilters.trs = this.elements.chainTrsFilter?.value.trim() || "";
    this.chainFilters.cornerType =
      this.elements.chainCornerTypeFilter?.value || "";
    this.chainFilters.cornerStatus =
      this.elements.chainCornerStatusFilter?.value || "";
    this.chainFilters.status =
      this.elements.chainStatusFilter?.value || "";
    this.chainFilters.startDate = this.elements.chainStartDate?.value || "";
    this.chainFilters.endDate = this.elements.chainEndDate?.value || "";
    if (render) this.renderChainEvidenceList();
  }

  resetChainFilters() {
    this.chainFilters = {
      trs: "",
      cornerType: "",
      cornerStatus: "",
      status: "",
      startDate: "",
      endDate: "",
    };
    if (this.elements.chainTrsFilter) this.elements.chainTrsFilter.value = "";
    if (this.elements.chainCornerTypeFilter)
      this.elements.chainCornerTypeFilter.value = "";
    if (this.elements.chainCornerStatusFilter)
      this.elements.chainCornerStatusFilter.value = "";
    if (this.elements.chainStatusFilter)
      this.elements.chainStatusFilter.value = "";
    if (this.elements.chainStartDate) this.elements.chainStartDate.value = "";
    if (this.elements.chainEndDate) this.elements.chainEndDate.value = "";
    this.renderChainEvidenceList();
  }

  normalizeFilterDate(value, isEnd = false) {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  getChainFilteredEvidence() {
    const evidence = this.cornerEvidenceService.getProjectEvidence(
      this.currentProjectId
    );
    const trsFilter = this.chainFilters.trs.toLowerCase();
    const startDate = this.normalizeFilterDate(this.chainFilters.startDate);
    const endDate = this.normalizeFilterDate(this.chainFilters.endDate, true);

    const filtered = evidence.filter((ev) => {
      const trs = (this.buildEvidenceTrs(ev) || "").toLowerCase();
      if (trsFilter && !trs.includes(trsFilter)) return false;
      if (this.chainFilters.cornerType && ev.cornerType !== this.chainFilters.cornerType)
        return false;
      if (
        this.chainFilters.cornerStatus &&
        ev.cornerStatus !== this.chainFilters.cornerStatus
      )
        return false;
      if (this.chainFilters.status && ev.status !== this.chainFilters.status)
        return false;
      const created = ev.createdAt ? new Date(ev.createdAt) : null;
      if (startDate && created && created < startDate) return false;
      if (endDate && created && created > endDate) return false;
      return true;
    });

    return filtered.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }

  renderChainEvidenceList() {
    const container = this.elements.chainEvidenceList;
    const summary = this.elements.chainEvidenceSummary;
    if (!container || !summary) return;

    this.populateChainFilters();
    container.innerHTML = "";

    if (!this.currentProjectId) {
      summary.textContent = "Select a project to view evidence.";
      return;
    }

    const allEvidence = this.cornerEvidenceService.getProjectEvidence(
      this.currentProjectId
    );
    if (!allEvidence.length) {
      summary.textContent = "No evidence logged yet.";
      return;
    }

    const filtered = this.getChainFilteredEvidence();
    const total = allEvidence.length;
    const matchedWord = filtered.length === 1 ? "entry" : "entries";
    const totalWord = total === 1 ? "entry" : "entries";
    summary.textContent =
      filtered.length === total
        ? `${total} evidence ${totalWord} documented.`
        : `${filtered.length} ${matchedWord} of ${total} evidence ${totalWord} match the filters.`;

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "subtitle";
      empty.textContent = "No evidence matched the selected filters.";
      container.appendChild(empty);
      return;
    }

    const qcResults = this.latestQcResults || this.computeQualityResults();
    const researchDocs = this.researchDocumentService.getProjectDocuments(
      this.currentProjectId
    );

    const groups = new Map();
    filtered.forEach((ev) => {
      const trs = this.buildEvidenceTrs(ev) || "Unspecified TRS";
      if (!groups.has(trs)) groups.set(trs, []);
      groups.get(trs).push(ev);
    });

    Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([trs, entries]) => {
        const group = document.createElement("div");
        group.className = "chain-group";
        const header = document.createElement("div");
        header.className = "chain-group-header";
        const title = document.createElement("strong");
        title.textContent = trs;
        const count = document.createElement("span");
        count.className = "subtitle";
        count.textContent = `${entries.length} entr${
          entries.length === 1 ? "y" : "ies"
        }`;
        header.append(title, count);
        group.appendChild(header);

        entries
          .slice()
          .sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          .forEach((entry) => {
            group.appendChild(
              this.buildChainEvidenceCard(entry, qcResults, researchDocs)
            );
          });

        container.appendChild(group);
      });
  }

  buildChainEvidenceCard(entry, qcResults, researchDocs) {
    const card = document.createElement("div");
    card.className = "chain-entry";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";

    const title = document.createElement("strong");
    title.textContent = entry.title || this.buildEvidenceTitle(entry);
    header.appendChild(title);

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    chipRow.appendChild(this.buildStatusChip(entry.status || "Draft"));
    if (entry.cornerType) {
      const typeChip = document.createElement("span");
      typeChip.className = "status-chip info";
      typeChip.textContent = entry.cornerType;
      chipRow.appendChild(typeChip);
    }
    if (entry.cornerStatus) {
      const statusChip = document.createElement("span");
      statusChip.className = "status-chip in-progress";
      statusChip.textContent = entry.cornerStatus;
      chipRow.appendChild(statusChip);
    }
    const qcState = this.describeEvidenceQc(entry, qcResults);
    const qcChip = this.buildQcChip(qcState);
    if (qcChip) chipRow.appendChild(qcChip);
    header.appendChild(chipRow);
    card.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "meta";
    const recordLabel = entry.recordName || "Unlinked";
    const createdLabel = entry.createdAt
      ? new Date(entry.createdAt).toLocaleString()
      : "";
    meta.textContent = `${recordLabel} · Saved ${createdLabel}`;
    card.appendChild(meta);

    const trsLine = this.buildEvidenceTrs(entry);
    if (trsLine) {
      const trs = document.createElement("div");
      trs.textContent = `TRS: ${trsLine}`;
      card.appendChild(trs);
    }

    if (entry.notes) {
      const notes = document.createElement("div");
      notes.textContent = entry.notes;
      card.appendChild(notes);
    }

    if (entry.ties?.length) {
      const ties = document.createElement("div");
      ties.className = "subtitle";
      ties.textContent = `${entry.ties.length} tie${
        entry.ties.length === 1 ? "" : "s"
      } recorded.`;
      card.appendChild(ties);
    }

    const completeness = this.getCpfCompleteness(entry);
    const missingFields = completeness?.missing || [];
    const cpStatus = document.createElement("div");
    cpStatus.className = "mini-note";
    cpStatus.textContent = completeness.complete
      ? "CP&F-ready"
      : `CP&F validation outstanding: ${missingFields.join(", ") || "Items not documented"}`;
    card.appendChild(cpStatus);

    const researchRefs = this.getResearchReferencesForEvidence(
      entry,
      researchDocs
    );
    if (researchRefs.length) {
      const refBlock = document.createElement("div");
      const refTitle = document.createElement("strong");
      refTitle.textContent = "Linked research";
      const list = document.createElement("ul");
      researchRefs.forEach((doc) => {
        const li = document.createElement("li");
        const line = [doc.type, doc.classification].filter(Boolean).join(" · ");
        li.textContent = line || doc.type || "Research document";
        list.appendChild(li);
      });
      refBlock.append(refTitle, list);
      card.appendChild(refBlock);
    }

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.marginTop = "8px";
    const cpfBtn = document.createElement("button");
    cpfBtn.type = "button";
    cpfBtn.textContent = "Export CP&F";
    cpfBtn.addEventListener("click", () => this.exportCornerFiling(entry));
    const packetBtn = document.createElement("button");
    packetBtn.type = "button";
    packetBtn.className = "secondary";
    packetBtn.textContent = "Evidence Packet";
    packetBtn.addEventListener("click", () =>
      this.exportChainEvidencePacket(entry, qcState, researchRefs)
    );
    actions.append(cpfBtn, packetBtn);
    card.appendChild(actions);

    return card;
  }

  describeEvidenceQc(entry, qcResults = {}) {
    const defaultState = { label: "No traverse link", level: "info" };
    if (!entry?.recordId) return defaultState;
    const traverse = qcResults.traverses?.find((t) => t.id === entry.recordId);
    if (!traverse) return { label: "Traverse not evaluated", level: "warn" };
    if (traverse.status === "fail")
      return { label: "Fails tolerance", level: "fail" };
    if (traverse.status === "pass")
      return { label: "Passes tolerance", level: "pass" };
    return { label: traverse.message || "QC pending", level: "warn" };
  }

  buildQcChip(state = { label: "", level: "info" }) {
    const chip = document.createElement("span");
    chip.className = "status-chip";
    chip.textContent = `QC: ${state.label || "Not evaluated"}`;
    if (state.level === "fail") chip.classList.add("draft");
    else if (state.level === "pass") chip.classList.add("ready");
    else if (state.level === "warn") chip.classList.add("in-progress");
    else chip.classList.add("info");
    return chip;
  }

  getResearchReferencesForEvidence(entry, docs = []) {
    return (docs || []).filter((doc) =>
      doc.linkedEvidence?.some((ev) => (ev.id || ev) === entry.id)
    );
  }

  exportChainEvidencePacket(entry, qcState, researchRefs = []) {
    if (!entry) return;
    const qcResults = this.latestQcResults || this.computeQualityResults();
    const packetQcState = qcState || this.describeEvidenceQc(entry, qcResults);
    const completeness = this.getCpfCompleteness(entry);
    const refs =
      researchRefs.length > 0
        ? researchRefs
        : this.getResearchReferencesForEvidence(
            entry,
            this.researchDocumentService.getProjectDocuments(entry.projectId)
          );
    const html = this.buildEvidencePacketLayout(entry, {
      qcState: packetQcState,
      researchRefs: refs,
      completeness,
    });
    const fileBase = (entry.title || this.buildEvidenceTitle(entry) || "corner")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    this.downloadHtml(html, `${fileBase}-evidence-packet.html`);
  }

  exportChainEvidenceSelection() {
    if (!this.currentProjectId) return;
    const filtered = this.getChainFilteredEvidence();
    if (!filtered.length) return;
    const qcResults = this.latestQcResults || this.computeQualityResults();
    const researchDocs = this.researchDocumentService.getProjectDocuments(
      this.currentProjectId
    );
    const sections = filtered
      .map((entry) =>
        this.buildEvidencePacketLayout(entry, {
          qcState: this.describeEvidenceQc(entry, qcResults),
          researchRefs: this.getResearchReferencesForEvidence(
            entry,
            researchDocs
          ),
          completeness: this.getCpfCompleteness(entry),
          includeHeader: false,
        })
      )
      .join("<hr />");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Corner Evidence Packet</title></head><body><h1>Corner Evidence Packet</h1>${sections}</body></html>`;
    this.downloadHtml(html, "corner-evidence-packet.html");
  }

  buildEvidencePacketLayout(entry, options = {}) {
    const {
      qcState = { label: "Not evaluated", level: "info" },
      researchRefs = [],
      completeness = { complete: false, missing: [] },
      includeHeader = true,
    } = options;
    const trs = this.buildEvidenceTrs(entry) || "Unspecified";
    const photoBlock = entry.photo
      ? `<div style="margin-top:8px;"><strong>Photo</strong><br /><img src="${entry.photo}" alt="Evidence photo" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb;" /></div>`
      : "";
    const ties = (entry.ties || [])
      .map((tie, idx) => {
        const parts = [tie.distance, tie.bearing, tie.description]
          .filter(Boolean)
          .map((p) => this.escapeHtml(p))
          .join(" · ");
        return `<li><strong>Tie ${idx + 1}:</strong> ${parts || "No details"}</li>`;
      })
      .join("");
    const researchList = researchRefs
      .map(
        (doc) =>
          `<li><strong>${this.escapeHtml(doc.type || "Research")}</strong> — ${
            this.escapeHtml(doc.classification || "Unclassified")
          }</li>`
      )
      .join("");
    const qcLabel = qcState.label || "Not evaluated";
    const cpStatus = completeness.complete
      ? "Complete"
      : `Missing: ${completeness.missing.join(", ")}`;
    const header = includeHeader
      ? `<h1>${this.escapeHtml(entry.title || this.buildEvidenceTitle(entry))}</h1>`
      : "";
    const body = `${header}<div><strong>TRS:</strong> ${this.escapeHtml(
      trs
    )}</div><div><strong>Corner type:</strong> ${this.escapeHtml(
      entry.cornerType || ""
    )}</div><div><strong>Corner status:</strong> ${this.escapeHtml(
      entry.cornerStatus || ""
    )}</div><div><strong>Evidence status:</strong> ${this.escapeHtml(
      entry.status || "Draft"
    )}</div><div><strong>QC:</strong> ${this.escapeHtml(
      qcLabel
    )}</div><div><strong>CP&F readiness:</strong> ${this.escapeHtml(
      cpStatus
    )}</div><div><strong>Record:</strong> ${this.escapeHtml(
      entry.recordName || "Unlinked"
    )}</div><div><strong>Notes:</strong> ${this.escapeHtml(
      entry.notes || "No notes recorded"
    )}</div>${photoBlock}${ties ? `<div style="margin-top:6px;"><strong>Ties</strong><ul>${ties}</ul></div>` : ""}${
      researchList
        ? `<div style="margin-top:6px;"><strong>Research References</strong><ul>${researchList}</ul></div>`
        : ""
    }`;

    if (!includeHeader) {
      return `<section>${body}</section>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${this.escapeHtml(
      entry.title || "Evidence Packet"
    )}</title></head><body>${body}</body></html>`;
  }

  /* ===================== Research & Source Documentation ===================== */
  refreshResearchUI() {
    this.populateResearchEvidenceOptions();
    this.renderResearchList();
    this.updateResearchSaveState();
  }

  populateResearchEvidenceOptions() {
    const select = this.elements.researchEvidenceSelect;
    if (!select) return;
    select.innerHTML = "";
    const evidence = this.cornerEvidenceService.getProjectEvidence(
      this.currentProjectId
    );
    if (!evidence.length) {
      const opt = document.createElement("option");
      opt.disabled = true;
      opt.value = "";
      opt.textContent = "No evidence logged";
      select.appendChild(opt);
      return;
    }
    evidence
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((ev) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.dataset.label = `${ev.pointLabel || "Traverse point"} · ${
          ev.recordName || "Record"
        }`;
        opt.textContent = `${ev.pointLabel || "Traverse point"} (${ev.recordName ||
          "Record"})`;
        select.appendChild(opt);
      });
  }

  updateResearchSaveState() {
    if (!this.elements.saveResearchButton) return;
    const required = [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchClassification,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
    ];
    const canSave =
      !!this.currentProjectId &&
      required.every((el) => el && el.value.trim().length > 0);
    this.elements.saveResearchButton.disabled = !canSave;
  }

  saveResearchDocument() {
    if (!this.currentProjectId) return;
    const selectedEvidence = Array.from(
      this.elements.researchEvidenceSelect?.selectedOptions || []
    ).map((opt) => ({ id: opt.value, label: opt.dataset.label || opt.textContent }));

    const doc = new ResearchDocument({
      projectId: this.currentProjectId,
      type: this.elements.researchDocumentType?.value.trim() || "",
      jurisdiction: this.elements.researchJurisdiction?.value.trim() || "",
      instrumentNumber: this.elements.researchInstrument?.value.trim() || "",
      bookPage: this.elements.researchBookPage?.value.trim() || "",
      documentNumber: this.elements.researchDocumentNumber?.value.trim() || "",
      township: this.elements.researchTownship?.value.trim() || "",
      range: this.elements.researchRange?.value.trim() || "",
      sections: this.elements.researchSections?.value.trim() || "",
      aliquots: this.elements.researchAliquots?.value.trim() || "",
      source: this.elements.researchSource?.value.trim() || "",
      dateReviewed: this.elements.researchDateReviewed?.value.trim() || "",
      reviewer: this.elements.researchReviewer?.value.trim() || "",
      status: this.elements.researchStatus?.value.trim() || "Draft",
      classification:
        this.elements.researchClassification?.value.trim() || "",
      notes: this.elements.researchNotes?.value.trim() || "",
      cornerNotes: this.elements.researchCornerNotes?.value.trim() || "",
      linkedEvidence: selectedEvidence,
      traverseLinks: this.elements.researchTraverseLinks?.value.trim() || "",
      stakeoutLinks: this.elements.researchStakeoutLinks?.value.trim() || "",
      cornerIds: this.elements.researchCornerIds?.value.trim() || "",
    });

    this.researchDocumentService.addEntry(doc);
    this.resetResearchForm();
    this.renderResearchList();
  }

  resetResearchForm() {
    [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchDocumentNumber,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchAliquots,
      this.elements.researchSource,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
      this.elements.researchStatus,
      this.elements.researchClassification,
      this.elements.researchNotes,
      this.elements.researchCornerNotes,
      this.elements.researchTraverseLinks,
      this.elements.researchStakeoutLinks,
      this.elements.researchCornerIds,
    ].forEach((el) => {
      if (el) el.value = "";
    });
    if (this.elements.researchStatus) {
      this.elements.researchStatus.value = "Draft";
    }
    if (this.elements.researchEvidenceSelect) {
      Array.from(this.elements.researchEvidenceSelect.options).forEach((opt) => {
        opt.selected = false;
      });
    }
    this.updateResearchSaveState();
  }

  renderResearchList() {
    if (!this.elements.researchList || !this.elements.researchSummary) return;
    const docs = this.researchDocumentService.getProjectDocuments(
      this.currentProjectId
    );
    const container = this.elements.researchList;
    container.innerHTML = "";

    if (!this.currentProjectId) {
      this.elements.researchSummary.textContent =
        "Select a project to view research.";
      return;
    }

    if (!docs.length) {
      this.elements.researchSummary.textContent =
        "No research documents logged yet.";
      return;
    }

    this.elements.researchSummary.textContent = `${docs.length} source${
      docs.length === 1 ? "" : "s"
    } documented.`;

    const toDate = (doc) =>
      doc.dateReviewed ? new Date(doc.dateReviewed) : new Date(doc.createdAt);
    docs
      .slice()
      .sort((a, b) => toDate(b) - toDate(a))
      .forEach((doc) => {
        const card = document.createElement("div");
        card.className = "card";
        const title = document.createElement("strong");
        title.textContent = doc.type || "Source document";
        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        const trsParts = [doc.township, doc.range, doc.sections]
          .filter(Boolean)
          .join(" ");
        subtitle.textContent = trsParts || "Location not set";
        const badgeRow = document.createElement("div");
        badgeRow.style.display = "flex";
        badgeRow.style.gap = "8px";
        const statusChip = this.buildStatusChip(doc.status || "Draft");
        const badge = document.createElement("span");
        badge.className = "status-chip info";
        badge.textContent = doc.classification || "Unclassified";
        badgeRow.append(statusChip, badge);
        card.append(title, subtitle, badgeRow);

        const meta = document.createElement("div");
        const recordParts = [
          doc.jurisdiction,
          doc.instrumentNumber,
          doc.bookPage,
          doc.documentNumber,
        ]
          .filter(Boolean)
          .join(" · ");
        if (recordParts) {
          meta.textContent = recordParts;
          card.appendChild(meta);
        }
        const reviewerLine = document.createElement("div");
        reviewerLine.textContent = `Reviewed ${doc.dateReviewed || ""} by ${
          doc.reviewer || ""
        }`;
        card.appendChild(reviewerLine);

        if (doc.source) {
          const src = document.createElement("div");
          src.textContent = `Source: ${doc.source}`;
          card.appendChild(src);
        }
        if (doc.aliquots) {
          const ali = document.createElement("div");
          ali.textContent = `Aliquots: ${doc.aliquots}`;
          card.appendChild(ali);
        }
        if (doc.cornerNotes) {
          const cn = document.createElement("div");
          cn.textContent = `Corner/line notes: ${doc.cornerNotes}`;
          card.appendChild(cn);
        }
        if (doc.traverseLinks) {
          const tv = document.createElement("div");
          tv.textContent = `Traverse links: ${doc.traverseLinks}`;
          card.appendChild(tv);
        }
        if (doc.stakeoutLinks) {
          const st = document.createElement("div");
          st.textContent = `Stakeout links: ${doc.stakeoutLinks}`;
          card.appendChild(st);
        }
        if (doc.cornerIds) {
          const cid = document.createElement("div");
          cid.textContent = `TRS corner IDs: ${doc.cornerIds}`;
          card.appendChild(cid);
        }
        if (doc.notes) {
          const notes = document.createElement("div");
          notes.textContent = doc.notes;
          notes.style.marginTop = "6px";
          card.appendChild(notes);
        }
        if (doc.linkedEvidence?.length) {
          const list = document.createElement("ul");
          list.className = "ties-list";
          doc.linkedEvidence.forEach((ev) => {
            const li = document.createElement("li");
            li.textContent = ev.label || ev.id;
            list.appendChild(li);
          });
          const heading = document.createElement("strong");
          heading.textContent = "Linked evidence";
          card.append(heading, list);
        }
        container.appendChild(card);
      });

    this.renderChainEvidenceList();
  }

  exportResearchPacket() {
    if (!this.currentProjectId) return;
    const docs = this.researchDocumentService.getProjectDocuments(
      this.currentProjectId
    );
    if (!docs.length) {
      alert("No research documents to export.");
      return;
    }
    const projectName = this.projects[this.currentProjectId]?.name || "Project";
    const normalizedStatuses = docs.map((doc) =>
      (doc.status || "Draft").toLowerCase()
    );
    const exportStatus = normalizedStatuses.every((status) => status === "final")
      ? "Final"
      : normalizedStatuses.some((status) => status === "ready for review")
      ? "Ready for Review"
      : normalizedStatuses.some((status) => status === "in progress")
      ? "In Progress"
      : "Draft";
    const meta = this.buildExportMetadata(exportStatus);
    const label = this.getExportStatusLabel(exportStatus);
    const exportNote = meta.note || label.note;
    const lines = [
      "Research and Source Documentation Packet",
      meta.status || label.title,
    ];
    if (exportStatus.toLowerCase() !== "final") {
      lines.push("PRELIMINARY — NOT FOR RECORDATION");
    }
    if (exportNote) {
      lines.push(exportNote);
    } else if (exportStatus.toLowerCase() !== "final") {
      lines.push("Incomplete — subject to revision.");
    }
      lines.push(
        `Project: ${projectName}`,
        `Generated: ${meta.generatedAt || new Date().toISOString()}`,
        ""
      );
    docs
      .slice()
      .sort((a, b) => (a.township || "").localeCompare(b.township || ""))
      .forEach((doc, idx) => {
        lines.push(`${idx + 1}. ${doc.type || "Document"}`);
        const trs = [doc.township, doc.range, doc.sections, doc.aliquots]
          .filter(Boolean)
          .join(" ");
        if (trs) lines.push(`   TRS: ${trs}`);
        const recParts = [
          doc.jurisdiction,
          doc.instrumentNumber,
          doc.bookPage,
          doc.documentNumber,
        ]
          .filter(Boolean)
          .join(" · ");
        if (recParts) lines.push(`   Recording: ${recParts}`);
        lines.push(`   Status: ${doc.status || "Draft"}`);
        lines.push(
          `   Reviewed ${doc.dateReviewed || ""} by ${doc.reviewer || ""} (${doc.classification || ""})`
        );
        if (doc.source) lines.push(`   Source: ${doc.source}`);
        if (doc.cornerNotes) lines.push(`   Notes: ${doc.cornerNotes}`);
        if (doc.traverseLinks) lines.push(`   Traverse links: ${doc.traverseLinks}`);
        if (doc.stakeoutLinks)
          lines.push(`   Stakeout links: ${doc.stakeoutLinks}`);
        if (doc.cornerIds) lines.push(`   TRS corner IDs: ${doc.cornerIds}`);
        if (doc.notes) lines.push(`   Annotation: ${doc.notes}`);
        if (doc.linkedEvidence?.length) {
          lines.push(
            `   Linked evidence: ${doc.linkedEvidence
              .map((ev) => ev.label || ev.id)
              .join("; ")}`
          );
        }
        lines.push("");
      });
    const safeName = projectName.replace(/[^\w\-]+/g, "_").toLowerCase();
    this.downloadText(lines.join("\n"), `${safeName}-research-packet.txt`);
  }

  /* ===================== Equipment Setup ===================== */
  refreshEquipmentUI() {
    this.renderReferencePointOptions();
    this.renderEquipmentSetupByOptions();
    this.renderEquipmentPickerOptions();
    this.renderEquipmentList();
    this.updateEquipmentSaveState();
  }

  resetEquipmentForm() {
    [
      this.elements.equipmentSetupAt,
      this.elements.equipmentTearDownAt,
      this.elements.equipmentBaseHeight,
      this.elements.equipmentReferencePoint,
      this.elements.equipmentUsed,
      this.elements.equipmentSetupBy,
      this.elements.equipmentWorkNotes,
    ].forEach((el) => {
      if (el) el.value = "";
    });
    if (this.elements.equipmentReferencePointPicker) {
      this.elements.equipmentReferencePointPicker.value = "";
    }
    if (this.elements.equipmentUsed) {
      Array.from(this.elements.equipmentUsed.options).forEach((opt) => {
        opt.selected = false;
      });
    }
    if (this.elements.equipmentFormStatus) {
      this.elements.equipmentFormStatus.textContent = "";
    }
    if (this.elements.saveEquipmentButton) {
      this.elements.saveEquipmentButton.textContent = "Save Equipment Entry";
    }
    if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "";
    }
    this.currentEquipmentLocation = null;
    this.editingEquipmentId = null;
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

  renderReferencePointOptions() {
    const picker = this.elements.equipmentReferencePointPicker;
    const datalist = this.elements.equipmentReferencePointOptions;
    const project = this.projects[this.currentProjectId];
    if (!picker || !datalist || !project) {
      if (picker) picker.innerHTML = "";
      if (datalist) datalist.innerHTML = "";
      return;
    }

    const options = new Set();
    (project.pointFiles || []).forEach((pf) => {
      (pf.points || []).forEach((pt) => {
        const labelParts = [pt.pointNumber, pt.description]
          .map((part) => part?.toString().trim())
          .filter(Boolean);
        const label = labelParts.join(" · ");
        if (label) options.add(label);
      });
    });
    (project.referencePoints || []).forEach((name) => {
      if (name && name.trim()) options.add(name.trim());
    });
    (project.equipmentLogs || []).forEach((log) => {
      if (log.referencePoint && log.referencePoint.trim()) {
        options.add(log.referencePoint.trim());
      }
    });

    const sortedOptions = Array.from(options).sort((a, b) => {
      const priority = (label) => (/base/i.test(label) || /rerf/i.test(label)) ? 1 : 0;
      const aPriority = priority(a);
      const bPriority = priority(b);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });

    picker.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      sortedOptions.length > 0
        ? "Select a stored reference point"
        : "No saved reference points";
    picker.appendChild(placeholder);

    sortedOptions.forEach((label) => {
      const opt = document.createElement("option");
      opt.value = label;
      opt.dataset.label = label;
      opt.textContent = label;
      picker.appendChild(opt);
    });

    datalist.innerHTML = "";
    sortedOptions.forEach((label) => {
      const opt = document.createElement("option");
      opt.value = label;
      datalist.appendChild(opt);
    });
  }

  renderEquipmentSetupByOptions() {
    const select = this.elements.equipmentSetupBy;
    if (!select) return;

    const previousValue = select.value;
    select.innerHTML = "";
    const memberNames = this.getActiveTeamMembers()
      .map((entry) => entry.name)
      .filter(Boolean);

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      memberNames.length > 0
        ? "Select team member"
        : "Add team members in settings";
    select.appendChild(placeholder);

    memberNames
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .forEach((member) => {
        const opt = document.createElement("option");
        opt.value = member;
        opt.textContent = member;
        select.appendChild(opt);
      });

    select.value = previousValue;
    if (previousValue && select.value !== previousValue) {
      const fallback = document.createElement("option");
      fallback.value = previousValue;
      fallback.textContent = previousValue;
      select.appendChild(fallback);
      select.value = previousValue;
    }
  }

  renderEquipmentPickerOptions() {
    const select = this.elements.equipmentUsed;
    if (!select) return;

    const previousSelection = Array.from(select.selectedOptions).map(
      (opt) => opt.value
    );
    const project = this.projects[this.currentProjectId];
    const names = new Set();

    (this.globalSettings.equipment || [])
      .filter((entry) => entry && !entry.archived && entry.name)
      .forEach((entry) => names.add(entry.name));
    project?.equipmentLogs?.forEach((log) => {
      (log.equipmentUsed || [])
        .filter(Boolean)
        .forEach((name) => names.add(name));
    });
    previousSelection.filter(Boolean).forEach((name) => names.add(name));

    const sorted = Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.hidden = true;
    placeholder.textContent =
      sorted.length > 0
        ? "Select equipment used (optional)"
        : "Add equipment names in settings";
    select.appendChild(placeholder);

    sorted.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    previousSelection.forEach((name) => {
      const option = Array.from(select.options).find(
        (opt) => opt.value === name
      );
      if (option) option.selected = true;
      else {
        const fallback = document.createElement("option");
        fallback.value = name;
        fallback.textContent = name;
        fallback.selected = true;
        select.appendChild(fallback);
        }
      });
  }

  getStatusClass(status) {
    const normalized = (status || "draft").toLowerCase();
    if (normalized === "in progress") return "in-progress";
    if (normalized === "ready for review") return "ready";
    if (normalized === "final") return "final";
    return "draft";
  }

  getEvidenceStatusClass(status) {
    return this.getStatusClass(status);
  }

  getExportStatusLabel(status) {
    const normalized = (status || "").toLowerCase();
    if (normalized === "draft") {
      return {
        title: "Draft — Partial or Incomplete",
        note: "Incomplete — subject to revision.",
      };
    }
    if (normalized === "final") {
      return {
        title: "Final — Professional Declaration Signed",
        note: null,
      };
    }
    return {
      title: "Preliminary — In Progress",
      note: "Incomplete — subject to revision.",
    };
  }

  getCpfCompleteness(entry) {
    if (!entry) {
      return { missing: ["evidence record missing"], complete: false };
    }
    const missing = [];
    if (!entry.cornerType) missing.push("corner type");
    if (!entry.cornerStatus) missing.push("corner status");
    if (!entry.type) missing.push("evidence type");
    if (!entry.condition) missing.push("condition / occupation evidence");
    if (!entry.basisOfBearing) missing.push("basis of bearing");
    if (!entry.monumentType) missing.push("monument type");
    if (!entry.monumentMaterial) missing.push("monument material");
    if (!entry.monumentSize) missing.push("monument size");
    if (!entry.surveyorName) missing.push("responsible surveyor name");
    if (!entry.surveyorLicense)
      missing.push("responsible surveyor license number");
    if (!entry.surveyDates) missing.push("survey date(s)");
    if (!entry.surveyCounty) missing.push("county");
    if (!entry.recordingInfo) missing.push("recording information");
    if (!entry.ties || entry.ties.length === 0)
      missing.push("reference ties");

    const normalizedStatus = (entry.status || "").toLowerCase();
    const statusAllowsFinal = normalizedStatus === "final";
    const complete = statusAllowsFinal && missing.length === 0;

    return { missing, complete };
  }

  getCpfFieldElements() {
    return {
      "corner type": this.elements.evidenceCornerType,
      "corner status": this.elements.evidenceCornerStatus,
      "evidence type": this.elements.evidenceType,
      "condition / occupation evidence": this.elements.evidenceCondition,
      "basis of bearing": this.elements.evidenceBasisOfBearing,
      "monument type": this.elements.evidenceMonumentType,
      "monument material": this.elements.evidenceMonumentMaterial,
      "monument size": this.elements.evidenceMonumentSize,
      "responsible surveyor name": this.elements.evidenceSurveyorName,
      "responsible surveyor license number":
        this.elements.evidenceSurveyorLicense,
      "survey date(s)": this.elements.evidenceSurveyDates,
      county: this.elements.evidenceSurveyCounty,
      "recording information": this.elements.evidenceRecordingInfo,
      "reference ties":
        this.elements.evidenceTiesList || this.elements.evidenceTiesHint,
    };
  }

  clearCpfValidationState() {
    const fields = this.getCpfFieldElements();
    Object.values(fields).forEach((el) =>
      el?.classList?.remove("field-missing")
    );
    if (this.elements.cpfValidationStatus) {
      this.elements.cpfValidationStatus.classList.add("hidden");
      this.elements.cpfValidationStatus
        .querySelector(".cpf-chip-row")
        ?.replaceChildren();
    }
  }

  renderCpfValidationCallout(missing) {
    const container = this.elements.cpfValidationStatus;
    if (!container) return;
    container.classList.remove("hidden");
    const chipRow = container.querySelector(".cpf-chip-row");
    if (!chipRow) return;
    chipRow.innerHTML = "";
    missing.forEach((label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cpf-chip";
      chip.dataset.cpfField = label;
      chip.textContent = label;
      chipRow.appendChild(chip);
    });
  }

  focusCpfField(fieldName) {
    if (!fieldName) return;
    this.switchTab("evidenceSection");
    const target = this.getCpfFieldElements()[fieldName];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof target.focus === "function") target.focus({ preventScroll: true });
      target.classList.add("field-missing");
    }
  }

  highlightMissingCpfFields(missing) {
    const fields = this.getCpfFieldElements();
    missing.forEach((field) => {
      const el = fields[field];
      if (el) {
        el.classList.add("field-missing");
      }
    });
    if (missing.length) {
      this.focusCpfField(missing[0]);
    }
  }

  handleReferencePointSelection(event) {
    const option = event.target?.selectedOptions?.[0];
    const label = option?.dataset?.label || option?.value || "";
    if (this.elements.equipmentReferencePoint) {
      this.elements.equipmentReferencePoint.value = label;
    }
    this.updateEquipmentSaveState();
  }

  rememberReferencePoint(name) {
    const trimmed = name?.trim();
    if (!trimmed) return;
    const project = this.projects[this.currentProjectId];
    if (!project) return;
    project.referencePoints = Array.isArray(project.referencePoints)
      ? project.referencePoints
      : [];
    const exists = project.referencePoints.some(
      (rp) => rp.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      project.referencePoints.push(trimmed);
    }
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
          this.elements.equipmentLocationStatus.textContent = `Lat ${pos.coords.latitude.toFixed(
            6
          )}, Lon ${pos.coords.longitude.toFixed(
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
    project.equipmentLogs = project.equipmentLogs || [];
    const referencePoint =
      this.elements.equipmentReferencePoint?.value.trim() || "";
    const equipmentUsed = Array.from(
      this.elements.equipmentUsed?.selectedOptions || []
    )
      .map((opt) => opt.value)
      .filter(Boolean);
    const workNotes = this.elements.equipmentWorkNotes?.value.trim() || "";
    const payload = {
      setupAt: this.elements.equipmentSetupAt?.value || "",
      tearDownAt: this.elements.equipmentTearDownAt?.value || "",
      baseHeight: this.elements.equipmentBaseHeight?.value.trim() || "",
      referencePoint,
      equipmentUsed,
      setupBy: this.elements.equipmentSetupBy?.value.trim() || "",
      workNotes,
    };

    if (referencePoint) {
      this.rememberReferencePoint(referencePoint);
    }

    if (this.editingEquipmentId) {
      const existingIndex = project.equipmentLogs.findIndex(
        (log) => log.id === this.editingEquipmentId
      );
      if (existingIndex !== -1) {
        const existing = project.equipmentLogs[existingIndex];
        const updated = Object.assign(existing, payload);
        updated.location =
          this.currentEquipmentLocation || existing.location || null;
        updated.recordedAt = existing.recordedAt || new Date().toISOString();
      }
    } else {
      const entry = new EquipmentLog({
        id: Date.now().toString(),
        ...payload,
        location: this.currentEquipmentLocation,
        recordedAt: new Date().toISOString(),
      });
      project.equipmentLogs.push(entry);
    }
    this.saveProjects();
    this.renderReferencePointOptions();
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
      .sort(
        (a, b) =>
          new Date(b.setupAt || b.recordedAt) -
          new Date(a.setupAt || a.recordedAt)
      )
      .forEach((log) => {
        const card = document.createElement("div");
        card.className = "card";
        const setupTime = log.setupAt
          ? new Date(log.setupAt).toLocaleString()
          : "Not set";
        const teardownTime = log.tearDownAt
          ? new Date(log.tearDownAt).toLocaleString()
          : "Not recorded";
        const equipmentList =
          log.equipmentUsed?.length
            ? log.equipmentUsed.join(", ")
            : "None selected";
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
          <div>Equipment: ${this.escapeHtml(equipmentList)}</div>
          <div>Set up by: ${this.escapeHtml(log.setupBy || "")}</div>
          <div>Location: ${this.escapeHtml(locationText)}</div>
        `;
        if (log.workNotes) {
          const notes = document.createElement("div");
          notes.style.marginTop = "6px";
          notes.textContent = `Work / Goal: ${log.workNotes}`;
          card.appendChild(notes);
        }

        const actions = document.createElement("div");
        actions.className = "equipment-actions";

        const teardownBtn = document.createElement("button");
        teardownBtn.type = "button";
        teardownBtn.textContent = "Log Tear Down Now";
        teardownBtn.addEventListener("click", () =>
          this.logEquipmentTeardown(log.id)
        );
        actions.appendChild(teardownBtn);

        if (log.location) {
          const navBtn = document.createElement("button");
          navBtn.type = "button";
          navBtn.textContent = "Navigate to this base";
          navBtn.addEventListener("click", () =>
            this.openEquipmentInNavigation(log.id)
          );
          actions.appendChild(navBtn);
        }

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () =>
          this.startEditingEquipmentEntry(log.id)
        );
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "danger";
        deleteBtn.addEventListener("click", () =>
          this.deleteEquipmentEntry(log.id)
        );
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        container.appendChild(card);
      });
  }

  logEquipmentTeardown(id) {
    const project = this.projects[this.currentProjectId];
    if (!project?.equipmentLogs) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry) return;
    entry.tearDownAt = new Date().toISOString();
    this.saveProjects();
    this.renderEquipmentList();
    this.navigationController?.onEquipmentLogsChanged();
  }

  openEquipmentInNavigation(id) {
    const project = this.projects[this.currentProjectId];
    if (!project?.equipmentLogs || !this.navigationController) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry?.location) return;

    this.navigationController.renderEquipmentOptions();
    if (this.elements.navigationEquipmentSelect) {
      this.elements.navigationEquipmentSelect.value = id;
    }
    this.navigationController.applyEquipmentTarget(id);
    this.switchTab("navigationSection");
    this.elements.navigationSection?.scrollIntoView({ behavior: "smooth" });
  }

  persistNavigationTarget(state = {}) {
    const project = this.currentProjectId
      ? this.projects[this.currentProjectId]
      : null;
    if (!project) return;

    const previous = project.navigationTarget || {};
    const timestamp = new Date().toISOString();
    const coords = state.coords;
    const sanitizedCoords =
      coords &&
      typeof coords.lat === "number" &&
      typeof coords.lon === "number"
        ? { lat: coords.lat, lon: coords.lon }
        : null;

    project.navigationTarget = {
      type: state.type || null,
      id: state.id || null,
      label: state.label || "",
      value: state.value || "",
      coords: sanitizedCoords,
      updatedAt: timestamp,
      version: (previous.version ?? 0) + 1,
    };
    this.saveProjects();
  }

  startEditingEquipmentEntry(id) {
    const project = this.projects[this.currentProjectId];
    if (!project?.equipmentLogs) return;
    const entry = project.equipmentLogs.find((log) => log.id === id);
    if (!entry) return;
    this.editingEquipmentId = id;
    if (this.elements.equipmentSetupAt)
      this.elements.equipmentSetupAt.value = entry.setupAt || "";
    if (this.elements.equipmentTearDownAt)
      this.elements.equipmentTearDownAt.value = entry.tearDownAt || "";
    if (this.elements.equipmentBaseHeight)
      this.elements.equipmentBaseHeight.value = entry.baseHeight || "";
    if (this.elements.equipmentReferencePoint)
      this.elements.equipmentReferencePoint.value = entry.referencePoint || "";
    if (this.elements.equipmentSetupBy)
      this.elements.equipmentSetupBy.value = entry.setupBy || "";
    if (this.elements.equipmentWorkNotes)
      this.elements.equipmentWorkNotes.value = entry.workNotes || "";
    this.renderEquipmentPickerOptions();
    if (this.elements.equipmentUsed) {
      const desired = new Set(entry.equipmentUsed || []);
      Array.from(this.elements.equipmentUsed.options).forEach((opt) => {
        opt.selected = desired.has(opt.value);
      });
    }
    if (
      this.elements.equipmentSetupBy &&
      entry.setupBy &&
      this.elements.equipmentSetupBy.value !== entry.setupBy
    ) {
      const opt = document.createElement("option");
      opt.value = entry.setupBy;
      opt.textContent = entry.setupBy;
      this.elements.equipmentSetupBy.appendChild(opt);
      this.elements.equipmentSetupBy.value = entry.setupBy;
    }
    if (this.elements.equipmentFormStatus) {
      this.elements.equipmentFormStatus.textContent =
        "Editing existing equipment entry";
    }
    if (this.elements.saveEquipmentButton) {
      this.elements.saveEquipmentButton.textContent = "Update Equipment Entry";
    }
    if (this.elements.equipmentReferencePointPicker) {
      this.elements.equipmentReferencePointPicker.value =
        entry.referencePoint || "";
    }
    this.currentEquipmentLocation = entry.location || null;
    if (this.elements.equipmentLocationStatus && entry.location) {
      this.elements.equipmentLocationStatus.textContent = `Lat ${entry.location.lat.toFixed(
        6
      )}, Lon ${entry.location.lon.toFixed(
        6
      )} (±${entry.location.accuracy.toFixed(1)} m)`;
    } else if (this.elements.equipmentLocationStatus) {
      this.elements.equipmentLocationStatus.textContent = "";
    }
    this.updateEquipmentSaveState();
  }

  deleteEquipmentEntry(id) {
    const project = this.projects[this.currentProjectId];
    if (!project?.equipmentLogs) return;
    if (!confirm("Delete this equipment entry?")) return;
    project.equipmentLogs = project.equipmentLogs.filter(
      (log) => log.id !== id
    );
    this.saveProjects();
    this.renderReferencePointOptions();
    this.renderEquipmentList();
    this.navigationController?.onEquipmentLogsChanged();
    if (this.editingEquipmentId === id) {
      this.resetEquipmentForm();
    }
  }

  exportCornerFiling(entry) {
    if (!entry) return;
    this.clearCpfValidationState();
    const projectName = this.projects[entry.projectId]?.name || "Project";
    const statusLabel = entry.status || "Draft";
    const normalizedStatus = statusLabel.toLowerCase();
    const completeness = this.getCpfCompleteness(entry);
    if (completeness.missing.length) {
      this.switchTab("evidenceSection");
      this.renderCpfValidationCallout(completeness.missing);
      this.highlightMissingCpfFields(completeness.missing);
      return;
    }
    const exportLabel = completeness.complete
      ? this.getExportStatusLabel(statusLabel)
      : this.getExportStatusLabel("in progress");
    const record = this.projects[entry.projectId]?.records?.[entry.recordId];
    const researchRefs = this.researchDocumentService
      .getProjectDocuments(entry.projectId)
      .filter((doc) =>
        doc.linkedEvidence?.some((ev) => (ev.id || ev) === entry.id)
      );
    const html = this.buildCpfLayout(entry, {
      projectName,
      record,
      exportLabel,
      researchRefs,
      normalizedStatus,
      completeness,
    });
    const fileBase = (entry.pointLabel || "corner")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    this.downloadHtml(html, `${fileBase}-cpf.html`);
  }

  buildCpfLayout(entry, options = {}) {
    const {
      projectName,
      record,
      exportLabel,
      researchRefs = [],
      normalizedStatus,
      completeness,
    } = options;
    const headerStatus = exportLabel?.title || "Preliminary — In Progress";
    const showWatermark =
      normalizedStatus !== "final" || !completeness?.complete;
    const statusNote =
      exportLabel?.note || (showWatermark ? "Incomplete — subject to revision." : "");
    const monumentParts = [
      entry.monumentType,
      entry.monumentMaterial,
      entry.monumentSize,
    ]
      .filter(Boolean)
      .map((part) => this.escapeHtml(part))
      .join(" · ");

    const tieRows = (entry.ties || [])
      .map((tie, idx) => {
        const pieces = [
          tie.distance || "",
          tie.bearing || "",
          tie.description || "",
        ]
          .filter(Boolean)
          .map((piece) => this.escapeHtml(piece))
          .join(" · ");
        const photoLabel = tie.photos?.length
          ? `<span class="muted">Photos: ${tie.photos.length}</span>`
          : "";
        return `<tr><td>${idx + 1}</td><td>${pieces || "&nbsp;"}</td><td>${
          this.escapeHtml(tie.occupation || "") || "&nbsp;"
        }</td><td>${photoLabel}</td></tr>`;
      })
      .join("");

    const researchList =
      researchRefs.length > 0
        ? researchRefs
            .map((doc) => {
              const trs = [
                doc.township,
                doc.range,
                doc.sections,
                doc.aliquots,
              ]
                .filter(Boolean)
                .join(" ");
              const docLine = [
                doc.type || "Document",
                doc.classification || "",
              ]
                .filter(Boolean)
                .join(" — ");
              const refLine = [
                doc.jurisdiction,
                doc.instrumentNumber,
                doc.bookPage,
                doc.documentNumber,
              ]
                .filter(Boolean)
                .join(" · ");
              return `<li><strong>${this.escapeHtml(docLine)}</strong><div class="muted">${
                this.escapeHtml(trs || "")
              }</div><div class="muted">${this.escapeHtml(refLine || "")}</div></li>`;
            })
            .join("")
        : '<li class="muted">No linked research documents recorded for this evidence.</li>';

    const recordLine = record
      ? `${record.name || "Record"} (basis: ${
          record.basis || "Not set"
        })`
      : entry.recordName || "Record";

    const watermark = showWatermark
      ? `<div class="watermark">PRELIMINARY — NOT FOR RECORDATION</div>`
      : "";

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Corner Perpetuation and Filing</title>
    <style>
      body { font-family: "Segoe UI", Tahoma, sans-serif; color: #1c1c1c; margin: 32px; line-height: 1.45; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      h2 { margin-top: 22px; font-size: 16px; letter-spacing: 0.2px; }
      .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 18px; margin-top: 10px; }
      .meta div { padding: 6px 8px; background: #f5f7fb; border-radius: 6px; }
      .section { border: 1px solid #d7dce5; border-radius: 8px; padding: 14px 16px; margin-top: 14px; }
      .chip { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #eef2ff; color: #2a3a8f; font-weight: 600; font-size: 12px; }
      .watermark { margin: 10px 0; color: #8c1d18; font-weight: 700; text-transform: uppercase; }
      .table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      .table th, .table td { border: 1px solid #d7dce5; padding: 6px 8px; text-align: left; }
      .signature-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 10px; align-items: stretch; }
      .sig-box { border: 1px dashed #a3a9b8; padding: 12px; min-height: 90px; }
      .seal-box { border: 2px solid #1c1c1c; min-height: 120px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
      .muted { color: #5b6475; font-size: 12px; }
      ul { margin: 6px 0 0 20px; padding: 0; }
      li { margin-bottom: 6px; }
    </style>
  </head>
  <body>
    <h1>Idaho Corner Perpetuation and Filing (CP&F)</h1>
    <div class="chip">${this.escapeHtml(headerStatus)}</div>
    ${watermark}
    ${statusNote ? `<div class="muted">${this.escapeHtml(statusNote)}</div>` : ""}
    <div class="meta">
      <div><strong>Project</strong><br />${this.escapeHtml(projectName || "Project")}</div>
      <div><strong>Traverse / Record</strong><br />${this.escapeHtml(
        recordLine || "Traverse point"
      )}</div>
      <div><strong>Traverse Point</strong><br />${this.escapeHtml(
        entry.pointLabel || "Traverse point"
      )}</div>
      <div><strong>TRS</strong><br />${this.escapeHtml(
        this.buildEvidenceTrs(entry) || "Not set"
      )}</div>
      <div><strong>Status</strong><br />${this.escapeHtml(entry.status || "Draft")}</div>
      <div><strong>Generated</strong><br />${this.escapeHtml(
        new Date(entry.createdAt).toLocaleString()
      )}</div>
    </div>

    <div class="section">
      <h2>Corner Identification</h2>
      <div><strong>Corner Type:</strong> ${this.escapeHtml(entry.cornerType || "")}</div>
      <div><strong>Corner Status:</strong> ${this.escapeHtml(
        entry.cornerStatus || ""
      )}</div>
      <div><strong>Basis of Bearing:</strong> ${this.escapeHtml(
        entry.basisOfBearing || ""
      )}</div>
      <div><strong>Evidence Type:</strong> ${this.escapeHtml(entry.type || "")}</div>
      <div><strong>Condition / Occupation Evidence:</strong> ${this.escapeHtml(
        entry.condition || ""
      )}</div>
      ${entry.coords ? `<div><strong>Coordinates:</strong> Easting ${this.escapeHtml(
        entry.coords.x.toFixed(2)
      )}, Northing ${this.escapeHtml(entry.coords.y.toFixed(2))}</div>` : ""}
      ${entry.location ? `<div><strong>GPS:</strong> Lat ${this.escapeHtml(
        entry.location.lat.toFixed(6)
      )}, Lon ${this.escapeHtml(entry.location.lon.toFixed(6))} (±${this.escapeHtml(
        entry.location.accuracy.toFixed(1)
      )} m)</div>` : ""}
    </div>

    <div class="section">
      <h2>Monument Description</h2>
      <div><strong>Monument:</strong> ${monumentParts || "Not provided"}</div>
      ${entry.notes ? `<div style="margin-top:6px;">${this.escapeHtml(
        entry.notes
      )}</div>` : ""}
    </div>

    <div class="section">
      <h2>Reference Ties</h2>
      <table class="table">
        <thead><tr><th>#</th><th>Reference</th><th>Occupation Evidence</th><th>Photos</th></tr></thead>
        <tbody>${tieRows || '<tr><td colspan="4">No ties recorded.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Cross References</h2>
      <ul>
        <li><strong>Evidence Entry ID:</strong> ${this.escapeHtml(entry.id || "")}</li>
        <li><strong>Traverse / Record set:</strong> ${this.escapeHtml(recordLine || "")}</li>
        <li><strong>Linked research documents:</strong><ul>${researchList}</ul></li>
      </ul>
    </div>

    <div class="section">
      <h2>Surveyor of Record</h2>
      <div class="meta" style="margin-top:0;">
        <div><strong>Name</strong><br />${this.escapeHtml(entry.surveyorName || "")}</div>
        <div><strong>Idaho PLS License</strong><br />${this.escapeHtml(
          entry.surveyorLicense || ""
        )}</div>
        <div><strong>Firm</strong><br />${this.escapeHtml(entry.surveyorFirm || "")}</div>
        <div><strong>Survey Date(s)</strong><br />${this.escapeHtml(
          entry.surveyDates || ""
        )}</div>
        <div><strong>County</strong><br />${this.escapeHtml(entry.surveyCounty || "")}</div>
        <div><strong>Recording Info</strong><br />${this.escapeHtml(
          entry.recordingInfo || ""
        )}</div>
      </div>
      <div class="signature-row">
        <div class="sig-box">
          <strong>Professional Declaration</strong>
          <div class="muted" style="margin-top:6px;">I affirm this work is prepared under my direction, complies with applicable surveying standards and Idaho law, and is suitable for filing or reliance.</div>
          <div style="margin-top:16px;">
            <div>Signature: __________________________</div>
            <div style="margin-top:6px;">Signed date/time: __________________</div>
          </div>
        </div>
        <div class="seal-box">Place Surveyor Seal</div>
      </div>
    </div>
  </body>
</html>`;
  }

  resetEvidenceForm() {
    this.clearCpfValidationState();
    if (this.elements.evidenceType) this.elements.evidenceType.value = "";
    if (this.elements.evidenceTownship) this.elements.evidenceTownship.value = "";
    if (this.elements.evidenceRange) this.elements.evidenceRange.value = "";
    if (this.elements.evidenceSection) this.elements.evidenceSection.value = "";
    if (this.elements.evidenceSectionBreakdown)
      this.elements.evidenceSectionBreakdown.value = "";
    if (this.elements.evidenceCornerType)
      this.elements.evidenceCornerType.value = "";
    if (this.elements.evidenceCornerStatus)
      this.elements.evidenceCornerStatus.value = "";
    if (this.elements.evidenceStatus) this.elements.evidenceStatus.value = "Draft";
    if (this.elements.evidenceCondition)
      this.elements.evidenceCondition.value = "";
    if (this.elements.evidenceBasisOfBearing)
      this.elements.evidenceBasisOfBearing.value = "";
    if (this.elements.evidenceMonumentType)
      this.elements.evidenceMonumentType.value = "";
    if (this.elements.evidenceMonumentMaterial)
      this.elements.evidenceMonumentMaterial.value = "";
    if (this.elements.evidenceMonumentSize)
      this.elements.evidenceMonumentSize.value = "";
    if (this.elements.evidenceSurveyorName)
      this.elements.evidenceSurveyorName.value = "";
    if (this.elements.evidenceSurveyorLicense)
      this.elements.evidenceSurveyorLicense.value = "";
    if (this.elements.evidenceSurveyorFirm)
      this.elements.evidenceSurveyorFirm.value = "";
    if (this.elements.evidenceSurveyDates)
      this.elements.evidenceSurveyDates.value = "";
    if (this.elements.evidenceSurveyCounty)
      this.elements.evidenceSurveyCounty.value = "";
    if (this.elements.evidenceRecordingInfo)
      this.elements.evidenceRecordingInfo.value = "";
    if (this.elements.evidenceNotes) this.elements.evidenceNotes.value = "";
    if (this.elements.evidencePhoto) this.elements.evidencePhoto.value = "";
    if (this.elements.evidenceTiePhotos)
      this.elements.evidenceTiePhotos.value = "";
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

  buildStatusChip(statusLabel = "Draft") {
    const chip = document.createElement("span");
    chip.className = `status-chip ${this.getStatusClass(statusLabel)}`;
    chip.setAttribute("aria-label", statusLabel || "Draft");
    chip.textContent = statusLabel || "Draft";
    return chip;
  }

  saveCurrentRecord() {
    if (!this.currentRecordId) return;
    const record =
      this.projects[this.currentProjectId].records[this.currentRecordId];
    record.startPtNum = this.elements.startPtNum.value.trim();
    record.northing = this.elements.northing.value.trim();
    record.easting = this.elements.easting.value.trim();
    record.elevation = this.elements.elevation.value.trim();
    record.bsAzimuth = this.elements.bsAzimuth.value.trim();
    record.basis = this.elements.basis.value.trim();
    record.firstDist = this.elements.firstDist.value.trim();
    record.status = this.elements.recordStatus?.value || "Draft";

    record.calls = this.serializeCallsFromContainer(this.elements.callsTableBody);

    this.saveProjects();
  }

  deleteCurrentRecord() {
    if (!this.currentRecordId || !confirm("Delete this record?")) return;
    delete this.projects[this.currentProjectId].records[this.currentRecordId];
    this.saveProjects();
    this.currentRecordId = null;
    this.elements.editor.style.display = "none";
    this.appControllers?.traverseSection?.renderRecords();
    this.updateProjectList();
  }

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
    distanceInput.value = distance;
    distanceInput.addEventListener("input", () => {
      this.saveCurrentRecord();
      this.generateCommands();
    });

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
    distTd.appendChild(distanceRow);

    const branchContainer = document.createElement("div");
    branchContainer.className = "branch-container";
    distTd.append(curveRow, branchContainer);

    tr.append(numTd, bearingTd, distTd);
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
          curveTangent
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

  /* ===================== Commands generation ===================== */
  generateCommands() {
    if (!this.currentRecordId) return;
    this.saveCurrentRecord();
    const record =
      this.projects[this.currentProjectId].records[this.currentRecordId];

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

      const geometry = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      const paths = geometry?.paths || [];
      const hasCalls = paths.some((p) => (p.calls || []).length > 0);

      let drawPointsText = "";
      if (!hasCalls) {
        drawPointsText = "(No traverse calls entered)\n";
      } else {
        paths.forEach((path, idx) => {
          if (!path.calls || path.calls.length === 0) return;
          const startLabel = path.startPointNumber ?? record.startPtNum ?? "";
          drawPointsText += `; Path ${idx + 1} from P${startLabel}\n`;
          drawPointsText += "T\n";
          path.calls.forEach((call) => {
            let parsed = null;
            try {
              parsed = this.parseBearing(call.bearing);
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

            if (curveMetrics) {
              const chordBearing =
                this.azimuthToQuadrantBearing(curveMetrics.chordBearingAzimuth) || {};
              const chordBearingLabel = chordBearing.quadrant
                ? `${chordBearing.quadrant}-${chordBearing.formatted}`
                : "";
              drawPointsText += `; Curve ${
                call.curveDirection || ""
              } R=${call.curveRadius || ""} Δ=${curveMetrics.deltaDegrees
                .toFixed(2)
                .replace(/\.00$/, "")}° Arc=${curveMetrics.arcLength
                .toFixed(2)
                .replace(/\.00$/, "")} Ch=${curveMetrics.chordLength
                .toFixed(2)
                .replace(/\.00$/, "")} Tan=${curveMetrics.tangentLength
                .toFixed(2)
                .replace(/\.00$/, "")} CB=${chordBearingLabel}\n`;
            }

            segments.forEach((segment) => {
              const bearing = this.azimuthToQuadrantBearing(segment.azimuth);
              drawPointsText += `${bearing.quadrant}\n`;
              drawPointsText += `${bearing.formatted}\n`;
              drawPointsText += `${segment.distance.toFixed(2)}\n`;
              drawPointsText += "0\n";
            });
          });
          drawPointsText += "E\n\n";
        });
      }
      this.setCommandText("drawPoints", drawPointsText.trimEnd() + "\n");

      let drawLinesText = "";
      if (!hasCalls) {
        drawLinesText = "(No traverse calls entered)\n";
      } else {
        paths.forEach((path, idx) => {
          if (!path.calls || path.calls.length === 0) return;
          const startLabel = path.startPointNumber ?? record.startPtNum ?? "";
          drawLinesText += `; Path ${idx + 1} from P${startLabel}\n`;
          drawLinesText += "L\n";
          drawLinesText += "P\n";
          drawLinesText += `${startLabel}\n`;
          path.calls.forEach((call) => {
            let parsed = null;
            try {
              parsed = this.parseBearing(call.bearing);
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

            if (curveMetrics) {
              const chordBearing =
                this.azimuthToQuadrantBearing(curveMetrics.chordBearingAzimuth) || {};
              const chordBearingLabel = chordBearing.quadrant
                ? `${chordBearing.quadrant}-${chordBearing.formatted}`
                : "";
              drawLinesText += `; Arc ${
                call.curveDirection || ""
              } R=${call.curveRadius || ""} Δ=${curveMetrics.deltaDegrees
                .toFixed(2)
                .replace(/\.00$/, "")}° Arc=${curveMetrics.arcLength
                .toFixed(2)
                .replace(/\.00$/, "")} Ch=${curveMetrics.chordLength
                .toFixed(2)
                .replace(/\.00$/, "")} Tan=${curveMetrics.tangentLength
                .toFixed(2)
                .replace(/\.00$/, "")} CB=${chordBearingLabel}\n`;
            }

            segments.forEach((segment) => {
              const bearing = this.azimuthToQuadrantBearing(segment.azimuth);
              drawLinesText += "D\n";
              drawLinesText += "F\n";
              drawLinesText += `${segment.distance.toFixed(2)}\n`;
              drawLinesText += "A\n";
              drawLinesText += `${bearing.quadrant}\n`;
              drawLinesText += `${bearing.formatted}\n`;
            });
          });
          drawLinesText += "Q\n\n";
        });
      }
      this.setCommandText("drawLines", drawLinesText.trimEnd() + "\n");

      this.drawTraversePreview(this.elements.traverseCanvas, geometry);

      this.updateAllBearingArrows();
      this.appControllers?.traverseSection?.renderRecords();
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
      const geometry = this.computeTraversePointsForRecord(
        this.currentProjectId,
        this.currentRecordId
      );
      this.drawTraversePreview(this.elements.traverseCanvas, geometry);
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
    noneOpt.innerHTML = '<span class="start-option-name">Manual Start</span>';
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
    const record =
      this.projects[this.currentProjectId].records[this.currentRecordId];
    record.startFromRecordId = recordId;
    this.saveProjects();
    this.updateStartFromDropdownUI();
    this.generateCommands();
  }

  /* ===================== Global settings ===================== */
  saveGlobalSettings() {
    this.globalSettings = this.normalizeGlobalSettings(this.globalSettings);
    this.versioningService.touchEntity(this.globalSettings, {
      prefix: "settings",
    });
    this.globalSettingsService.save(this.globalSettings);
    this.scheduleSync();
  }

  ensureDeviceId() {
    const cookieName = "ros-device-id";
    const existing = this.readCookie(cookieName);
    if (existing) return existing;
    const uuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenYearsInSeconds = 60 * 60 * 24 * 365 * 10;
    this.setCookie(cookieName, uuid, { "max-age": tenYearsInSeconds });
    return uuid;
  }

  readCookie(name) {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return decodeURIComponent(cookie.split("=")[1] || "");
      }
    }
    return "";
  }

  setCookie(name, value, options = {}) {
    const pairs = [`${name}=${encodeURIComponent(value)}`];
    const opts = { path: "/", SameSite: "Lax", ...options };
    Object.entries(opts).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      if (val === true) {
        pairs.push(key);
      } else {
        pairs.push(`${key}=${val}`);
      }
    });
    document.cookie = pairs.join("; ");
  }

  getCurrentDeviceProfile() {
    const profiles = this.globalSettings.deviceProfiles || {};
    return profiles[this.deviceId] || null;
  }

  mergeGlobalSettings(incoming = {}) {
    const current = this.normalizeGlobalSettings(this.globalSettings);
    const next = this.normalizeGlobalSettings(incoming);

    return {
      ...current,
      ...next,
      deviceProfiles: this.mergeDeviceProfiles(
        current.deviceProfiles,
        next.deviceProfiles
      ),
      liveLocations: this.mergeLiveLocations(
        current.liveLocations,
        next.liveLocations
      ),
    };
  }

  mergeDeviceProfiles(current = {}, incoming = {}) {
    const merged = { ...incoming };

    Object.entries(current || {}).forEach(([deviceId, profile]) => {
      const incomingProfile = incoming[deviceId];
      if (!incomingProfile) {
        merged[deviceId] = profile;
        return;
      }

      const currentAssigned = new Date(profile.assignedAt || 0).getTime();
      const incomingAssigned = new Date(
        incomingProfile.assignedAt || 0
      ).getTime();

      merged[deviceId] =
        currentAssigned >= incomingAssigned
          ? { ...incomingProfile, ...profile }
          : { ...profile, ...incomingProfile };
    });

    return merged;
  }

  mergeLiveLocations(current = {}, incoming = {}) {
    const merged = { ...incoming };

    Object.entries(current || {}).forEach(([deviceId, location]) => {
      const incomingLocation = incoming[deviceId];
      if (!incomingLocation) {
        merged[deviceId] = location;
        return;
      }

      const currentUpdated = new Date(location.updatedAt || 0).getTime();
      const incomingUpdated = new Date(incomingLocation.updatedAt || 0).getTime();

      merged[deviceId] =
        currentUpdated >= incomingUpdated
          ? { ...incomingLocation, ...location }
          : { ...location, ...incomingLocation };
    });

    return merged;
  }

  captureFocusState() {
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) return null;

    const selection =
      typeof active.selectionStart === "number"
        ? { start: active.selectionStart, end: active.selectionEnd }
        : null;

    const callRow = active.closest("tr.call-row");
    if (callRow && active.classList.length) {
      return {
        type: "call",
        callLabel: callRow.dataset.callLabel || "",
        fieldClass: active.classList[0],
        selection,
      };
    }

    return {
      type: "generic",
      id: active.id || "",
      name: active.name || "",
      selection,
    };
  }

  restoreFocusState(state) {
    if (!state) return false;

    const escapeValue = (val = "") => {
      if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(val);
      }
      return val.replace(/"/g, '\\"');
    };

    let target = null;
    if (state.type === "call" && state.callLabel && state.fieldClass) {
      const selector = `tr.call-row[data-call-label="${escapeValue(
        state.callLabel
      )}"] .${escapeValue(state.fieldClass)}`;
      target = document.querySelector(selector);
    }

    if (!target && state.id) {
      target = document.getElementById(state.id);
    }
    if (!target && state.name) {
      target = document.querySelector(`[name="${escapeValue(state.name)}"]`);
    }

    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
      if (
        state.selection &&
        typeof target.selectionStart === "number" &&
        typeof target.setSelectionRange === "function"
      ) {
        const start = state.selection.start ?? 0;
        const end = state.selection.end ?? start;
        target.setSelectionRange(start, end);
      }
      return true;
    }

    return false;
  }

  setDeviceTeamMember(name) {
    if (!this.deviceId) return;
    const trimmed = (name || "").trim();
    const profiles = this.globalSettings.deviceProfiles || {};

    if (!trimmed) {
      delete profiles[this.deviceId];
    } else {
      profiles[this.deviceId] = {
        ...(profiles[this.deviceId] || {}),
        teamMember: trimmed,
        assignedAt: new Date().toISOString(),
      };
    }

    this.globalSettings.deviceProfiles = profiles;
    if (this.globalSettings.liveLocations?.[this.deviceId]) {
      this.globalSettings.liveLocations[this.deviceId].teamMember =
        trimmed || undefined;
    }
    this.saveGlobalSettings();
    this.renderDeviceIdentityOptions();
    this.navigationController?.drawCompass();
  }

  renderDeviceIdentityOptions() {
    const select = this.elements.deviceTeamMemberSelect;
    const hint = this.elements.deviceIdentifierHint;
    const memberNames = this.getActiveTeamMembers()
      .map((entry) => entry.name)
      .filter(Boolean);
    const currentProfile = this.getCurrentDeviceProfile();
    const selectedMember = currentProfile?.teamMember || "";

    if (hint) {
      hint.textContent = this.deviceId
        ? `Device ID: ${this.deviceId}`
        : "Device ID unavailable";
    }

    if (!select) return;

    const previousValue = select.value;
    const placeholderText =
      memberNames.length > 0
        ? "Select team member"
        : "Add team members to assign";

    const desiredOptions = [
      "",
      ...memberNames
        .slice()
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    ];

    const fallbackValue = selectedMember || previousValue;
    if (fallbackValue && !desiredOptions.includes(fallbackValue)) {
      desiredOptions.push(fallbackValue);
    }

    const currentOptions = Array.from(select.options).map((opt) => opt.value);
    const placeholderMatches =
      select.options[0]?.textContent === placeholderText || !select.options.length;
    const optionsMatch =
      currentOptions.length === desiredOptions.length &&
      currentOptions.every((val, idx) => val === desiredOptions[idx]);

    if (optionsMatch && placeholderMatches && select.value === fallbackValue) {
      return;
    }

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderText;
    select.appendChild(placeholder);

    desiredOptions.slice(1).forEach((member) => {
      const opt = document.createElement("option");
      opt.value = member;
      opt.textContent = member;
      select.appendChild(opt);
    });

    if (fallbackValue) {
      select.value = fallbackValue;
      if (select.value !== fallbackValue) {
        const fallback = document.createElement("option");
        fallback.value = fallbackValue;
        fallback.textContent = fallbackValue;
        select.appendChild(fallback);
        select.value = fallbackValue;
      }
    }
  }

  recordLiveLocation(coords) {
    if (!coords || typeof coords.lat !== "number" || typeof coords.lon !== "number") {
      return;
    }

    const liveLocations = this.globalSettings.liveLocations || {};
    const profile = this.getCurrentDeviceProfile();
    const timestamp = new Date(coords.timestamp || Date.now()).toISOString();

    liveLocations[this.deviceId] = {
      ...liveLocations[this.deviceId],
      lat: coords.lat,
      lon: coords.lon,
      accuracy: coords.accuracy,
      updatedAt: timestamp,
      deviceId: this.deviceId,
      teamMember: profile?.teamMember,
    };

    this.globalSettings.liveLocations = liveLocations;
    this.saveGlobalSettings();
    this.navigationController?.drawCompass();
  }

  getPeerLocations() {
    const locations = this.globalSettings.liveLocations || {};
    const profiles = this.globalSettings.deviceProfiles || {};
    const maxAgeMs = 5 * 60 * 1000;
    const now = Date.now();

    return Object.entries(locations)
      .filter(([, loc]) => loc && typeof loc.lat === "number" && typeof loc.lon === "number")
      .map(([deviceId, loc]) => ({
        id: deviceId,
        lat: loc.lat,
        lon: loc.lon,
        accuracy: loc.accuracy,
        updatedAt: loc.updatedAt,
        teamMember: loc.teamMember || profiles[deviceId]?.teamMember,
      }))
      .filter((loc) => {
        const updatedAt = new Date(loc.updatedAt || 0).getTime();
        if (!Number.isFinite(updatedAt)) return false;
        return now - updatedAt <= maxAgeMs;
      });
  }

  getActiveEquipment() {
    return (this.globalSettings.equipment || []).filter(
      (item) => item && !item.archived
    );
  }

  getActiveTeamMembers() {
    return (this.globalSettings.teamMembers || []).filter(
      (item) => item && !item.archived
    );
  }

  saveEquipment() {
    const name = (this.elements.equipmentNameInput?.value || "").trim();
    const make = (this.elements.equipmentMakeInput?.value || "").trim();
    const model = (this.elements.equipmentModelInput?.value || "").trim();
    const manualUrl = (this.elements.equipmentManualInput?.value || "").trim();
    const notes = (this.elements.equipmentNotesInput?.value || "").trim();
    if (!name) return;

    const entry = this.normalizeEquipmentEntry({
      id: this.editingEquipmentId || undefined,
      name,
      make,
      model,
      manualUrl,
      notes,
      archived: false,
    });
    const existingIndex = (this.globalSettings.equipment || []).findIndex(
      (item) => item.id === entry.id
    );
    if (existingIndex >= 0) {
      this.globalSettings.equipment.splice(existingIndex, 1, entry);
    } else {
      this.globalSettings.equipment.push(entry);
    }
    this.saveGlobalSettings();
    this.resetEquipmentForm();
    this.renderGlobalSettings();
  }

  resetEquipmentForm() {
    if (this.elements.equipmentNameInput) this.elements.equipmentNameInput.value = "";
    if (this.elements.equipmentMakeInput) this.elements.equipmentMakeInput.value = "";
    if (this.elements.equipmentModelInput) this.elements.equipmentModelInput.value = "";
    if (this.elements.equipmentManualInput)
      this.elements.equipmentManualInput.value = "";
    if (this.elements.equipmentNotesInput) this.elements.equipmentNotesInput.value = "";
    this.editingEquipmentId = null;
    if (this.elements.equipmentEditHint) this.elements.equipmentEditHint.textContent = "";
  }

  startEditEquipment(id) {
    const entry = (this.globalSettings.equipment || []).find((item) => item.id === id);
    if (!entry) return;
    this.editingEquipmentId = id;
    if (this.elements.equipmentNameInput) this.elements.equipmentNameInput.value = entry.name || "";
    if (this.elements.equipmentMakeInput) this.elements.equipmentMakeInput.value = entry.make || "";
    if (this.elements.equipmentModelInput) this.elements.equipmentModelInput.value = entry.model || "";
    if (this.elements.equipmentManualInput)
      this.elements.equipmentManualInput.value = entry.manualUrl || "";
    if (this.elements.equipmentNotesInput) this.elements.equipmentNotesInput.value = entry.notes || "";
    if (this.elements.equipmentEditHint)
      this.elements.equipmentEditHint.textContent = "Editing existing equipment";
  }

  toggleEquipmentArchive(id) {
    const entry = (this.globalSettings.equipment || []).find((item) => item.id === id);
    if (!entry) return;
    entry.archived = !entry.archived;
    if (this.editingEquipmentId === id && entry.archived) {
      this.resetEquipmentForm();
    }
    this.saveGlobalSettings();
    this.renderGlobalSettings();
  }

  saveTeamMember() {
    const name = (this.elements.teamMemberInput?.value || "").trim();
    const role = (this.elements.teamMemberRoleInput?.value || "").trim();
    const title = (this.elements.teamMemberTitleInput?.value || "").trim();
    const phone = (this.elements.teamMemberPhoneInput?.value || "").trim();
    const email = (this.elements.teamMemberEmailInput?.value || "").trim();
    if (!name) return;

    const entry = this.normalizeTeamMember({
      id: this.editingTeamMemberId || undefined,
      name,
      role,
      title,
      phone,
      email,
      archived: false,
    });
    const existingIndex = (this.globalSettings.teamMembers || []).findIndex(
      (item) => item.id === entry.id
    );
    if (existingIndex >= 0) {
      this.globalSettings.teamMembers.splice(existingIndex, 1, entry);
    } else {
      this.globalSettings.teamMembers.push(entry);
    }
    this.saveGlobalSettings();
    this.resetTeamMemberForm();
    this.renderGlobalSettings();
  }

  resetTeamMemberForm() {
    if (this.elements.teamMemberInput) this.elements.teamMemberInput.value = "";
    if (this.elements.teamMemberRoleInput) this.elements.teamMemberRoleInput.value = "";
    if (this.elements.teamMemberTitleInput) this.elements.teamMemberTitleInput.value = "";
    if (this.elements.teamMemberPhoneInput) this.elements.teamMemberPhoneInput.value = "";
    if (this.elements.teamMemberEmailInput) this.elements.teamMemberEmailInput.value = "";
    this.editingTeamMemberId = null;
    if (this.elements.teamMemberEditHint) this.elements.teamMemberEditHint.textContent = "";
  }

  startEditTeamMember(id) {
    const entry = (this.globalSettings.teamMembers || []).find((item) => item.id === id);
    if (!entry) return;
    this.editingTeamMemberId = id;
    if (this.elements.teamMemberInput) this.elements.teamMemberInput.value = entry.name || "";
    if (this.elements.teamMemberRoleInput) this.elements.teamMemberRoleInput.value = entry.role || "";
    if (this.elements.teamMemberTitleInput) this.elements.teamMemberTitleInput.value = entry.title || "";
    if (this.elements.teamMemberPhoneInput) this.elements.teamMemberPhoneInput.value = entry.phone || "";
    if (this.elements.teamMemberEmailInput) this.elements.teamMemberEmailInput.value = entry.email || "";
    if (this.elements.teamMemberEditHint)
      this.elements.teamMemberEditHint.textContent = "Editing team member";
  }

  toggleTeamMemberArchive(id) {
    const entry = (this.globalSettings.teamMembers || []).find((item) => item.id === id);
    if (!entry) return;
    entry.archived = !entry.archived;
    if (this.editingTeamMemberId === id && entry.archived) {
      this.resetTeamMemberForm();
    }
    this.saveGlobalSettings();
    this.renderGlobalSettings();
  }

  savePointCode() {
    const code = (this.elements.pointCodeInput?.value || "").trim();
    const desc = (this.elements.pointCodeDescriptionInput?.value || "").trim();
    if (!code && !desc) return;
    const entry = this.normalizePointCode({
      id: this.editingPointCodeId || undefined,
      code,
      description: desc,
      archived: false,
    });
    const existingIndex = (this.globalSettings.pointCodes || []).findIndex(
      (row) => row.id === entry.id
    );
    if (existingIndex >= 0) {
      this.globalSettings.pointCodes.splice(existingIndex, 1, entry);
    } else {
      this.globalSettings.pointCodes.push(entry);
    }
    this.saveGlobalSettings();
    this.resetPointCodeForm();
    this.renderGlobalSettings();
  }

  resetPointCodeForm() {
    if (this.elements.pointCodeInput) this.elements.pointCodeInput.value = "";
    if (this.elements.pointCodeDescriptionInput)
      this.elements.pointCodeDescriptionInput.value = "";
    this.editingPointCodeId = null;
    if (this.elements.pointCodeEditHint) this.elements.pointCodeEditHint.textContent = "";
  }

  startEditPointCode(id) {
    const entry = (this.globalSettings.pointCodes || []).find((row) => row.id === id);
    if (!entry) return;
    this.editingPointCodeId = id;
    if (this.elements.pointCodeInput) this.elements.pointCodeInput.value = entry.code || "";
    if (this.elements.pointCodeDescriptionInput)
      this.elements.pointCodeDescriptionInput.value = entry.description || "";
    if (this.elements.pointCodeEditHint)
      this.elements.pointCodeEditHint.textContent = "Editing point code";
  }

  togglePointCodeArchive(id) {
    const entry = (this.globalSettings.pointCodes || []).find((row) => row.id === id);
    if (!entry) return;
    entry.archived = !entry.archived;
    if (this.editingPointCodeId === id && entry.archived) {
      this.resetPointCodeForm();
    }
    this.saveGlobalSettings();
    this.renderGlobalSettings();
  }

  renderGlobalSettings() {
    this.renderDeviceIdentityOptions();
    this.renderPointCodes();
    this.renderEquipmentRows();
    this.renderTeamMemberRows();
    this.renderEquipmentSetupByOptions();
    this.renderEquipmentPickerOptions();
  }

  renderPointCodes() {
    const tbody = this.elements.pointCodeTableBody;
    if (!tbody) return;
    tbody.innerHTML = "";
    (this.globalSettings.pointCodes || []).forEach((row) => {
      const tr = document.createElement("tr");
      if (row.archived) {
        tr.style.opacity = 0.6;
      }
      const codeCell = document.createElement("td");
      codeCell.textContent = row.code;
      const descCell = document.createElement("td");
      descCell.textContent = row.description;
      const statusCell = document.createElement("td");
      statusCell.textContent = row.archived ? "Archived" : "Active";
      const actionsCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => this.startEditPointCode(row.id));
      const archiveButton = document.createElement("button");
      archiveButton.textContent = row.archived ? "Restore" : "Archive";
      archiveButton.addEventListener("click", () => this.togglePointCodeArchive(row.id));
      actionsCell.appendChild(editButton);
      actionsCell.appendChild(archiveButton);

      tr.appendChild(codeCell);
      tr.appendChild(descCell);
      tr.appendChild(statusCell);
      tr.appendChild(actionsCell);
      tbody.appendChild(tr);
    });
  }

  renderEquipmentRows() {
    const tbody = this.elements.equipmentTableBody;
    if (!tbody) return;
    tbody.innerHTML = "";
    (this.globalSettings.equipment || []).forEach((entry) => {
      const tr = document.createElement("tr");
      if (entry.archived) tr.style.opacity = 0.6;
      const nameCell = document.createElement("td");
      nameCell.textContent = entry.name;
      const makeModelCell = document.createElement("td");
      makeModelCell.textContent = [entry.make, entry.model].filter(Boolean).join(" ");
      const manualCell = document.createElement("td");
      if (entry.manualUrl) {
        const link = document.createElement("a");
        link.href = entry.manualUrl;
        link.textContent = "Manual";
        link.target = "_blank";
        manualCell.appendChild(link);
      }
      const notesCell = document.createElement("td");
      notesCell.textContent = entry.notes || "";
      const statusCell = document.createElement("td");
      statusCell.textContent = entry.archived ? "Archived" : "Active";
      const actionsCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => this.startEditEquipment(entry.id));
      const archiveButton = document.createElement("button");
      archiveButton.textContent = entry.archived ? "Restore" : "Archive";
      archiveButton.addEventListener("click", () => this.toggleEquipmentArchive(entry.id));
      actionsCell.appendChild(editButton);
      actionsCell.appendChild(archiveButton);
      tr.appendChild(nameCell);
      tr.appendChild(makeModelCell);
      tr.appendChild(manualCell);
      tr.appendChild(notesCell);
      tr.appendChild(statusCell);
      tr.appendChild(actionsCell);
      tbody.appendChild(tr);
    });
  }

  renderTeamMemberRows() {
    const tbody = this.elements.teamMemberTableBody;
    if (!tbody) return;
    tbody.innerHTML = "";
    (this.globalSettings.teamMembers || []).forEach((entry) => {
      const tr = document.createElement("tr");
      if (entry.archived) tr.style.opacity = 0.6;
      const nameCell = document.createElement("td");
      nameCell.textContent = entry.name;
      const roleCell = document.createElement("td");
      roleCell.textContent = [entry.role, entry.title].filter(Boolean).join(" • ");
      const contactCell = document.createElement("td");
      contactCell.textContent = [entry.phone, entry.email].filter(Boolean).join(" | ");
      const statusCell = document.createElement("td");
      statusCell.textContent = entry.archived ? "Archived" : "Active";
      const actionsCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => this.startEditTeamMember(entry.id));
      const archiveButton = document.createElement("button");
      archiveButton.textContent = entry.archived ? "Restore" : "Archive";
      archiveButton.addEventListener("click", () => this.toggleTeamMemberArchive(entry.id));
      actionsCell.appendChild(editButton);
      actionsCell.appendChild(archiveButton);
      tr.appendChild(nameCell);
      tr.appendChild(roleCell);
      tr.appendChild(contactCell);
      tr.appendChild(statusCell);
      tr.appendChild(actionsCell);
      tbody.appendChild(tr);
    });
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
