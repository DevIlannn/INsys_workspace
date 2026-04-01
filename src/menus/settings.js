import inquirer from "inquirer";
import { t } from "../lang.js";
import {
  color,
  renderSectionTitle,
  renderSuccess,
  renderInfo,
  renderMuted,
  renderBox,
  renderTokenStatus,
  renderSessionCard,
} from "../ui.js";
import { getSessionData } from "../session.js";

export async function settingsMenu(state) {
  const { lang } = state;

  let running = true;
  while (running) {
    renderSectionTitle(t(lang, "settings"));
    renderTokenStatus(state.tokens.github, state.tokens.vercel, lang);

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: color.primary("Select action"),
        prefix: "  ",
        choices: [
          { name: color.white(t(lang, "changeToken")), value: "tokens" },
          { name: color.white(t(lang, "viewSession")), value: "session" },
          { name: color.white("Token Setup Guide"), value: "guide" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.muted(t(lang, "back")), value: "back" },
        ],
      },
    ]);

    if (choice === "back") { running = false; break; }
    if (choice === "tokens") await updateTokens(state, lang);
    if (choice === "session") await viewSession(lang);
    if (choice === "guide") renderTokenGuide(lang);
  }
}

async function updateTokens(state, lang) {
  renderSectionTitle(t(lang, "changeToken"));

  renderInfo(t(lang, "tokenHint"));
  renderInfo(t(lang, "tokenHintVC"));
  console.log();

  const { github } = await inquirer.prompt([
    {
      type: "password",
      name: "github",
      message: color.primary(t(lang, "tokenPromptGH") + ":"),
      prefix: "  ",
      mask: "*",
    },
  ]);

  const { vercel } = await inquirer.prompt([
    {
      type: "password",
      name: "vercel",
      message: color.primary(t(lang, "tokenPromptVC") + ":"),
      prefix: "  ",
      mask: "*",
    },
  ]);

  if (github.trim()) {
    state.tokens.github = github.trim();
    renderSuccess("GitHub token updated.");
  } else {
    renderMuted("GitHub token unchanged.");
  }

  if (vercel.trim()) {
    state.tokens.vercel = vercel.trim();
    renderSuccess("Vercel token updated.");
  } else {
    renderMuted("Vercel token unchanged.");
  }

  renderInfo(t(lang, "tokenSaved"));
  await pause();
}

async function viewSession(lang) {
  const sessionData = await getSessionData();
  renderSessionCard(sessionData);
  await pause();
}

function renderTokenGuide(lang) {
  const lines = [
    color.primaryBold("  GitHub Personal Access Token"),
    color.muted("  ") + color.white("1. Buka: ") + color.info("https://github.com/settings/tokens"),
    color.muted("  ") + color.white("2. Klik 'Generate new token (classic)'"),
    color.muted("  ") + color.white("3. Centang scope: repo, delete_repo, read:user"),
    color.muted("  ") + color.white("4. Klik 'Generate token', copy hasilnya"),
    "",
    color.primaryBold("  Vercel API Token"),
    color.muted("  ") + color.white("1. Buka: ") + color.info("https://vercel.com/account/tokens"),
    color.muted("  ") + color.white("2. Klik 'Create Token'"),
    color.muted("  ") + color.white("3. Pilih scope dan expiry"),
    color.muted("  ") + color.white("4. Copy token yang muncul"),
    "",
    color.muted("  Atau simpan di settings.js atau env var:"),
    color.dim("  GITHUB_TOKEN=xxx VERCEL_TOKEN=xxx node app.js"),
  ];

  renderBox(lines.join("\n"), "Token Setup Guide", "primary");
  pauseSync();
}

async function pause() {
  await inquirer.prompt([
    {
      type: "input",
      name: "_",
      message: color.dim("Press Enter to continue..."),
      prefix: "  ",
    },
  ]);
}

function pauseSync() {
  const now = Date.now();
  while (Date.now() - now < 100) {}
  return inquirer.prompt([
    {
      type: "input",
      name: "_",
      message: color.dim("Press Enter to continue..."),
      prefix: "  ",
    },
  ]).catch(() => {});
}

