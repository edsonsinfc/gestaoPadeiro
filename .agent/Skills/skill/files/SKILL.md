---
name: api-contract-reviewer
description: Reviews and validates API contract files (OpenAPI/Swagger JSON or YAML) for REST best practices, naming conventions, security headers, and versioning standards. Use this when the user asks to review, audit, validate, or check an API spec, OpenAPI file, swagger file, or API contract.
---

# API Contract Reviewer

## Goal

Analyze an OpenAPI/Swagger contract file and produce a structured compliance report, flagging violations across four dimensions: naming conventions, HTTP semantics, security, and versioning.

---

## Instructions

### Step 1 — Run the automated validator

Execute the script against the user's file to detect objective violations:

```
python scripts/validate_contract.py <path_to_api_file>
```

The script outputs a JSON report. Capture the result before proceeding.

### Step 2 — Review the style guide

Read `resources/REST_STYLE_GUIDE.md` for the full list of rules and their severity levels (`ERROR`, `WARNING`, `INFO`).

### Step 3 — Complement with qualitative analysis

After running the script, inspect the contract yourself for issues the script cannot detect:
- Unclear or ambiguous `description` fields
- Overly generic error responses (e.g., a single `500` with no detail)
- Missing `summary` on operations
- Inconsistent resource naming across related endpoints
- Request/response schemas with no `example` field

### Step 4 — Generate the report

Format your output exactly as shown in `examples/sample_report.md`.

The report must include:
1. **Summary header** — file name, total issues by severity
2. **Issues table** — one row per violation: Path | Method | Rule | Severity | Fix
3. **Qualitative observations** — 3–5 bullet points from your manual review
4. **Score** — a compliance score from 0–100, calculated as:
   `score = 100 - (errors × 10) - (warnings × 3) - (infos × 1)`
   Minimum score is 0.

---

## Constraints

- **Never modify** the user's file — this is read-only analysis.
- If the file is not valid JSON or YAML, report the parse error and stop.
- If `score >= 80`, classify the contract as ✅ **Compliant**.
- If `score >= 50`, classify as ⚠️ **Needs Work**.
- If `score < 50`, classify as ❌ **Non-Compliant**.
- Do not invent violations. Only report what the script detects or what you can directly observe in the contract.
