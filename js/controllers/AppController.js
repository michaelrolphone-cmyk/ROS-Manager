import ProjectRepository from "../services/ProjectRepository.js";
import Project from "../models/Project.js";
import SurveyRecord from "../models/SurveyRecord.js";
import TraverseInstruction from "../models/TraverseInstruction.js";
import CornerEvidence from "../models/CornerEvidence.js";
import EvidenceTie from "../models/EvidenceTie.js";
import CornerEvidenceService from "../services/CornerEvidenceService.js";
import ResearchDocumentService from "../services/ResearchDocumentService.js";
import Point from "../models/Point.js";
import PointController from "./PointController.js";
import NavigationController from "./NavigationController.js";
import LevelingController from "./LevelingController.js";
import GlobalSettingsService from "../services/GlobalSettingsService.js";
import VersioningService from "../services/VersioningService.js";
import SyncService from "../services/SyncService.js";
import AuditTrailService from "../services/AuditTrailService.js";
import RollingBackupService from "../services/RollingBackupService.js";

import MiscHelpersMixin from "./app/MiscHelpersMixin.js";
import GlobalSettingsMixin from "./app/GlobalSettingsMixin.js";
import DropdownsMixin from "./app/DropdownsMixin.js";
import CommandsGenerationMixin from "./app/CommandsGenerationMixin.js";
import TraverseGeometryMixin from "./app/TraverseGeometryMixin.js";
import CallsBearingsMixin from "./app/CallsBearingsMixin.js";
import EquipmentSetupMixin from "./app/EquipmentSetupMixin.js";
import ResearchDocumentationMixin from "./app/ResearchDocumentationMixin.js";
import EvidenceLoggerMixin from "./app/EvidenceLoggerMixin.js";
import ProjectsRecordsMixin from "./app/ProjectsRecordsMixin.js";
import ExportImportMixin from "./app/ExportImportMixin.js";

