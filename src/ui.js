import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import gradient from "gradient-string";
import Table from "cli-table3";
import ora from "ora";
import { settings } from "../settings.js";

const { theme, ui } = settings;

const termWidth = () => Math.min(process.stdout.columns || 80, ui.maxWidth);

// chalk.hex() crash kalo value-nya undefined di Node v25+, jadi kita wrap dengan safe fallback
function safeHex(hex, bold = false) {
  return (s) => {
    try {
      if (!hex || typeof hex !== "string") return bold ? chalk.bold(String(s)) : String(s);
      return bold ? chalk.bold.hex(hex)(String(s)) : chalk.hex(hex)(String(s));
    } catch {
      return bold ? chalk.bold(String(s)) : String(s);
    }
  };
}

export const color = {
  primary: safeHex(theme.primary),
  primaryLight: safeHex(theme.primaryLight),
  accent: safeHex(theme.accent),
  success: safeHex(theme.success),
  error: safeHex(theme.error),
  warning: safeHex(theme.warning),
  info: safeHex(theme.info),
  muted: safeHex(theme.muted),
  white: safeHex(theme.white),
  dim: safeHex(theme.dim),
  bold: (s) => chalk.bold(String(s)),
  primaryBold: safeHex(theme.primary, true),
};

export function renderHeader() {
  const w = termWidth();
  const line = color.dim(ui.lineChar.repeat(w));

  let banner = "";
  try {
    banner = figlet.textSync("INsys", {
      font: "Slant",
      horizontalLayout: "default",
      verticalLayout: "default",
    });
  } catch {
    banner = "  INsys";
  }

  let renderedBanner = banner;
  try {
    const orangeGrad = gradient([theme.primaryDark, theme.primary, theme.accent]);
    renderedBanner = orangeGrad.multiline(banner);
  } catch {
    renderedBanner = color.primary(banner);
  }

  console.log("\n" + line);
  console.log(renderedBanner);
  console.log(line);
  console.log(
    color.muted("  " + settings.app.description) +
      chalk.dim("  v" + settings.app.version)
  );
  console.log(line + "\n");
}

export function renderBox(content, title = "", type = "default") {
  const borderColor = {
    default: theme.border,
    success: theme.success,
    error: theme.error,
    warning: theme.warning,
    info: theme.info,
    primary: theme.primary,
  }[type] || theme.border;

  try {
    const box = boxen(content, {
      padding: ui.padding,
      margin: { top: 0, bottom: 1, left: 1, right: 1 },
      borderStyle: ui.boxStyle,
      borderColor: borderColor,
      title: title ? color.primaryBold(" " + title + " ") : undefined,
      titleAlignment: "left",
    });
    console.log(box);
  } catch {
    if (title) console.log("\n  " + color.primaryBold(title));
    console.log(content);
    console.log();
  }
}

export function renderSectionTitle(text) {
  const w = termWidth();
  const label = color.primaryBold(" " + text + " ");
  const line = color.dim(ui.lineChar.repeat(Math.max(0, w - text.length - 4)));
  console.log("\n" + label + "  " + line);
}

export function renderTable(headers, rows, colWidths) {
  try {
    const table = new Table({
      head: headers.map((h) => color.primaryBold(h)),
      chars: {
        top: ui.lineChar,
        "top-mid": "\u252C",
        "top-left": "\u250C",
        "top-right": "\u2510",
        bottom: ui.lineChar,
        "bottom-mid": "\u2534",
        "bottom-left": "\u2514",
        "bottom-right": "\u2518",
        left: "\u2502",
        "left-mid": "\u251C",
        mid: ui.lineChar,
        "mid-mid": "\u253C",
        right: "\u2502",
        "right-mid": "\u2524",
        middle: "\u2502",
      },
      style: { head: [], border: [], compact: false },
      colWidths: colWidths || undefined,
    });
    rows.forEach((row) => table.push(row));
    console.log(table.toString());
  } catch {
    headers.forEach((h, i) => process.stdout.write(h.padEnd((colWidths?.[i] || 15)) + " "));
    console.log();
    rows.forEach((row) => {
      row.forEach((cell, i) => process.stdout.write(String(cell).padEnd((colWidths?.[i] || 15)) + " "));
      console.log();
    });
  }
}

export function renderStatusRow(label, value, status = "default") {
  const colorFn =
    {
      success: color.success,
      error: color.error,
      warning: color.warning,
      info: color.info,
      primary: color.primary,
      muted: color.muted,
      accent: color.accent,
    }[status] || color.white;

  console.log("  " + color.muted(label.padEnd(20)) + colorFn(String(value)));
}

export function renderDivider() {
  const w = termWidth();
  console.log(color.dim(ui.lineChar.repeat(w)));
}

export function renderInfo(msg) {
  console.log("  " + color.info("i") + "  " + color.white(String(msg)));
}

export function renderSuccess(msg) {
  console.log("  " + color.success("+") + "  " + color.success(String(msg)));
}

export function renderError(msg) {
  console.log("  " + color.error("x") + "  " + color.error(String(msg)));
}

export function renderWarning(msg) {
  console.log("  " + color.warning("!") + "  " + color.warning(String(msg)));
}

export function renderMuted(msg) {
  console.log("  " + color.muted(String(msg)));
}

export function createSpinner(text) {
  return ora({
    text: color.muted(String(text)),
    spinner: ui.spinnerStyle,
    color: "white",
    prefixText: "  ",
  });
}

export function renderBadge(text, type = "primary") {
  try {
    const bg = {
      primary: chalk.bgHex(theme.primary).hex("#000"),
      success: chalk.bgHex(theme.success).hex("#000"),
      error: chalk.bgHex(theme.error).hex("#fff"),
      warning: chalk.bgHex(theme.warning).hex("#000"),
      muted: chalk.bgHex(theme.muted).hex("#fff"),
    }[type] || chalk.bgHex(theme.primary).hex("#000");
    return bg(" " + text + " ");
  } catch {
    return "[" + text + "]";
  }
}

export function renderKeyValue(pairs) {
  pairs.forEach(([k, v, status]) => renderStatusRow(k + ":", String(v), status || "white"));
}

export function clear() {
  if (settings.behavior.clearOnStart) {
    process.stdout.write("\x1Bc");
  }
}

export function renderSessionCard(sessionData) {
  const lines = [
    color.primaryBold("  Session Overview"),
    "",
    color.muted("  Device      ") + color.white(sessionData.device),
    color.muted("  Platform    ") + color.white(sessionData.platform),
    color.muted("  IP (local)  ") + color.accent(sessionData.ip),
    color.muted("  Node.js     ") + color.white(sessionData.node),
    color.muted("  Terminal    ") + color.white(sessionData.terminal),
    color.muted("  Width       ") + color.white(sessionData.width + "px"),
    color.muted("  Started     ") + color.white(sessionData.started),
  ];

  renderBox(lines.join("\n"), "INsys Session", "primary");
}

export function renderTokenStatus(githubToken, vercelToken) {
  const hasGH = Boolean(githubToken);
  const hasVC = Boolean(vercelToken);

  const lines = [
    "  " + (hasGH ? color.success("+") : color.error("x")) +
      "  GitHub Token: " +
      (hasGH ? color.success("Connected") : color.error("Not set")),
    "  " + (hasVC ? color.success("+") : color.error("x")) +
      "  Vercel Token: " +
      (hasVC ? color.success("Connected") : color.error("Not set")),
  ];

  renderBox(lines.join("\n"), "Token Status");
}

