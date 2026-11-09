/** Deliberately excludes request bodies, phone numbers, and cookies. */
export function logClientError(event: string) {
  console.error(JSON.stringify({ level: 'error', event, time: new Date().toISOString() }));
}
