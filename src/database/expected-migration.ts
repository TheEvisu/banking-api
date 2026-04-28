/**
 * The migration name expected to be the most recent applied migration. Bump this in the same
 * commit that introduces a new migration so /health/ready can detect drift between the running
 * binary and the database.
 */
export const EXPECTED_LATEST_MIGRATION = 'StatementCursorIndex1735000005000';
