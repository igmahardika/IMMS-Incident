import db from '../../db.js';

export function cleanupLegacyImportArtifacts() {
  const deletedCustomers = db.prepare(`
    DELETE FROM master_customer
    WHERE customer_id LIKE 'LEGACY-CUST-%'
      AND service_id LIKE 'LEGACY-SVC-%'
      AND service_type = 'Legacy Manual Import'
      AND id NOT IN (
        SELECT DISTINCT customer_id
        FROM incidents
        WHERE customer_id IS NOT NULL
      )
  `).run().changes;

  const deletedUsers = db.prepare(`
    DELETE FROM users
    WHERE username LIKE 'legacy-%'
      AND employee_id LIKE 'LEGACY-%'
      AND password_hash = '!legacy-import!'
      AND is_active = 0
      AND id NOT IN (
        SELECT DISTINCT technician_id
        FROM incidents
        WHERE technician_id IS NOT NULL
      )
      AND id NOT IN (
        SELECT DISTINCT created_by
        FROM incidents
        WHERE created_by IS NOT NULL
      )
      AND id NOT IN (
        SELECT DISTINCT user_id
        FROM audit_logs
        WHERE user_id IS NOT NULL
      )
      AND id NOT IN (
        SELECT DISTINCT user_id
        FROM notifications
        WHERE user_id IS NOT NULL
      )
  `).run().changes;

  return {
    deletedLegacyCustomers: deletedCustomers,
    deletedLegacyUsers: deletedUsers,
  };
}
