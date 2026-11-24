/** Time-based greeting used on the dashboard. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Hallo";
  return "Guten Abend";
}

export function useGreeting(now: Date = new Date()): string {
  return greetingForHour(now.getHours());
}