class AppControllerBase {
  constructor() {
    this.STORAGE_KEY = "carlsonSurveyProjects";
    this.repository = new ProjectRepository(this.STORAGE_KEY);
    this.globalSettingsService = new GlobalSettingsService(
      "carlsonGlobalSettings"
    );
    this.versioningService = new VersioningService();
    this.syncService = new SyncService();
    this.auditTrailService = new AuditTrailService();
    this.rollingBackupService = new RollingBackupService();
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
    this.currentEvidencePhotoAnnotations = [];
    this.currentEvidencePhotoMetadata = null;
    this.currentEvidenceLocation = null;
    this.currentEvidenceAssociatedTrs = [];
    this.currentEvidenceTies = [];
    this.editingEvidenceId = null;
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
      getProfessionalProfile: () => this.getProfessionalProfile(),
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
      projectSectionQuadrant: document.getElementById("projectSectionQuadrant"),
      projectAliquot1: document.getElementById("projectAliquot1"),
      projectAliquot2: document.getElementById("projectAliquot2"),
      projectAliquot3: document.getElementById("projectAliquot3"),
      projectPlatBook: document.getElementById("projectPlatBook"),
      projectPlatPageStart: document.getElementById("projectPlatPageStart"),
      projectPlatPageEnd: document.getElementById("projectPlatPageEnd"),
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
      springboardProjectName: document.getElementById("springboardProjectName"),
      springboardProjectIndex: document.getElementById("springboardProjectIndex"),
      springboardProjectDescription: document.getElementById(
        "springboardProjectDescription"
      ),
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
      exportStatusHealthyMessage: document.getElementById(
        "exportStatusHealthyMessage"
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
      expectedToClose: document.getElementById("expectedToClose"),
      closurePointNumber: document.getElementById("closurePointNumber"),
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
      closureStatusChip: document.getElementById("closureStatusChip"),
      closurePointLabel: document.getElementById("closurePointLabel"),
      closureLinear: document.getElementById("closureLinear"),
      closureAngular: document.getElementById("closureAngular"),
      closureDirection: document.getElementById("closureDirection"),
      closureRatio: document.getElementById("closureRatio"),
      generateCommandsButton: document.getElementById("generateCommandsButton"),
      deleteRecordButton: document.getElementById("deleteRecordButton"),
      cancelProjectButton: document.getElementById("cancelProjectButton"),
      traverseTabButton: document.getElementById("traverseTabButton"),
      pointsTabButton: document.getElementById("pointsTabButton"),
      evidenceTabButton: document.getElementById("evidenceTabButton"),
      equipmentTabButton: document.getElementById("equipmentTabButton"),
      stakeoutTabButton: document.getElementById("stakeoutTabButton"),
      levelingSection: document.getElementById("levelingSection"),
      springboardSection: document.getElementById("springboardSection"),
      vicinityMapSection: document.getElementById("vicinityMapSection"),
      springboardGrid: document.querySelector(".springboard-grid"),
      navigationSection: document.getElementById("navigationSection"),
      traverseSection: document.getElementById("traverseSection"),
      pointsSection: document.getElementById("pointsSection"),
      settingsSection: document.getElementById("settingsSection"),
      evidenceSection: document.getElementById("evidenceSection"),
      exportsSection: document.getElementById("exportsSection"),
      chainEvidenceSection: document.getElementById("chainEvidenceSection"),
      equipmentSection: document.getElementById("equipmentSection"),
      stakeoutSection: document.getElementById("stakeoutSection"),
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
      additionalTrsTownship: document.getElementById(
        "additionalTrsTownship"
      ),
      additionalTrsRange: document.getElementById("additionalTrsRange"),
      additionalTrsSection: document.getElementById("additionalTrsSection"),
      additionalTrsBreakdown: document.getElementById(
        "additionalTrsBreakdown"
      ),
      addTrsAssociation: document.getElementById("addTrsAssociation"),
      associatedTrsList: document.getElementById("associatedTrsList"),
      associatedTrsHint: document.getElementById("associatedTrsHint"),
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
      evidencePhotoPreview: document.getElementById("evidencePhotoPreview"),
      evidenceAnnotationCanvas: document.getElementById(
        "evidenceAnnotationCanvas"
      ),
      evidenceAnnotationModeButtons: document.querySelectorAll(
        "[data-annotation-mode]"
      ),
      evidenceAnnotationClear: document.getElementById("evidenceAnnotationClear"),
      evidencePhotoMetadataNote: document.getElementById(
        "evidencePhotoMetadataNote"
      ),
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
      stakeoutDatetime: document.getElementById("stakeoutDatetime"),
      stakeoutMonumentType: document.getElementById("stakeoutMonumentType"),
      stakeoutMonumentMaterial: document.getElementById("stakeoutMonumentMaterial"),
      stakeoutWitnessMarks: document.getElementById("stakeoutWitnessMarks"),
      stakeoutDigNotes: document.getElementById("stakeoutDigNotes"),
      stakeoutCrewMembers: document.getElementById("stakeoutCrewMembers"),
      stakeoutEquipmentUsed: document.getElementById("stakeoutEquipmentUsed"),
      stakeoutTraverseSelect: document.getElementById("stakeoutTraverseSelect"),
      stakeoutEvidenceSelect: document.getElementById("stakeoutEvidenceSelect"),
      stakeoutControlPoints: document.getElementById("stakeoutControlPoints"),
      saveStakeoutButton: document.getElementById("saveStakeoutButton"),
      resetStakeoutButton: document.getElementById("resetStakeoutButton"),
      stakeoutFormStatus: document.getElementById("stakeoutFormStatus"),
      stakeoutList: document.getElementById("stakeoutList"),
      stakeoutSummary: document.getElementById("stakeoutSummary"),
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
      pointCodeKindSelect: document.getElementById("pointCodeKindSelect"),
      savePointCodeButton: document.getElementById("savePointCodeButton"),
      resetPointCodeButton: document.getElementById("resetPointCodeButton"),
      pointCodeEditHint: document.getElementById("pointCodeEditHint"),
      pointCodeTableBody: document.getElementById("pointCodeTableBody"),
      exportAllDataButton: document.getElementById("exportAllDataButton"),
      importAllDataButton: document.getElementById("importAllDataButton"),
      enableRollingBackups: document.getElementById("enableRollingBackups"),
      backupFilenamePrefix: document.getElementById("backupFilenamePrefix"),
      rollingBackupHint: document.getElementById("rollingBackupHint"),
      rollingBackupList: document.getElementById("rollingBackupList"),
      refreshBackupList: document.getElementById("refreshBackupList"),
      clearProjectBackups: document.getElementById("clearProjectBackups"),
      professionalSurveyorName: document.getElementById(
        "professionalSurveyorName"
      ),
      professionalLicense: document.getElementById("professionalLicense"),
      professionalFirm: document.getElementById("professionalFirm"),
      professionalContactPhone: document.getElementById(
        "professionalContactPhone"
      ),
      professionalContactEmail: document.getElementById(
        "professionalContactEmail"
      ),
      professionalCounty: document.getElementById("professionalCounty"),
      saveProfessionalProfileButton: document.getElementById(
        "saveProfessionalProfileButton"
      ),
      resetProfessionalProfileButton: document.getElementById(
        "resetProfessionalProfileButton"
      ),
      professionalProfileStatus: document.getElementById(
        "professionalProfileStatus"
      ),
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
      smartPackExportButton: document.getElementById("smartPackExportButton"),
      smartPackJsonButton: document.getElementById("smartPackJsonButton"),
      smartPackStatusValue: document.getElementById("smartPackStatusValue"),
      smartPackStatusNote: document.getElementById("smartPackStatusNote"),
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
    this.elements.smartPackExportButton?.addEventListener("click", () =>
      this.exportSmartPackHtml()
    );
    this.elements.smartPackJsonButton?.addEventListener("click", () =>
      this.exportSmartPackJson()
    );
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
    this.elements.enableRollingBackups?.addEventListener("change", (e) =>
      this.toggleRollingBackups(e.target.checked)
    );
    this.elements.backupFilenamePrefix?.addEventListener("change", (e) =>
      this.updateRollingBackupPrefix(e.target.value)
    );
    this.elements.refreshBackupList?.addEventListener("click", () =>
      this.renderRollingBackupList()
    );
    this.elements.saveProfessionalProfileButton?.addEventListener(
      "click",
      () => this.saveProfessionalProfile()
    );
    this.elements.resetProfessionalProfileButton?.addEventListener(
      "click",
      () => this.resetProfessionalProfileForm()
    );
    this.elements.clearProjectBackups?.addEventListener("click", () =>
      this.clearRollingBackupsForProject()
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

    [
      this.elements.basis,
      this.elements.firstDist,
      this.elements.closurePointNumber,
    ].forEach((el) => {
      el?.addEventListener("input", () => {
        this.saveCurrentRecord();
        this.generateCommands();
      });
    });

    this.elements.expectedToClose?.addEventListener("change", () => {
      this.saveCurrentRecord();
      this.renderClosureSummary();
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

    this.elements.addTrsAssociation?.addEventListener("click", () =>
      this.addAssociatedTrs()
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

    this.elements.evidenceAnnotationModeButtons?.forEach((btn) =>
      btn.addEventListener("click", () =>
        this.setAnnotationMode(btn.dataset.annotationMode)
      )
    );
    this.elements.evidenceAnnotationCanvas?.addEventListener("click", (evt) =>
      this.handleAnnotationCanvasClick(evt)
    );
    this.elements.evidenceAnnotationClear?.addEventListener("click", () =>
      this.clearEvidenceAnnotations()
    );

    this.elements.captureLocation?.addEventListener("click", () =>
      this.captureEvidenceLocation()
    );

    this.elements.saveEvidenceButton?.addEventListener("click", () =>
      this.saveEvidenceEntry()
    );

    this.elements.resetEvidenceButton?.addEventListener("click", () =>
      this.resetEvidenceForm()
    );

    this.elements.cpfValidationStatus?.addEventListener("click", (evt) => {
      const target = evt.target.closest("[data-cpf-field]");
      if (!target) return;
      evt.preventDefault();
      this.focusCpfField(target.dataset.cpfField);
    });

    this.elements.saveQcSettingsButton?.addEventListener("click", () =>
      this.saveQcSettings()
    );
    this.elements.exportQcSummaryButton?.addEventListener("click", () =>
      this.exportQualityControlSummary()
    );

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
    this.appControllers?.helpSection?.loadHelpDocument?.();
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
        kind: "point",
        archived: false,
      };
    }
    const code = (entry.code || "").trim();
    const description = entry.description || "";
    const kind = (entry.kind || "point").toLowerCase() === "line"
      ? "line"
      : "point";
    if (!code && !description) return null;
    return {
      id: entry.id || this.generateId("pc"),
      code,
      description,
      kind,
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
          ? this.globalSettingsService.pruneLiveLocations(settings.liveLocations)
          : {},
      backupSettings:
        settings.backupSettings && typeof settings.backupSettings === "object"
          ? {
              rollingBackupsEnabled: Boolean(
                settings.backupSettings.rollingBackupsEnabled
              ),
              filenamePrefix:
                settings.backupSettings.filenamePrefix || "carlson-backup",
              maxCopies:
                Number(settings.backupSettings.maxCopies) > 0
                  ? Number(settings.backupSettings.maxCopies)
                  : 3,
            }
          : this.globalSettingsService.defaultSettings().backupSettings,
      professionalProfile:
        settings.professionalProfile &&
        typeof settings.professionalProfile === "object"
          ? {
              surveyorName: settings.professionalProfile.surveyorName || "",
              licenseNumber: settings.professionalProfile.licenseNumber || "",
              firmName: settings.professionalProfile.firmName || "",
              contactPhone: settings.professionalProfile.contactPhone || "",
              contactEmail: settings.professionalProfile.contactEmail || "",
              county: settings.professionalProfile.county || "",
            }
          : {
              surveyorName: "",
              licenseNumber: "",
              firmName: "",
              contactPhone: "",
              contactEmail: "",
              county: "",
            },
    };
    return { ...settings, ...sanitized };
  }

}

const AppControllerWithMixins = MiscHelpersMixin(
  GlobalSettingsMixin(
    DropdownsMixin(
      CommandsGenerationMixin(
        TraverseGeometryMixin(
          CallsBearingsMixin(
            EquipmentSetupMixin(
              ResearchDocumentationMixin(
                EvidenceLoggerMixin(
                  ProjectsRecordsMixin(
                    ExportImportMixin(AppControllerBase)
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

export default class AppController extends AppControllerWithMixins {}
