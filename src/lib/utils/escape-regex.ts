/**
 * Escape special regex characters in a string to prevent ReDoS attacks
 * when using user input in MongoDB $regex queries.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
