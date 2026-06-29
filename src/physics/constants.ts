/**
 * Physical constants for the impact model.
 *
 * Reference: Collins, Melosh & Marcus (2005), "Earth Impact Effects Program,"
 * Meteoritics & Planetary Science 40.
 *
 * All values are SI unless noted in the name/comment.
 */

// --- Densities (kg/m^3) -------------------------------------------------------
export const DENSITY_STONY = 3000; // rocky impactor
export const DENSITY_IRON = 7800; // iron impactor
export const DENSITY_COMET = 1000; // cometary impactor
export const DENSITY_TARGET = 2500; // sedimentary crust (impact site)
export const DENSITY_WATER = 1000; // ocean target

// --- Earth / general ----------------------------------------------------------
export const G = 9.81; // surface gravity, m/s^2
export const V_ESCAPE_EARTH = 11186; // Earth escape velocity, m/s
export const EARTH_RADIUS_M = 6.371e6; // mean Earth radius, m

// --- Energy -------------------------------------------------------------------
export const J_PER_MEGATON = 4.184e15; // joules per megaton of TNT

// --- Orbital (used from phase 2 onward) --------------------------------------
export const AU_M = 1.495978707e11; // astronomical unit, meters
export const MU_SUN = 1.32712440018e20; // Sun gravitational parameter, m^3/s^2

// --- Crater scaling -----------------------------------------------------------
/** Transient-crater diameter (m) above which Earth craters become complex. */
export const COMPLEX_TRANSITION_DTC_M = 2560;
/** Reference complex-crater transition diameter Dc (m) from EIEP. */
export const COMPLEX_CRATER_DC_M = 3200;

// --- Deflection ---------------------------------------------------------------
/** Momentum enhancement factor measured by NASA's DART mission (β ≈ 3.6). */
export const DART_BETA = 3.6;

/** Newtonian gravitational constant, m^3 kg^-1 s^-2 (for the gravity tractor). */
export const GRAVITATIONAL_CONSTANT = 6.674e-11;

/**
 * Deflection-method tuning constants. These are ILLUSTRATIVE values chosen so
 * the "Defend Earth" game is balanced and teaches the right intuitions — they
 * are not precise engineering figures.
 */
/** Fraction of a nuclear yield that couples into net asteroid momentum. */
export const NUCLEAR_COUPLING = 0.05;
/** Speed of the ablated plume from a nuclear standoff burst (m/s). */
export const NUCLEAR_EJECTA_VEL = 3000;
/** Fraction of laser beam power converted to ablation thrust. */
export const LASER_EFFICIENCY = 0.08;
/** Effective exhaust velocity of the laser-ablated plume (m/s). */
export const LASER_EXHAUST_VEL = 1500;
