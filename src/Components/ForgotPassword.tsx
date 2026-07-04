import { Anchor, Button, Center, Group, Stack, Text, TextInput } from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { NewPasswordInput } from "./NewPasswordInput";
import { CodeInput } from "./CodeInput";
import { ResendCode } from "./ResendCode";
import { useAuth } from "../Hooks/useAuth";
import { useTranslation } from "../Hooks/useTranslation.ts";

type ForgotPasswordStep = "email" | "reset";

export function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword, login, setStage } = useAuth();
  const translation = useTranslation();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ForgotPasswordStep>("email");

  const emailForm = useForm({
    initialValues: { email: "" },
    validate: { email: isEmail(translation.validation.email) },
  });

  const resetForm = useForm({
    initialValues: { totp: "", password: "" },
    validate: {
      totp: isNotEmpty(translation.validation.code),
      password: isNotEmpty(translation.validation.password),
    },
  });

  async function onRequestReset() {
    setLoading(true);
    try {
      await forgotPassword(emailForm.values);
      setStep("reset");
    } catch (reason) {
      if (reason instanceof Error) {
        emailForm.setFieldError(
          "email",
          reason.name === "LimitExceededException"
            ? translation.errors.limitExceeded
            : reason.message,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmReset() {
    setLoading(true);
    try {
      await confirmForgotPassword({ ...emailForm.values, ...resetForm.values });
      const result = await login({
        email: emailForm.values.email,
        password: resetForm.values.password,
      });
      if (!result.isSignedIn) {
        setStage("login");
      }
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "CodeMismatchException":
          case "ExpiredCodeException":
            resetForm.setFieldError("totp", translation.validation.code);
            break;
          case "LimitExceededException":
            resetForm.setFieldError("totp", translation.errors.limitExceeded);
            break;
          default:
            resetForm.setFieldError("password", reason.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const backToLogin = (
    <Anchor
      component="button"
      type="button"
      onClick={() => {
        resetForm.reset();
        emailForm.reset();
        setStage("login");
      }}
      c="dimmed"
      size="sm"
    >
      <Center inline>
        <IconArrowLeft size={16} />
        <Text ml={5} size="sm">
          {translation.links.backToLogin}
        </Text>
      </Center>
    </Anchor>
  );

  if (step === "reset") {
    return (
      <form onSubmit={resetForm.onSubmit(onConfirmReset)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed" ta="center">
            {translation.texts.codeSentTo}{" "}
            <Text span fw={600} size="sm">
              {emailForm.values.email}
            </Text>
          </Text>
          <CodeInput
            label={translation.fields.code}
            autoFocus
            disabled={loading}
            {...resetForm.getInputProps("totp")}
          />
          <Center>
            <ResendCode startWithCooldown onResend={() => forgotPassword(emailForm.values)} />
          </Center>
          <NewPasswordInput
            label={translation.fields.newPassword}
            placeholder={translation.placeholders.newPassword}
            withAsterisk
            showRequirements
            autoComplete="new-password"
            {...resetForm.getInputProps("password")}
          />
          <Group justify="space-between" mt="xs">
            {backToLogin}
            <Button type="submit" loading={loading}>
              {translation.buttons.newPassword}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={emailForm.onSubmit(onRequestReset)}>
      <Stack gap="md">
        <TextInput
          autoFocus
          label={translation.fields.email}
          placeholder={translation.placeholders.email}
          withAsterisk
          autoComplete="username"
          {...emailForm.getInputProps("email")}
        />
        <Group justify="space-between" mt="xs">
          {backToLogin}
          <Button type="submit" loading={loading}>
            {translation.buttons.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
