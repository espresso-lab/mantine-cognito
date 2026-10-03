import { Alert, Button, Group, Stack, Text, type MantineColor } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconMailExclamation } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { useTranslation } from "../Hooks/useTranslation.ts";
import { CodeInput } from "./CodeInput";
import { ResendCode } from "./ResendCode";

export interface EmailVerificationProps {
  color?: MantineColor;
  onVerified?: () => void;
}

export function EmailVerification({ color, onVerified }: EmailVerificationProps) {
  const { userAttributes, verifyAttribute, sendEmailConfirmationCode } = useAuth();
  const translation = useTranslation();
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const form = useForm({
    initialValues: { totp: "" },
    validate: { totp: isNotEmpty(translation.validation.code) },
  });

  if (userAttributes?.email_verified !== false) {
    return null;
  }

  async function onVerify(code: string) {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      await verifyAttribute({ userAttribute: "email", totp: code });
      form.reset();
      onVerified?.();
    } catch (reason) {
      form.setFieldValue("totp", "");
      form.setFieldError(
        "totp",
        reason instanceof Error && reason.name === "LimitExceededException"
          ? translation.errors.limitExceeded
          : translation.validation.code,
      );
      setAttempt((count) => count + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.onSubmit(({ totp }) => onVerify(totp))}>
      <Stack gap="sm">
        <Alert color={color} icon={<IconMailExclamation />} title={translation.title.verifyEmail}>
          <Stack gap="xs">
            <Text size="sm">{translation.texts.verifyEmail}</Text>
            <Text size="sm">
              {translation.texts.codeSentTo}{" "}
              <Text span fw={600} size="sm">
                {String(userAttributes.email)}
              </Text>
            </Text>
          </Stack>
        </Alert>
        <CodeInput
          key={attempt}
          autoFocus={attempt > 0}
          onComplete={onVerify}
          {...form.getInputProps("totp")}
        />
        <Group justify="space-between" wrap="wrap">
          <ResendCode onResend={sendEmailConfirmationCode} />
          <Button type="submit" loading={loading}>
            {translation.buttons.code}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
