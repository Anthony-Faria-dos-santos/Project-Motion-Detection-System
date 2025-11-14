export const ROLE_PERMISSIONS: Record<string, string[]> = {
  VIEWER: [
    'dashboard:read', 'camera:read', 'event:read', 'rule:read',
    'config:read', 'preset:read', 'health:read',
  ],
  OPERATOR: [
    'dashboard:read', 'camera:read', 'event:read', 'event:review', 'event:export',
    'rule:read', 'config:read', 'preset:read', 'health:read',
  ],
  ANALYST: [
    'dashboard:read', 'camera:read', 'event:read', 'event:review', 'event:export',
    'incident:read', 'incident:create', 'incident:update',
    'rule:read', 'config:read', 'preset:read', 'audit:read', 'health:read',
  ],
  ADMIN: [
    'dashboard:read',
    'camera:read', 'camera:create', 'camera:update',
    'event:read', 'event:review', 'event:export',
    'incident:read', 'incident:create', 'incident:update',
    'rule:read', 'rule:create', 'rule:update', 'rule:delete',
    'config:read', 'config:update', 'config:rollback',
    'preset:read', 'preset:create', 'preset:apply',
    'audit:read', 'health:read',
  ],
  SUPER_ADMIN: [
    'dashboard:read',
    'camera:read', 'camera:create', 'camera:update', 'camera:delete',
    'event:read', 'event:review', 'event:export',
    'incident:read', 'incident:create', 'incident:update',
    'rule:read', 'rule:create', 'rule:update', 'rule:delete',
    'config:read', 'config:update', 'config:rollback',
    'preset:read', 'preset:create', 'preset:apply',
    'audit:read', 'health:read',
    'user:read', 'user:create', 'user:update', 'user:delete',
  ],
};

export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: string, permission: string): boolean {
  return getPermissionsForRole(role).includes(permission);
}
