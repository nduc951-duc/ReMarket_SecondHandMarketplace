# Verification commands

Run from the repository root.

## Backend

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run lint
npm.cmd --prefix backend run format:check
```

## Frontend

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run format:check
npm.cmd --prefix frontend run build
```

## Knowledge graph

```powershell
graphify update .
```

## Notes

- Tests use Node's built-in test runner and match `tests/*.test.js`.
- The frontend production build is the strongest check for Vite import and bundling
  errors.
- Do not claim SQL validation unless migrations were actually parsed or applied in
  a safe environment.
