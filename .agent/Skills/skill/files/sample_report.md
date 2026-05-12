# API Contract Review — `examples/bad_api.json`

## Summary

| Metric | Value |
|--------|-------|
| File | `examples/bad_api.json` |
| Errors | 4 |
| Warnings | 4 |
| Infos | 1 |
| **Score** | **47 / 100** |
| **Status** | ❌ Non-Compliant |

---

## Issues

| Path | Method | Rule | Severity | Fix |
|------|--------|------|----------|-----|
| `/getUsers` | – | R002 | ERROR | Remove verb from path → use `/users` |
| `info.version` | – | R011 | WARNING | Change `"beta"` to semver → `"1.0.0"` |
| `/order` | POST | R003 | WARNING | Rename to plural → `/orders` |
| `/order` | POST | R005 | ERROR | Add a `400` or `404` response |
| `/order` | POST | R007 | WARNING | Add a `description` field |
| `/order` | POST | R008 | ERROR | Add a `requestBody` block |
| `/order` | POST | R013 | WARNING | Add a `content` schema to the `201` response |
| `/order` | POST | R014 | INFO | Add an `operationId` (e.g. `createOrder`) |
| `/products/{productId}/review` | – | R003 | WARNING | Rename to plural → `/reviews` |
| `/products/{productId}/review` | POST | R012 | ERROR | Declare `productId` in the `parameters` array |

---

## Qualitative observations

- The `/order` endpoint is missing almost all required fields — it appears to be a stub that was committed without being completed.
- `/products/{productId}/review` is a well-formed endpoint (requestBody, 4xx responses, operationId) but needs the path parameter declared and the segment pluralized.
- No `401` or `403` responses are defined for write operations (`POST /order`, `POST /products/.../review`), which is unusual for an e-commerce API that presumably requires authentication.
- The `User` schema has no `example` field, which would help API consumers understand the expected shape.
- Consider adding a top-level `servers` block so consumers know the base URL.

---

## Recommended fixes (priority order)

1. Rename `/getUsers` → `/users` (R002 — removes verb)
2. Add `requestBody` to `POST /orders` (R008 — breaks clients)
3. Declare `{productId}` in parameters for `/products/{productId}/reviews` (R012)
4. Add 4xx responses to `POST /orders` (R005)
5. Fix version to `"1.0.0"` (R011)
