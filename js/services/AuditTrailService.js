export default class AuditTrailService {
  constructor() {
    this.encoder = new TextEncoder();
  }

  async createSnapshot(data, { deviceId = null, user = null } = {}) {
    const timestamp = new Date().toISOString();
    const bundle = this.normalizeBundle(data, { timestamp, deviceId, user });

    const serialized = JSON.stringify(bundle);
    const hash = await this.computeHash(serialized);

    return {
      id: `audit-${Date.now()}`,
      timestamp,
      deviceId: deviceId || null,
      user: user || null,
      hash,
      bundle,
    };
  }

  async verifySnapshot(bundle, expectedHash) {
    const serialized = JSON.stringify(bundle);
    const hash = await this.computeHash(serialized);
    return hash === expectedHash;
  }

  async computeHash(serialized) {
    if (crypto?.subtle?.digest) {
      const data = this.encoder.encode(serialized);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    // Fallback for environments without subtle crypto
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      hash = (hash << 5) - hash + serialized.charCodeAt(i);
      hash |= 0; // force 32-bit
    }
    return `fallback-${Math.abs(hash)}`;
  }

  normalizeBundle(data, { timestamp, deviceId, user }) {
    const project = data?.project;
    const normalizedProject = project && typeof project.toObject === "function"
      ? project.toObject()
      : project;

    const sanitizedProject =
      normalizedProject && typeof normalizedProject === "object"
        ? { ...normalizedProject, auditTrail: [] }
        : normalizedProject;

    const bundle = {
      ...data,
      project: sanitizedProject,
    };

    bundle.metadata = {
      ...(data?.metadata || {}),
      capturedAt: timestamp,
      deviceId: deviceId || null,
      user: user || null,
    };

    return bundle;
  }
}
