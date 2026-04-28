/**
 * Unified UI Mapping for NCAL Statuses and operational states.
 * Maps Nexaris-specific variables to manual Tailwind utility classes instead of DaisyUI components.
 */

export const NCAL_THEME_MAP = {
  // Main NCAL Severities
  BLACK: { bg: 'bg-foreground/5 dark:bg-foreground/10', text: 'text-ncal-black' },
  RED: { bg: 'bg-ncal-red/10', text: 'text-ncal-red' },
  ORANGE: { bg: 'bg-ncal-orange/10', text: 'text-ncal-orange' },
  YELLOW: { bg: 'bg-ncal-yellow/10', text: 'text-ncal-yellow' },
  BLUE: { bg: 'bg-ncal-blue/10', text: 'text-ncal-blue' },
  
  // Semantic Fallbacks
  DANGER: { bg: 'bg-error/10', text: 'text-error' },
  SUCCESS: { bg: 'bg-success/10', text: 'text-success' },
  INFO: { bg: 'bg-info/10', text: 'text-info' },
  WARNING: { bg: 'bg-warning/10', text: 'text-warning' }
};

export const ROLE_THEME_MAP = {
  ADMIN: { bg: 'bg-primary/10', text: 'text-primary' },
  VIEWER: { bg: 'bg-foreground/10', text: 'text-foreground/80' },
  EDITOR: { bg: 'bg-secondary/10', text: 'text-secondary' },
  SD: { bg: 'bg-accent/10', text: 'text-accent' } // Service Desk
};

export const GRADE_THEME_MAP = {
  VIP: { bg: 'bg-primary/10', text: 'text-primary' },
  Gold: { bg: 'bg-warning/10', text: 'text-warning' },
  Silver: { bg: 'bg-foreground/10', text: 'text-foreground/70' },
  Bronze: { bg: 'bg-foreground/5', text: 'text-foreground/60' }
};

/**
 * Returns the object containing bg and text classes for a given NCAL status.
 * @param {string} status - The NCAL string (e.g., 'RED', 'BLACK')
 * @returns {object} - Object with styling strings.
 */
export function getNcalBadgeClass(status) {
  if (!status) return { bg: 'bg-foreground/10', text: 'text-foreground/70' };
  return NCAL_THEME_MAP[status.toUpperCase()] || { bg: 'bg-foreground/10', text: 'text-foreground/70' };
}
