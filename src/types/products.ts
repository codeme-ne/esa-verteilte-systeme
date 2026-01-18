/**
 * Product variants for the course
 * - self-paced: alle Module sofort verfügbar, reine E-Mail-Sequenzen
 * - live: Module werden gestaffelt freigeschaltet
 */
export type CourseProduct = "self-paced" | "live";

export const DEFAULT_PRODUCT: CourseProduct = "live";
