import { Anchor, Button, Center, Group, Stack, Text, TextInput } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import { CodeInput } from "./CodeInput";
import { ResendCode } from "./ResendCode";
import { useTranslation } from "../Hooks/useTranslation.ts";

type RegisterStep = "form" | "verification";

export function Register() {
  const translation = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<RegisterStep>("form");
  const { register, confirmRegistration, login, sendAccountConfirmationCode, setStage } = useAuth();

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: isEmail(translation.validation.email),
      password: (value) => (value.length >= 8 ? null : translation.validation.password),
    },
  });

  const verificationForm = useForm({
    initialValues: { totp: "" },
    validate: {
      totp: (value) => (value.length === 6 ? null : translation.validation.code),
    },
  });

  async function onSubmit() {
    setLoading(true);
    try {
      await register(form.values);
      setStep("verification");
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UsernameExistsException":
            form.setFieldError("email", reason.message);
            break;
          case "InvalidPasswordException":
            form.setFieldError("password", reason.message);
            break;
          default:
            form.setFieldError("password", translation.errors.generic);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setLoading(true);
    try {
      await confirmRegistration({ email: form.values.email, totp: verificationForm.values.totp });
      const result = await login(form.values);
      if (!result.isSignedIn) {
        setStage("login");
      }
    } catch (reason) {
      verificationForm.setFieldError(
        "totp",
        reason instanceof Error && reason.name === "CodeMismatchException"
          ? translation.validation.code
          : translation.errors.generic,
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "verification") {
    return (
      <form onSubmit={verificationForm.onSubmit(onVerify)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed" ta="center">
            {translation.texts.codeSentTo}{" "}
            <Text span fw={600} size="sm">
              {form.values.email}
            </Text>
          </Text>
          <CodeInput
            autoFocus
            onComplete={onVerify}
            disabled={loading}
            {...verificationForm.getInputProps("totp")}
          />
          <Center>
            <ResendCode
              startWithCooldown
              onResend={() => sendAccountConfirmationCode(form.values.email)}
            />
          </Center>
          <Button type="submit" fullWidth loading={loading}>
            {translation.buttons.code}
          </Button>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          autoFocus
          label={translation.fields.email}
          placeholder={translation.placeholders.email}
          withAsterisk
          autoComplete="username"
          {...form.getInputProps("email")}
        />
        <NewPasswordInput
          label={translation.fields.password}
          placeholder={translation.placeholders.password}
          withAsterisk
          autoComplete="new-password"
          showRequirements={form.isDirty("password") || form.isTouched("password")}
          {...form.getInputProps("password")}
        />
        <Group justify="space-between" mt="xs">
          <Anchor
            component="button"
            type="button"
            onClick={() => {
              form.reset();
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
          <Button type="submit" loading={loading}>
            {translation.buttons.register}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
