import { DateTime, Info } from 'luxon';
/**
 * Validates if a given string is a valid IANA timezone name.
 */
export const isValidTimezone = (zone: string): boolean => {
  if (!zone) return false;
  return Info.isValidIANAZone(zone);
};
/**
 * Parses a date string (YYYY-MM-DD) into a Luxon DateTime instance in a specific timezone.
 */
export const parseLocalDate = (dateStr: string, zone: string): DateTime => {
  return DateTime.fromISO(dateStr, { zone }).startOf('day');
};
/**
 * Combines a date string (YYYY-MM-DD) and a time string (HH:mm) into a Luxon DateTime instance in a specific timezone.
 */
export const combineDateAndTimeToDateTime = (dateStr: string, timeStr: string, zone: string): DateTime => {
  return DateTime.fromISO(`${dateStr}T${timeStr}`, { zone });
};
/**
 * Returns the current date and time in the specified timezone.
 */
export const getNowInZone = (zone: string): DateTime => {
  return DateTime.now().setZone(zone);
};
/**
 * Formats a JavaScript Date object into a readable ISO string in the target timezone.
 */
export const formatToZoneISO = (date: Date, zone: string): string => {
  return DateTime.fromJSDate(date).setZone(zone).toISO() || '';
};