import { params } from './consts';

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

const LIST_ROLE_CODES = new Set<string>(Array.isArray(params.listUsers) ? params.listUsers.map((each) => String(each).toLowerCase()) : []);
const LAUNCH_ROLE_CODES = new Set<string>(Array.isArray(params.launchUsers) ? params.launchUsers.map((each) => String(each).toLowerCase()) : []);

function normalizeRoleCode(code: CurrentUser['CURR_USER_ROLE_CODE']): string {
  return (code ?? '').toString().trim().toLowerCase();
}

//Fetches the current user from window.currentUser (fast path) or via rbf queries (host).
export async function getCurrentUser(): Promise<CurrentUser> {
  // Check params first
  if (params?.userDetails) {
    console.log('Using userDetails from params:', params.userDetails);
    const { CURR_USER_ROLE_CODE, CURR_USER_ROLE_ID } = params.userDetails;
    
    return {
      CURR_USER_ROLE_CODE,
      CURR_USER_ROLE_ID,
    };
  }

  // Get user from window first if possible, mainly for non-legacy customers
  const w = window as WindowWithCurrentUser;
  if (w?.currentUser) {
    return w.currentUser ?? {};
  }

  // If window.currentUser is not available, check the rb function for the user details, first we check if they're an admin
  const isAdmin = (typeof (window as any).rb?.newui?.webPageData?.userDetails?.id !== 'undefined' ? (window as any).rb.newui.webPageData.admin : null) as number | null;

  // If they are an admin, we don't need to query the DB for the role ids and integration codes
  if (isAdmin) {
    return { CURR_USER_ROLE_ID: 90 };
  }

  // Window is not available, and they are not an admin. Get the user id from rb
  const userId = (typeof (window as any).rb?.newui?.webPageData?.userDetails?.id !== 'undefined' ? (window as any).rb.newui.webPageData.userDetails.id : null) as number | null;

  // if we have no way to query, return empty object
  if (!userId) {
    return {};
  }

  // Get role id and integration code
  try {
    const roleIdQuery = await new Promise((resolve, reject) => {
      const qStr = `SELECT role#id FROM User WHERE id = '${userId}'`;

      //@ts-ignore attached to window
      rbf_selectQuery(qStr, 1, resolve, true);
    });

    const roleCodeQuery = await new Promise((resolve, reject) => {
      const qStr = `SELECT role#value FROM User WHERE id = '${userId}'`;
      //@ts-ignore attached to window
      rbf_selectQuery(qStr, 1, resolve, true);
    });

    const roleId = roleIdQuery[0][0];
    const roleCode = roleCodeQuery[0][0];

    const user: CurrentUser = {
      CURR_USER_ROLE_ID: roleId,
      CURR_USER_ROLE_CODE: roleCode,
    };

    return user;
  } catch (err) {
    console.warn('getCurrentUser: failed to fetch role info', err);
    return {};
  }
}

/**
 * Determine valid permissions for the current user.
 * NOTE: This is async now — callers should await it.
 */
export async function getValidPermissions(opts?: { env?: string }): Promise<Permission[]> {
  const env = opts?.env ?? process.env.NODE_ENV;

  // DEV: allow everything
  if (env !== 'production') {
    return [PERMISSIONS.LIST, PERMISSIONS.LAUNCH];
  }

  const user = await getCurrentUser();

  console.log('USR', user);

  const roleId = Number(user.CURR_USER_ROLE_ID);
  const roleCode = normalizeRoleCode(user.CURR_USER_ROLE_CODE);

  const hasOverride = roleId === ROLE_ID_OVERRIDE;

  const canList = hasOverride || (roleCode && LIST_ROLE_CODES.has(roleCode));
  const canLaunch = hasOverride || (roleCode && LAUNCH_ROLE_CODES.has(roleCode));

  const perms: Permission[] = [];
  if (canList) perms.push(PERMISSIONS.LIST);
  if (canLaunch) perms.push(PERMISSIONS.LAUNCH);

  return perms;
}

/**
 * Convenience: returns boolean if user has any of the notifications perms
 */
export async function hasAnyNotificationsPermission(opts?: { env?: string }): Promise<boolean> {
  const perms = await getValidPermissions(opts);
  return perms.length > 0;
}
