# node-server tests (TDD)

- **Layout:** `test/jest-env.js` sets `ROISALEN_ADMIN_SECRET` for CI.  
- **Integration:** `test/app.test.js`, `test/usage.test.js` — HTTP surface.  
- **By module:** `test/modules/*.test.js` — one file per REST area (`message`, `subject`, `speaker-list`, …).

## Commands

```bash
NODE_ENV=test npm test          # all tests
NODE_ENV=test npx jest test/modules/message.test.js --watch
```

Add a **failing test** first, then implement the smallest change in the matching `*-resource.js` file.

## Full-stack / E2E

Browser flows live in **roisalen-frontend** (`npm run test:e2e`). This package has no Playwright dependency.
