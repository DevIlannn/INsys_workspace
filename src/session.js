import os from "os";
import si from "systeminformation";

let sessionCache = null;

export async function getSessionData() {
  if (sessionCache) return sessionCache;

  const started = new Date().toLocaleString();

  let ip = "unknown";
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          ip = net.address;
          break;
        }
      }
      if (ip !== "unknown") break;
    }
    if (ip === "unknown") ip = "127.0.0.1";
  } catch {
    ip = "127.0.0.1";
  }

  let cpuModel = "unknown";
  try {
    const cpuData = await si.cpu();
    cpuModel = cpuData.manufacturer + " " + cpuData.brand;
  } catch {
    cpuModel = os.cpus()[0]?.model || "unknown";
  }

  const width = process.stdout.columns || 80;
  const platform = os.platform() + " " + os.release();
  const node = process.version;
  const terminal = process.env.TERM_PROGRAM || process.env.TERM || "terminal";
  const device = cpuModel.trim();

  sessionCache = { ip, device, platform, node, terminal, width: String(width), started };
  return sessionCache;
}

export function detectLayout() {
  const w = process.stdout.columns || 80;
  if (w >= 120) return "wide";
  if (w >= 80) return "standard";
  return "compact";
}

