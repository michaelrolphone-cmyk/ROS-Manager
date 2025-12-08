const GlobalSettingsMixin = (Base) =>
  class extends Base {
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
    const kind = this.elements.pointCodeKindSelect?.value || "point";
    if (!code && !desc) return;
    const entry = this.normalizePointCode({
      id: this.editingPointCodeId || undefined,
      code,
      description: desc,
      kind,
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
    if (this.elements.pointCodeKindSelect) this.elements.pointCodeKindSelect.value = "point";
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
    if (this.elements.pointCodeKindSelect)
      this.elements.pointCodeKindSelect.value = entry.kind || "point";
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
    this.refreshCallCodeOptions?.();
    this.renderEquipmentRows();
    this.renderTeamMemberRows();
    this.renderEquipmentSetupByOptions();
    this.renderEquipmentPickerOptions();
    this.renderRollingBackupControls();
    this.renderProfessionalProfile();
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
      const kindCell = document.createElement("td");
      kindCell.textContent = row.kind === "line" ? "Line" : "Point";
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
      tr.appendChild(kindCell);
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

  renderRollingBackupControls() {
    const prefs = this.globalSettings.backupSettings || {};
    if (this.elements.enableRollingBackups)
      this.elements.enableRollingBackups.checked = Boolean(
        prefs.rollingBackupsEnabled
      );
    if (this.elements.backupFilenamePrefix)
      this.elements.backupFilenamePrefix.value =
        prefs.filenamePrefix || "carlson-backup";

    if (this.elements.rollingBackupHint) {
      this.elements.rollingBackupHint.textContent = prefs.rollingBackupsEnabled
        ? "Rolling backups are enabled. Exports will also save the last three copies locally."
        : "Rolling backups are disabled.";
    }

    this.renderRollingBackupList();
  }

  sanitizeProfessionalProfile(profile = {}) {
    return {
      surveyorName: profile.surveyorName?.trim() || "",
      licenseNumber: profile.licenseNumber?.trim() || "",
      firmName: profile.firmName?.trim() || "",
      contactPhone: profile.contactPhone?.trim() || "",
      contactEmail: profile.contactEmail?.trim() || "",
      county: profile.county?.trim() || "",
    };
  }

  getProfessionalProfile() {
    return this.sanitizeProfessionalProfile(
      this.globalSettings.professionalProfile || {}
    );
  }

  saveProfessionalProfile() {
    const profile = this.sanitizeProfessionalProfile({
      surveyorName: this.elements.professionalSurveyorName?.value,
      licenseNumber: this.elements.professionalLicense?.value,
      firmName: this.elements.professionalFirm?.value,
      contactPhone: this.elements.professionalContactPhone?.value,
      contactEmail: this.elements.professionalContactEmail?.value,
      county: this.elements.professionalCounty?.value,
    });
    this.globalSettings.professionalProfile = profile;
    this.saveGlobalSettings();
    if (this.elements.professionalProfileStatus) {
      this.elements.professionalProfileStatus.textContent =
        "Professional profile saved";
      setTimeout(() => {
        if (this.elements.professionalProfileStatus)
          this.elements.professionalProfileStatus.textContent = "";
      }, 2500);
    }
  }

  resetProfessionalProfileForm() {
    const profile = this.getProfessionalProfile();
    if (this.elements.professionalSurveyorName)
      this.elements.professionalSurveyorName.value = profile.surveyorName;
    if (this.elements.professionalLicense)
      this.elements.professionalLicense.value = profile.licenseNumber;
    if (this.elements.professionalFirm)
      this.elements.professionalFirm.value = profile.firmName;
    if (this.elements.professionalContactPhone)
      this.elements.professionalContactPhone.value = profile.contactPhone;
    if (this.elements.professionalContactEmail)
      this.elements.professionalContactEmail.value = profile.contactEmail;
    if (this.elements.professionalCounty)
      this.elements.professionalCounty.value = profile.county;
  }

  renderProfessionalProfile() {
    this.resetProfessionalProfileForm();
  }

  toggleRollingBackups(enabled) {
    this.globalSettings.backupSettings = {
      ...(this.globalSettings.backupSettings || {}),
      rollingBackupsEnabled: Boolean(enabled),
    };
    this.saveGlobalSettings();
    this.renderRollingBackupControls();
  }

  updateRollingBackupPrefix(prefix) {
    const trimmed = prefix?.trim() || "carlson-backup";
    this.globalSettings.backupSettings = {
      ...(this.globalSettings.backupSettings || {}),
      filenamePrefix: trimmed,
    };
    this.saveGlobalSettings();
    this.renderRollingBackupControls();
  }

  renderRollingBackupList() {
    const container = this.elements.rollingBackupList;
    if (!container) return;
    container.innerHTML = "";
    const projectId = this.currentProjectId;
    const backups =
      projectId && this.rollingBackupService
        ? this.rollingBackupService.getBackups(projectId)
        : [];

    if (!projectId) {
      container.classList.add("empty");
      container.textContent = "Select a project to view rolling backups.";
      return;
    }

    if (!backups.length) {
      container.classList.add("empty");
      container.textContent = "No rolling backups yet for this project.";
      return;
    }

    container.classList.remove("empty");
    backups.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "backup-item";

      const meta = document.createElement("div");
      meta.className = "backup-meta";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = entry.filename;
      const timestamp = document.createElement("span");
      timestamp.className = "timestamp";
      timestamp.textContent = new Date(entry.timestamp).toLocaleString();
      meta.append(label, timestamp);

      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.textContent = "Download";
      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([entry.payload], {
          type: "application/json",
        });
        this.downloadBlob(blob, entry.filename || "backup.json");
      });

      row.append(meta, downloadBtn);
      container.appendChild(row);
    });
  }

  clearRollingBackupsForProject() {
    if (!this.currentProjectId || !this.rollingBackupService) return;
    if (!confirm("Remove all rolling backups for this project?")) return;
    this.rollingBackupService.clearProject(this.currentProjectId);
    this.renderRollingBackupList();
  }
  };

export default GlobalSettingsMixin;
