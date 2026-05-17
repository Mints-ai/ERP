export const ROLES = {
  FOUNDER: "founder",
  C_SUITE: "c_suite",
  MANAGER: "manager",
  SENIOR_EMPLOYEE: "senior_employee",
  EMPLOYEE: "employee",
  INTERN: "intern",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_ALL_EMPLOYEES:   ["founder", "c_suite", "manager"],
  MANAGE_USERS:         ["founder", "c_suite"],
  VIEW_ALL_FINANCE:     ["founder", "c_suite"],
  VIEW_DEPT_FINANCE:    ["founder", "c_suite", "manager"],
  MANAGE_FINANCE:       ["founder", "c_suite", "manager"],
  CREATE_INVOICE:       ["founder", "c_suite", "manager"],
  SUBMIT_EXPENSE:       ["founder", "c_suite", "manager", "senior_employee", "employee"],
  APPROVE_EXPENSE:      ["founder", "c_suite", "manager"],
  CREATE_PROJECT:       ["founder", "c_suite", "manager", "senior_employee"],
  APPROVE_LEAVE:        ["founder", "c_suite", "manager"],
  POST_ANNOUNCEMENT:    ["founder", "c_suite", "manager"],
  VIEW_REPORTS:         ["founder", "c_suite", "manager"],
  SYSTEM_SETTINGS:      ["founder", "c_suite"],
  VIEW_AUDIT_LOG:       ["founder"],
} as const;

export function canAccess(role: string | null | undefined, permission: keyof typeof PERMISSIONS): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// Role display names and badge colors
export const ROLE_META: Record<string, { label: string; color: string }> = {
  founder:         { label: "Founder",         color: "bg-olive-700 text-white" },
  c_suite:         { label: "C-Suite",          color: "bg-olive-600 text-white" },
  manager:         { label: "Manager",          color: "bg-olive-500 text-white" },
  senior_employee: { label: "Senior Employee",  color: "bg-olive-300 text-olive-900" },
  employee:        { label: "Employee",         color: "bg-olive-100 text-olive-700" },
  intern:          { label: "Intern",           color: "bg-gray-100 text-gray-600" },
};
