# MePlanner

A dark, mobile-first personal planner PWA built with React, TypeScript and Vite.

## Stage 1 features

- Daily task list with completed, pending and missed states.
- Daily-repeat tasks automatically get a fresh entry each calendar day.
- One-time tasks can be created by turning off **Repeat every day**.
- Weekly completion chart based on actual saved task history.
- Long-term goals with target dates and adjustable progress.
- 30-day activity chart.
- Local-first storage using browser `localStorage`; no account or backend.
- PWA manifest and service worker for installation and basic offline support.
- Responsive layout for phones and desktop.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

To create a production build:

```bash
npm run build
npm run preview
```

## Publish with GitHub Pages from a phone/browser

This project uses relative asset paths (`base: "./"`) so it can be hosted at a GitHub Pages project URL.

1. Create a new GitHub repository named `MePlanner`. Public is simplest for a personal Pages site.
2. Upload `meplanner-source.zip` to the repository root.
3. Create a new file in the repository at `.github/workflows/deploy.yml`.
4. Paste the deployment workflow supplied separately with this project and commit it to the `main` branch.
5. Open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
6. Open the **Actions** tab. Wait for the `Deploy MePlanner` workflow to finish successfully.
7. Your site URL will be shown in **Settings → Pages**.

The workflow extracts the source ZIP into a temporary `app` folder, installs dependencies, builds the site, and publishes the `dist` folder. Keep `meplanner-source.zip` in the repository root. To update the app later, upload a replacement ZIP with the same name and commit it.

## Data and privacy

Tasks and goals are saved in this browser on this device. There is no cloud sync or login in Stage 1. Clearing browser/site data can erase the planner's saved records, so avoid clearing site data unless you have a backup plan. A data export/import feature can be added in a later stage.

## Important notes

- The first visit needs an internet connection to load the app and its assets.
- The service worker caches the app shell and same-origin files as they are visited; offline coverage improves after the first successful load.
- The current version is a PWA, not yet a native Android APK.
- Stage 2 can add data export/import, task editing, reminders, recurring schedules and goal milestones.
- Stage 3 can improve analytics, filters and history views.
- Capacitor can be used later to package the same web app as an Android project.
