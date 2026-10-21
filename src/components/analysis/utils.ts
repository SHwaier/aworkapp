import { toast } from "sonner";

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}
