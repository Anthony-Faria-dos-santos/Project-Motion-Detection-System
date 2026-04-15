import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
} from '../src/lib/permissions';

describe('permissions matrix', () => {
  it('covers the 5 canonical roles', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([
      'ADMIN',
      'ANALYST',
      'OPERATOR',
      'SUPER_ADMIN',
      'VIEWER',
    ]);
  });

  describe('getPermissionsForRole', () => {
    it('returns an empty array for an unknown role', () => {
      expect(getPermissionsForRole('UNKNOWN_ROLE')).toEqual([]);
    });

    it('returns an empty array for an empty string', () => {
      expect(getPermissionsForRole('')).toEqual([]);
    });

    it('returns the configured permissions for VIEWER', () => {
      expect(getPermissionsForRole('VIEWER')).toContain('camera:read');
      expect(getPermissionsForRole('VIEWER')).not.toContain('camera:create');
    });

    it('SUPER_ADMIN is the only role with user-management permissions', () => {
      for (const role of ['VIEWER', 'OPERATOR', 'ANALYST', 'ADMIN']) {
        const perms = getPermissionsForRole(role);
        expect(perms).not.toContain('user:read');
        expect(perms).not.toContain('user:delete');
      }
      expect(getPermissionsForRole('SUPER_ADMIN')).toEqual(
        expect.arrayContaining(['user:read', 'user:create', 'user:update', 'user:delete']),
      );
    });

    it('only SUPER_ADMIN can delete cameras', () => {
      expect(getPermissionsForRole('ADMIN')).not.toContain('camera:delete');
      expect(getPermissionsForRole('SUPER_ADMIN')).toContain('camera:delete');
    });

    it('OPERATOR inherits VIEWER read permissions and adds event:review', () => {
      const viewer = getPermissionsForRole('VIEWER');
      const op = getPermissionsForRole('OPERATOR');
      for (const p of viewer) {
        expect(op).toContain(p);
      }
      expect(op).toContain('event:review');
      expect(viewer).not.toContain('event:review');
    });
  });

  describe('hasPermission', () => {
    it('returns true when the role includes the permission', () => {
      expect(hasPermission('ANALYST', 'incident:create')).toBe(true);
    });

    it('returns false when the role does not include the permission', () => {
      expect(hasPermission('VIEWER', 'camera:delete')).toBe(false);
    });

    it('returns false for unknown roles', () => {
      expect(hasPermission('GUEST', 'camera:read')).toBe(false);
    });
  });
});
