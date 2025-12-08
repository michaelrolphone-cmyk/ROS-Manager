export default class GlobalSettingsService {
  constructor(storageKey = "carlsonGlobalSettings") {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.defaultSettings();
      const parsed = JSON.parse(raw);
      return {
        equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
        teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],
        pointCodes: Array.isArray(parsed.pointCodes)
          ? parsed.pointCodes.map((code) => ({
              ...code,
              kind: code?.kind || "point",
            }))
          : [],
        deviceProfiles:
          parsed.deviceProfiles && typeof parsed.deviceProfiles === "object"
            ? parsed.deviceProfiles
            : {},
        liveLocations:
          parsed.liveLocations && typeof parsed.liveLocations === "object"
            ? parsed.liveLocations
            : {},
        backupSettings:
          parsed.backupSettings && typeof parsed.backupSettings === "object"
            ? parsed.backupSettings
            : this.defaultSettings().backupSettings,
      };
    } catch (err) {
      console.warn("Failed to parse global settings", err);
      return this.defaultSettings();
    }
  }

  save(settings) {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  defaultSettings() {
    return {
      equipment: [],
      teamMembers: [],
      pointCodes: [],
      deviceProfiles: {},
      liveLocations: {},
      backupSettings: {
        rollingBackupsEnabled: false,
        filenamePrefix: "carlson-backup",
        maxCopies: 3,
      },
    };
  }
}
