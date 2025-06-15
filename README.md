# ArcTecFox Monorepo

This repository contains multiple applications that make up the ArcTecFox project. Each app lives inside the `apps/` directory and can be developed independently using npm workspaces.

- **apps/lite** – Early access "PM Lite" version focused on the AI-powered planner and Excel export.
- **apps/v1** – Full stack application with FastAPI backend and a React/Vite frontend.

Install all dependencies by running the provided `setup_codex.sh` script. It sets up Python virtual environments and installs Node packages for both applications.

See `package.json` for workspace scripts like `npm run dev:lite` or `npm run dev:v1` to start each app during development.

