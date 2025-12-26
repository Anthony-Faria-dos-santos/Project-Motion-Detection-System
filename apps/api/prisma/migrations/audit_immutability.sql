-- Prevent modification or deletion of audit log entries.
-- This trigger ensures audit logs remain immutable once written.

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. DELETE and UPDATE operations are not allowed on audit_logs table.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Prevent DELETE
DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_logs;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Prevent UPDATE
DROP TRIGGER IF EXISTS audit_log_no_update ON audit_logs;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();
