#!/usr/bin/env node

import inquirer from "inquirer";
import { settings } from "./settings.js";
import { t, translations } from "./src/lang.js";
import {
  color,
  clear,
  renderHeader,
  renderSectionTitle,
  renderBox,
  renderInfo,
  renderTokenStatus,
  renderSessionCard,
} from "./src/ui.js";
import { getSessionData, detectLayout } from "./src/session.js";
import { githubMenu } from "./src/menus/github.js";
import { vercelMenu } from "./src/menus/vercel.js";
import { settingsMenu } from "./src/menus/settings.js";

const state = {
  lang: settings.i18n.defaultLang || "",
  tokens: {
    github: settings.tokens.github || process.env.GITHUB_TOKEN || "",
    vercel: settings.tokens.vercel || process.env.VERCEL_TOKEN || "",
  },
};

async function selectLanguage() {
  const langChoices = [
    { name: "  English", value: "en" },
    { name: "  Bahasa Indonesia", value: "id" },
    { name: "  Japanese (日本語)", value: "ja" },
  ];

  const { lang } = await inquirer.prompt([
    {
      type: "list",
      name: "lang",
      message: color.primary("Select your language / Pilih bahasa / 言語を選択"),
      prefix: "  ",
      choices: langChoices,
    },
  ]);

  return lang;
}

async function promptMissingTokens(lang) {
  const hasGH = Boolean(state.tokens.github);
  const hasVC = Boolean(state.tokens.vercel);

  if (hasGH && hasVC) return;

  const missing = [];
  if (!hasGH) missing.push("GitHub");
  if (!hasVC) missing.push("Vercel");

  renderBox(
    color.warning("  " + t(lang, "noToken") + "\n\n") +
    color.muted("  ") + color.info("GitHub: ") + color.dim("https://github.com/settings/tokens\n") +
    color.muted("  ") + color.info("Vercel: ") + color.dim("https://vercel.com/account/tokens"),
    "Token Setup",
    "warning"
  );

  for (const service of missing) {
    const { skip } = await inquirer.prompt([
      {
        type: "confirm",
        name: "skip",
        message: color.muted("Enter " + service + " token now?"),
        prefix: "  ",
        default: true,
      },
    ]);

    if (skip) {
      const prompt = service === "GitHub"
        ? t(lang, "tokenPromptGH")
        : t(lang, "tokenPromptVC");

      const { token } = await inquirer.prompt([
        {
          type: "password",
          name: "token",
          message: color.primary(prompt + ":"),
          prefix: "  ",
          mask: "*",
        },
      ]);

      if (token.trim()) {
        if (service === "GitHub") state.tokens.github = token.trim();
        else state.tokens.vercel = token.trim();
      }
    }
  }
}

async function mainMenu() {
  const { lang } = state;
  let running = true;

  while (running) {
    clear();
    renderHeader();
    renderTokenStatus(state.tokens.github, state.tokens.vercel, lang);
    console.log();
    renderSectionTitle(t(lang, "mainMenu"));

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: color.primary("Navigate"),
        prefix: "  ",
        choices: [
          {
            name: color.white("  " + t(lang, "github") + "  ") + color.dim("Repositories, Branches, Commits"),
            value: "github",
          },
          {
            name: color.white("  " + t(lang, "vercel") + "  ") + color.dim("Projects, Deployments, Env Vars"),
            value: "vercel",
          },
          new inquirer.Separator(color.dim("".padEnd(60, "\u2500"))),
          {
            name: color.white("  " + t(lang, "settings") + "  ") + color.dim("Tokens, Session Info"),
            value: "settings",
          },
          new inquirer.Separator(color.dim("".padEnd(60, "\u2500"))),
          {
            name: color.muted("  " + t(lang, "exit")),
            value: "exit",
          },
        ],
      },
    ]);

    if (choice === "exit") {
      running = false;
      break;
    }

    clear();
    renderHeader();

    if (choice === "github") await githubMenu(state);
    if (choice === "vercel") await vercelMenu(state);
    if (choice === "settings") await settingsMenu(state);
  }
}

async function boot() {
  clear();
  renderHeader();

  const sessionData = await getSessionData();

  if (!state.lang) {
    state.lang = await selectLanguage();
  }

  const lang = state.lang;
  clear();
  renderHeader();

  renderSessionCard(sessionData);

  await promptMissingTokens(lang);

  await mainMenu();

  console.log();
  renderBox(
    color.primary("  INsys") + color.muted(" session ended.\n") +
    color.dim("  " + new Date().toLocaleString()),
    "Goodbye",
    "primary"
  );
  console.log();
  process.exit(0);
}

process.on("SIGINT", () => {
  console.log("\n\n  " + color.muted("Session interrupted. Bye.") + "\n");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error("\n  " + color.error("[Fatal] ") + color.white(err.message));
  process.exit(1);
});

boot();

