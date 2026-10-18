import { asRecord, asStringArray } from "./json";

export const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldDef = {
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
};

export function isFieldType(t: string): t is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(t);
}

export function slugKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function validateFieldValue(
  def: FieldDef,
  value: unknown,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  switch (def.type) {
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return `${def.label} must be a number`;
      return null;
    }
    case "checkbox": {
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        return `${def.label} must be true or false`;
      }
      return null;
    }
    case "date": {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return `${def.label} must be a date`;
      return null;
    }
    case "dropdown": {
      const options = def.options ?? [];
      if (options.length && !options.includes(String(value))) {
        return `${def.label} must be one of: ${options.join(", ")}`;
      }
      return null;
    }
    default:
      return typeof value === "string" || typeof value === "number"
        ? null
        : `${def.label} must be text`;
  }
}

export function isFilled(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return true;
  return String(value).trim().length > 0;
}

export function missingRequired(
  defs: FieldDef[],
  values: unknown,
  requiredKeys?: string[],
) {
  const record = asRecord(values);
  const keys = requiredKeys ?? defs.filter((d) => d.required).map((d) => d.key);
  return keys.filter((k) => {
    const def = defs.find((d) => d.key === k);
    return !isFilled(record[k] ?? (def ? record[def.key] : undefined));
  });
}

export function validateValues(defs: FieldDef[], values: unknown) {
  const record = asRecord(values);
  const errors: string[] = [];
  for (const def of defs) {
    const err = validateFieldValue(def, record[def.key]);
    if (err) errors.push(err);
  }
  const allowed = new Set(defs.map((d) => d.key));
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) errors.push(`Unknown field: ${key}`);
  }
  return errors;
}

export function normalizeValues(defs: FieldDef[], values: unknown) {
  const record = asRecord(values);
  const out: Record<string, unknown> = {};
  for (const def of defs) {
    if (!(def.key in record)) continue;
    const v = record[def.key];
    if (def.type === "number" && v !== "" && v != null) out[def.key] = Number(v);
    else if (def.type === "checkbox")
      out[def.key] = v === true || v === "true" || v === "on";
    else out[def.key] = v;
  }
  return out;
}

export { asRecord, asStringArray };
