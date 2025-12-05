import http from "http";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "projects.json");
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const isPlainObject = (val) =>
  val && typeof val === "object" && !Array.isArray(val);

const isVersioned = (val) =>
  isPlainObject(val) && "version" in val && "updatedAt" in val;

const getArrayKey = (item) => {
  if (item && typeof item === "object") {
    return item.id || item.pointNumber || JSON.stringify(item);
  }
  return item;
};

const compareVersioned = (left, right) => {
  if (!left) return right;
  if (!right) return left;
  if ((left.version ?? 0) === (right.version ?? 0)) {
    return new Date(left.updatedAt || 0) >= new Date(right.updatedAt || 0)
      ? left
      : right;
  }
  return (left.version ?? 0) > (right.version ?? 0) ? left : right;
};

const mergeArrays = (base = [], incoming = []) => {
  const map = new Map();
  (base || []).forEach((item) => {
    map.set(getArrayKey(item), item);
  });
  (incoming || []).forEach((item) => {
    const key = getArrayKey(item);
    if (map.has(key)) {
      map.set(key, mergeValues(map.get(key), item));
    } else {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

const mergeValues = (base, incoming) => {
  if (isVersioned(base) || isVersioned(incoming)) {
    return compareVersioned(base, incoming);
  }
  if (Array.isArray(base) && Array.isArray(incoming)) {
    return mergeArrays(base, incoming);
  }
  if (isPlainObject(base) && isPlainObject(incoming)) {
    const result = { ...base };
    Object.keys(incoming || {}).forEach((key) => {
      result[key] = mergeValues(base ? base[key] : undefined, incoming[key]);
    });
    return result;
  }
  return incoming !== undefined ? incoming : base;
};

const mergeDataset = (stored = {}, incoming = {}) => {
  const merged = {};
  const keys = new Set([
    ...Object.keys(stored || {}),
    ...Object.keys(incoming || {}),
  ]);

  keys.forEach((key) => {
    merged[key] = mergeValues(stored[key], incoming[key]);
  });

  return merged;
};

const ensureDataFile = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ projects: {}, evidence: {} }, null, 2));
  }
};

const readData = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    console.warn("Failed to read data file", err);
    return { projects: {}, evidence: {} };
  }
};

const writeData = (data) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const respond = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
};

const serveStatic = (req, res) => {
  const requestPath = req.url.split("?")[0];
  const normalizedPath = path
    .normalize(requestPath === "/" ? "/index.html" : requestPath)
    .replace(/^\/+/g, "");
  const resolvedPath = path.join(ROOT_DIR, normalizedPath);

  if (!resolvedPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  let filePath = resolvedPath;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
};

const parseBody = async (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return respond(res, 200, {});
  }

  if (req.url.startsWith("/api/projects") && req.method === "GET") {
    const data = readData();
    return respond(res, 200, data);
  }

  if (req.url.startsWith("/api/sync") && req.method === "POST") {
    try {
      const incoming = await parseBody(req);
      const stored = readData();
      const merged = mergeDataset(stored, incoming || {});
      writeData(merged);
      return respond(res, 200, merged);
    } catch (err) {
      console.error("Sync error", err);
      return respond(res, 400, { error: "Invalid payload" });
    }
  }

  if (req.url.startsWith("/api/health")) {
    return respond(res, 200, { status: "ok" });
  }

  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  respond(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Sync API server running on port ${PORT}`);
});
