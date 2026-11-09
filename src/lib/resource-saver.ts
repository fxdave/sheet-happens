/**
 * Resource saver: a per-browser switch that drops the animated background and every looping
 * animation. A cookie rather than a member column, because the cost is the device's, not the
 * person's — the same account can want it on a laptop and not on a desktop.
 */
export const resourceSaverCookieName = "sheet-happens-resource-saver";

export const resourceSaverMaxAgeSeconds = 60 * 60 * 24 * 365;
