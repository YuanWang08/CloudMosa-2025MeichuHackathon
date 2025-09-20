# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Express API, Sequelize models, BullMQ jobs, and route handlers. Configuration lives in `backend/config/`; database setup reads both `backend/.env` and root `.env` for container variables. HTTP entry point is `backend/index.js`.
- `frontend/`: Vue 3 + Vite app sized for feature-phone layouts. Reusable stores live in `frontend/src/stores/`, views under `frontend/src/views/`, and static avatars/assets in `frontend/public/`. Tailwind CSS v4 is wired through `vite.config.ts`.
- `docker-compose.yaml`: provisions PostgreSQL, pgAdmin, Redis, and Redis Commander; persistent data is mounted in `pg_data/` and `redis_data/`.

## Build, Test, and Development Commands
- Backend: `npm install` then `npm run dev` inside `backend/` starts Nodemon on port 3001 once PostgreSQL/Redis are reachable. `node index.js` runs the API without live reload.
- Frontend: `npm install` then `npm run dev` inside `frontend/` launches Vite (default port 5173) with proxy rules for `/api` and `/tts`. Use `npm run build` to emit production assets and `npm run preview` to serve the build locally.
- Infra: run `docker compose up -d` from the repo root to start databases; use `docker compose logs pg-db` when validating connectivity during local bootstrap.

## Coding Style & Naming Conventions
- JavaScript/TypeScript use 2-space indentation and single quotes where lint rules permit. Follow PascalCase for Vue components (`SignUpView.vue`), camelCase for variables/functions, and snake_case only for database columns matching the schema.
- Frontend linting relies on ESLint + Prettier (`npm run lint`, `npm run format`); Tailwind utility classes should remain mobile-first and grouped by layout → spacing → color.
- Backend controllers should return JSON payloads and reuse shared helpers under `backend/middlewares/` when applicable.

## Testing Guidelines
- No automated suites are present yet (`backend/package.json` has a placeholder `npm test`). Add unit tests alongside new features (e.g., Jest or Vitest) and document the command in package scripts before submitting.
- Prefer naming test files `*.spec.ts`/`*.spec.js` and colocating them next to the code under test. Include seed SQL or factories when integration tests touch PostgreSQL.

## Commit & Pull Request Guidelines
- Existing history uses short, descriptive summaries (e.g., `Vibe Coding v1.1`). Continue with imperative, <=72-character headlines; add detail in the body when behavior or data migrations change.
- Pull requests should: describe the user-facing change, reference tracking issue IDs, list setup steps (`docker compose up`, `npm run dev`), and attach screenshots or GIFs for UI updates.

## Security & Configuration Tips
- Never commit real secrets. Replace the sample credentials in `backend/.env` and root `.env` with environment-specific values via `.env.local` or deployment secrets.
- Keep Azure Speech and Twilio keys scoped per environment and rotate them if checked into history. Remove keys from Git history before publishing.
