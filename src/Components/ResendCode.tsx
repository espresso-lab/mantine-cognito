import { Anchor, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "../Hooks/useTranslation.ts";

interface ResendCodeProps {
  onResend: () => Promise<void>;
  cooldownSeconds?: number;
  startWithCooldown?: boolean;
  label?: string;
}

export function ResendCode({
  onResend,
  cooldownSeconds = 30,
  startWithCooldown = false,
  label,
}: ResendCodeProps) {
  const translation = useTranslation();
  const [until, setUntil] = useState(() =>
    startWithCooldown ? Date.now() + cooldownSeconds * 1000 : 0,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until, now]);

  const remaining = Math.max(0, Math.ceil((until - now) / 1000));

  if (remaining > 0) {
    return (
      <Text c="dimmed" size="sm">
        {translation.texts.resendIn} {remaining} s
      </Text>
    );
  }

  return (
    <Anchor
      component="button"
      type="button"
      size="sm"
      onClick={async () => {
        setUntil(Date.now() + cooldownSeconds * 1000);
        setNow(Date.now());
        try {
          await onResend();
        } catch {
          setUntil(0);
        }
      }}
    >
      {label ?? translation.links.resendCode}
    </Anchor>
  );
}
