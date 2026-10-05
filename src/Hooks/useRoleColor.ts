import { useMantineTheme } from "@mantine/core";

const FALLBACK = { success: "teal", warning: "yellow" } as const;

export function useRoleColor(role: keyof typeof FALLBACK): string {
  const { colors } = useMantineTheme();
  return role in colors ? role : FALLBACK[role];
}
