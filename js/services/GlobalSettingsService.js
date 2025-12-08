export default class GlobalSettingsService {
  constructor(storageKey = "carlsonGlobalSettings") {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.defaultSettings();
      const parsed = this.sanitize(JSON.parse(raw));
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
            ? this.pruneLiveLocations(parsed.liveLocations)
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
    try {
      const sanitized = this.sanitize(settings);
      localStorage.setItem(this.storageKey, JSON.stringify(sanitized));
    } catch (err) {
      console.warn("Failed to persist global settings", err);
    }
  }

  sanitize(settings = {}) {
    const sanitized = { ...(settings || {}) };

    if (sanitized.liveLocations && typeof sanitized.liveLocations === "object") {
      sanitized.liveLocations = this.pruneLiveLocations(sanitized.liveLocations);
    } else {
      delete sanitized.liveLocations;
    }

    ["activityLog", "activityEvents", "activityBuffer", "telemetry", "locationHistory"]
      .filter((key) => key in sanitized)
      .forEach((key) => delete sanitized[key]);

    return sanitized;
  }

  pruneLiveLocations(liveLocations = {}, options = {}) {
    const maxEntries = Number(options.maxEntries) > 0 ? Number(options.maxEntries) : 50;
    const maxAgeHours = Number(options.maxAgeHours) > 0 ? Number(options.maxAgeHours) : 24;
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    const sorted = Object.entries(liveLocations || {})
      .map(([deviceId, loc]) => {
        const updatedAt = new Date(loc?.updatedAt || 0).getTime();
        return {
          deviceId,
          loc,
          updatedAt,
        };
      })
      .filter(
        ({ loc, updatedAt }) =>
          loc &&
          typeof loc.lat === "number" &&
          typeof loc.lon === "number" &&
          Number.isFinite(updatedAt) &&
          updatedAt >= cutoff
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, maxEntries);

    return Object.fromEntries(sorted.map(({ deviceId, loc }) => [deviceId, loc]));
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
