# REST API Style Guide

Reference for the `api-contract-reviewer` skill. All rules are enforced by `scripts/validate_contract.py`.

---

## Severity levels

| Level | Meaning |
|-------|---------|
| ERROR | Breaks interoperability or violates REST fundamentals. Must fix. |
| WARNING | Reduces readability, discoverability, or developer experience. Should fix. |
| INFO | Improvement opportunity. Nice to fix. |

---

## Rule catalogue

### Naming — Paths

| Rule | Severity | Description |
|------|----------|-------------|
| R001 | ERROR | Path segments must use **kebab-case** (lowercase letters, digits, hyphens). Path parameters in `{braces}` are excluded. |
| R002 | ERROR | Paths must **not contain verbs** (get, create, update, delete, fetch, list, etc.). Use HTTP methods to express intent. |
| R003 | WARNING | The last static path segment should be **plural** (e.g. `/users`, `/orders`, `/invoices`). Exceptions: singleton resources (e.g. `/me`, `/health`). |

### HTTP Semantics

| Rule | Severity | Description |
|------|----------|-------------|
| R004 | ERROR | Every operation must declare **at least one response**. |
| R005 | ERROR | Every operation must declare **at least one 4xx response** (e.g. `400`, `401`, `404`). |
| R008 | ERROR | `POST`, `PUT`, and `PATCH` operations must declare a **requestBody**. |
| R009 | INFO | `GET` and `DELETE` operations should **not** include a requestBody. |
| R013 | WARNING | `200` and `201` responses should include a **content/schema** block. |

### Documentation

| Rule | Severity | Description |
|------|----------|-------------|
| R006 | WARNING | Every operation must have a non-empty **summary** (short, one-line title). |
| R007 | WARNING | Every operation should have a non-empty **description** (fuller explanation). |
| R014 | INFO | Operations should have an **operationId** (used by code generators). |

### Structure & Versioning

| Rule | Severity | Description |
|------|----------|-------------|
| R010 | ERROR | The `info.version` field must be **present and non-empty**. |
| R011 | WARNING | The version should follow **semver** (`1.0.0`, `2.3.1`) or **v-prefix** (`v1`, `v2.0`). |
| R012 | ERROR | Every `{param}` in a path must be declared in the `parameters` array with `in: path`. |

---

## Score formula

```
score = 100 - (errors × 10) - (warnings × 3) - (infos × 1)
score = max(0, score)
```

| Score | Status |
|-------|--------|
| 80–100 | ✅ Compliant |
| 50–79 | ⚠️ Needs Work |
| 0–49 | ❌ Non-Compliant |
