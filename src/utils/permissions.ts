export type CurrentUser = {
  CURR_USER_ROLE_CODE?: string | null;
  CURR_USER_ROLE_ID?: number | null;
};

type WindowWithCurrentUser = Window & { currentUser?: CurrentUser };

export const PERMISSIONS = {
  LIST: 'bc.comms.list',
  LAUNCH: 'bc.comms.launch',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_ID_OVERRIDE = 90;

const LIST_ROLE_CODES = new Set(['ea_businessadmin', 'ea_itadmin', 'ea_subadmin', 'ea_admin', 'ea_bcplaneditor', 'ea_itplaneditor', 'ea_businessuser', 'ea_ituser']);

const LAUNCH_ROLE_CODES = new Set(['ea_businessadmin', 'ea_itadmin', 'ea_subadmin', 'ea_admin', 'ea_bcplaneditor', 'ea_itplaneditor']);

function normalizeRoleCode(code: CurrentUser['CURR_USER_ROLE_CODE']): string {
  return (code ?? '').toString().trim().toLowerCase();
}

export function getCurrentUser(): CurrentUser {
  const w = window as WindowWithCurrentUser;
  return w.currentUser ?? {};
}

export function getValidPermissions(opts?: { env?: string }): Permission[] {
  const env = opts?.env ?? process.env.NODE_ENV;

  // DEV: allow everything
  if (env !== 'production') {
    return [PERMISSIONS.LIST, PERMISSIONS.LAUNCH];
  }

  const user = getCurrentUser();
  const roleId = Number(user.CURR_USER_ROLE_ID);
  const roleCode = normalizeRoleCode(user.CURR_USER_ROLE_CODE);

  const hasOverride = roleId === ROLE_ID_OVERRIDE;

  const canList = hasOverride || LIST_ROLE_CODES.has(roleCode);
  const canLaunch = hasOverride || LAUNCH_ROLE_CODES.has(roleCode);

  const perms: Permission[] = [];
  if (canList) perms.push(PERMISSIONS.LIST);
  if (canLaunch) perms.push(PERMISSIONS.LAUNCH);

  return perms;
}

export function hasAnyNotificationsPermission(opts?: { env?: string }): boolean {
  return getValidPermissions(opts).length > 0;
}
