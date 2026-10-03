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

  const form = useForm({
    initialValues: { totp: "" },
    validate: { totp: isNotEmpty(translation.validation.code) },
  });

  if (userAttributes?.email_verified !== false) {
    return null;
  }

  async function onVerify() {
    setLoading(true);
    try {
      await verifyAttribute({ userAttribute: "email", totp: form.values.totp });
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Alert color={color} icon={<IconMailExclamation />} title={translation.title.verifyEmail}>
      <form onSubmit={form.onSubmit(onVerify)}>
        <Stack gap="sm">
          <Text size="sm">{translation.texts.verifyEmail}</Text>
          <Text size="sm">
            {translation.texts.codeSentTo}{" "}
            <Text span fw={600} size="sm">
              {String(userAttributes.email)}
            </Text>
          </Text>
          <CodeInput onComplete={onVerify} disabled={loading} {...form.getInputProps("totp")} />
          <Group justify="space-between" wrap="wrap">
            <ResendCode onResend={sendEmailConfirmationCode} />
            <Button type="submit" loading={loading}>
              {translation.buttons.code}
            </Button>
          </Group>
        </Stack>
      </form>
    </Alert>
  );
}
