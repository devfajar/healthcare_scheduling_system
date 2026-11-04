/**
 * Cache TTL Configuration (in seconds)
 * Targeted based on access frequency & data volatility
 */
export const CACHE_TTL = {
  /**
   * Doctors Catalog:
   * Highest read traffic (all patients browse doctors), lowest mutation frequency.
   * TTL: 15 minutes (900 seconds)
   */
  DOCTORS: 900,

  /**
   * Doctor Profile Detail:
   * Frequently opened by patients during doctor selection.
   * TTL: 15 minutes (900 seconds)
   */
  DOCTOR_DETAIL: 900,

  /**
   * Schedules & Doctor Availability Slots:
   * Frequently queried by multiple patients seeking appointments.
   * Kept at 60 seconds for freshness, with immediate eviction upon booking/cancellation.
   */
  SCHEDULES: 60,

  /**
   * Single Schedule Detail:
   * Consulted for appointment verification.
   * TTL: 60 seconds
   */
  SCHEDULE_DETAIL: 60,

  /**
   * Inter-Service Token Validation:
   * Evaluated on EVERY request across the entire system.
   * Caching this eliminates HTTP hops between Schedule Service and Auth Service.
   * TTL: 120 seconds (2 minutes)
   */
  AUTH_TOKEN: 120,

  /**
   * Customers Catalog:
   * Primarily administrative access.
   * TTL: 5 minutes (300 seconds)
   */
  CUSTOMERS: 300,

  /**
   * Single Customer Detail:
   * TTL: 5 minutes (300 seconds)
   */
  CUSTOMER_DETAIL: 300,
} as const;

/**
 * Cache Key Namespaces to avoid key collisions
 */
export const CACHE_PREFIX = {
  DOCTOR: 'healthcare:doctor',
  DOCTORS_LIST: 'healthcare:doctors:list',
  SCHEDULE: 'healthcare:schedule',
  SCHEDULES_LIST: 'healthcare:schedules:list',
  AUTH_TOKEN: 'healthcare:auth:token',
  CUSTOMER: 'healthcare:customer',
  CUSTOMERS_LIST: 'healthcare:customers:list',
} as const;
