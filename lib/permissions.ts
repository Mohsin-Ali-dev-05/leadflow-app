export type Perm =
  | "crm.view"
  | "crm.create"
  | "crm.edit"
  | "crm.delete"
  | "crm.export"
  | "crm.value.view"
  | "rules.manage"
  | "integrations.manage"
  | "audit.view"
  | "users.manage";

const USER: Perm[] = ["crm.view", "crm.create", "crm.edit"];
const ADMIN: Perm[] = [
  ...USER,
  "crm.delete",
  "crm.export",
  "crm.value.view",
  "rules.manage",
  "integrations.manage",
  "audit.view",
  "users.manage",
];
const OWNER: Perm[] = [...ADMIN];

export function effectivePerms(user: {
  baseRole: string;
  permissions: unknown;
}): Set<Perm> {
  const base =
    user.baseRole === "OWNER"
      ? OWNER
      : user.baseRole === "ADMIN"
        ? ADMIN
        : USER;
  const set = new Set<Perm>(base);
  const overrides = (user.permissions ?? {}) as Record<string, boolean>;
  for (const [k, v] of Object.entries(overrides)) {
    if (v) set.add(k as Perm);
    else set.delete(k as Perm);
  }
  return set;
}

export function can(user: { baseRole: string; permissions: unknown }, p: Perm) {
  return effectivePerms(user).has(p);
}
