#!/usr/bin/env python3
"""
API Contract Validator
Validates OpenAPI/Swagger files against REST best practices.
Exit code 0 = no ERRORs found. Exit code 1 = one or more ERRORs found.
"""

import sys
import json
import re

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# ── Rule definitions ──────────────────────────────────────────────────────────

RULES = {
    "R001": ("ERROR",   "Path must use kebab-case (lowercase + hyphens only)"),
    "R002": ("ERROR",   "Path must NOT include a verb (use HTTP methods instead)"),
    "R003": ("WARNING", "Path resource name should be plural (e.g. /users not /user)"),
    "R004": ("ERROR",   "Operation must declare at least one response"),
    "R005": ("ERROR",   "Operation must declare a 4xx error response"),
    "R006": ("WARNING", "Operation should have a non-empty 'summary'"),
    "R007": ("WARNING", "Operation should have a non-empty 'description'"),
    "R008": ("ERROR",   "POST/PUT/PATCH must declare a requestBody"),
    "R009": ("INFO",    "GET/DELETE should NOT have a requestBody"),
    "R010": ("ERROR",   "API info block must include a 'version' field"),
    "R011": ("WARNING", "API version should follow semver (e.g. 1.0.0) or v-prefix (v1)"),
    "R012": ("ERROR",   "Path parameters must have a corresponding 'parameters' definition"),
    "R013": ("WARNING", "Response 200/201 should reference a schema (content block)"),
    "R014": ("INFO",    "Consider adding an 'operationId' for code generation"),
}

VERB_PATTERN = re.compile(
    r'/(get|post|put|delete|patch|create|update|remove|fetch|list|add|edit|'
    r'retrieve|insert|modify|destroy|save|search|find)(?:/|$)',
    re.IGNORECASE,
)

PATH_SEGMENT_PATTERN = re.compile(r'^[a-z0-9\-\{\}]+$')

SEMVER_PATTERN = re.compile(r'^\d+\.\d+(\.\d+)?$|^v\d+(\.\d+)*$', re.IGNORECASE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_spec(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Try JSON first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Fall back to YAML
    if HAS_YAML:
        try:
            return yaml.safe_load(raw)
        except yaml.YAMLError as e:
            print(json.dumps({"parse_error": str(e)}))
            sys.exit(2)

    print(json.dumps({"parse_error": "File is not valid JSON and PyYAML is not installed."}))
    sys.exit(2)


def issue(path, method, rule_id, extra=None):
    severity, message = RULES[rule_id]
    entry = {
        "path": path,
        "method": method.upper() if method else "–",
        "rule": rule_id,
        "severity": severity,
        "message": message,
    }
    if extra:
        entry["detail"] = extra
    return entry


# ── Validators ────────────────────────────────────────────────────────────────

def check_info(spec):
    issues = []
    info = spec.get("info", {})
    version = info.get("version", "")
    if not version:
        issues.append(issue("info.version", None, "R010"))
    elif not SEMVER_PATTERN.match(str(version)):
        issues.append(issue("info.version", None, "R011", f"Got: '{version}'"))
    return issues


def check_paths(spec):
    issues = []
    paths = spec.get("paths", {})

    for path, path_item in paths.items():
        # R001 – kebab-case segments (skip path params like {id})
        segments = [s for s in path.split("/") if s and not s.startswith("{")]
        for seg in segments:
            if not PATH_SEGMENT_PATTERN.match(seg):
                issues.append(issue(path, None, "R001", f"Segment '{seg}' violates kebab-case"))
                break

        # R002 – no verbs in path
        if VERB_PATTERN.search(path):
            issues.append(issue(path, None, "R002"))

        # R003 – plural resource names (heuristic: last static segment)
        last_seg = next((s for s in reversed(path.split("/")) if s and not s.startswith("{")), "")
        if last_seg and not last_seg.endswith("s") and "-" not in last_seg:
            issues.append(issue(path, None, "R003", f"Last segment: '{last_seg}'"))

        # R012 – path params defined in parameters
        path_params = set(re.findall(r'\{(\w+)\}', path))
        defined_params = set()
        if isinstance(path_item, dict):
            for p in path_item.get("parameters", []):
                if isinstance(p, dict) and p.get("in") == "path":
                    defined_params.add(p.get("name", ""))

        # HTTP methods
        http_methods = ["get", "post", "put", "patch", "delete", "head", "options"]
        for method in http_methods:
            op = path_item.get(method) if isinstance(path_item, dict) else None
            if not op or not isinstance(op, dict):
                continue

            # Collect method-level params too
            method_params = set()
            for p in op.get("parameters", []):
                if isinstance(p, dict) and p.get("in") == "path":
                    method_params.add(p.get("name", ""))

            all_defined = defined_params | method_params
            missing_params = path_params - all_defined
            if missing_params:
                issues.append(issue(path, method, "R012",
                                    f"Undeclared path params: {missing_params}"))

            # R004 – must have at least one response
            responses = op.get("responses", {})
            if not responses:
                issues.append(issue(path, method, "R004"))
                continue

            # R005 – must have a 4xx response
            has_4xx = any(str(k).startswith("4") for k in responses)
            if not has_4xx:
                issues.append(issue(path, method, "R005"))

            # R006 – summary
            if not op.get("summary", "").strip():
                issues.append(issue(path, method, "R006"))

            # R007 – description
            if not op.get("description", "").strip():
                issues.append(issue(path, method, "R007"))

            # R008 – POST/PUT/PATCH need requestBody
            if method in ("post", "put", "patch") and "requestBody" not in op:
                issues.append(issue(path, method, "R008"))

            # R009 – GET/DELETE shouldn't have requestBody
            if method in ("get", "delete") and "requestBody" in op:
                issues.append(issue(path, method, "R009"))

            # R013 – 200/201 should have content/schema
            for code in ("200", "201", 200, 201):
                resp = responses.get(code)
                if resp and isinstance(resp, dict) and "content" not in resp:
                    issues.append(issue(path, method, "R013",
                                        f"Response {code} has no content schema"))
                    break

            # R014 – operationId
            if not op.get("operationId", "").strip():
                issues.append(issue(path, method, "R014"))

    return issues


# ── Score calculator ──────────────────────────────────────────────────────────

def compute_score(issues):
    errors   = sum(1 for i in issues if i["severity"] == "ERROR")
    warnings = sum(1 for i in issues if i["severity"] == "WARNING")
    infos    = sum(1 for i in issues if i["severity"] == "INFO")
    score = max(0, 100 - errors * 10 - warnings * 3 - infos * 1)
    return score, errors, warnings, infos


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_contract.py <api_file.json|yaml>")
        sys.exit(1)

    spec = load_spec(sys.argv[1])
    issues = check_info(spec) + check_paths(spec)

    score, errors, warnings, infos = compute_score(issues)

    if score >= 80:
        status = "COMPLIANT"
    elif score >= 50:
        status = "NEEDS_WORK"
    else:
        status = "NON_COMPLIANT"

    report = {
        "file": sys.argv[1],
        "status": status,
        "score": score,
        "summary": {"errors": errors, "warnings": warnings, "infos": infos},
        "issues": issues,
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))
    sys.exit(1 if errors > 0 else 0)


if __name__ == "__main__":
    main()
