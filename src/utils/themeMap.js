/**
 * Unified UI Mapping for NCAL Statuses and operational states.
 * Maps IMMS-specific variables to standard DaisyUI semantic classes.
 */

export const NCAL_THEME_MAP = {
  // Main NCAL Severities
  BLACK: 'badge-neutral',
  RED: 'badge-error',
  ORANGE: 'badge-warning',
  YELLOW: 'badge-warning',
  BLUE: 'badge-info',
  
  // Semantic Fallbacks
  DANGER: 'badge-error',
  SUCCESS: 'badge-success',
  INFO: 'badge-info',
  WARNING: 'badge-warning'
};

export const ROLE_THEME_MAP = {
  ADMIN: 'badge-primary',
  VIEWER: 'badge-ghost',
  EDITOR: 'badge-secondary',
  SD: 'badge-accent' // Service Desk
};

export const GRADE_THEME_MAP = {
  VIP: 'badge-primary',
  Gold: 'badge-warning',
  Silver: 'badge-neutral',
  Bronze: 'badge-ghost'
};

/**
 * Returns the DaisyUI badge class for a given NCAL status.
 * @param {string} status - The NCAL string (e.g., 'RED', 'BLACK')
 * @returns {string} - The DaisyUI class string (e.g., 'badge-error')
 */
export function getNcalBadgeClass(status) {
  if (!status) return 'badge-neutral';
  return NCAL_THEME_MAP[status.toUpperCase()] || 'badge-neutral';
}
