import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  InputLabel,
  PinInput,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { NewPasswordInput } from "./NewPasswordInput";
import { useAuth } from "../Hooks/useAuth";
import { useTranslation } from "../Hooks/useTranslation.ts";

type ForgotPasswordStep = "email" | "reset";

export function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword, setStage } = useAuth();
  const translation = useTranslation();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ForgotPasswordStep>("email");

  const emailForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: isEmail(translation.validation.email),
    },
  });

  const resetForm = useForm({
    initialValues: {
      totp: "",
      password: "",
    },
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
        emailForm.setFieldError("email", reason.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmReset() {
    setLoading(true);
    try {
      await confirmForgotPassword({
        ...emailForm.values,
        ...resetForm.values,
      });
      setStage("login");
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "CodeMismatchException":
            resetForm.setFieldError("totp", reason.message);
            break;
          default:
            resetForm.setFieldError("password", reason.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={resetForm.onSubmit(onConfirmReset)}>
        <Box>
          <InputLabel required>{translation.title.mfa}</InputLabel>
          <Center>
            <PinInput
              oneTimeCode
              type="number"
              size="md"
              length={6}
              autoFocus
              {...resetForm.getInputProps("totp")}
            />
          </Center>
          <Text c="red" size="xs">
            {resetForm.errors.totp}
          </Text>
        </Box>
        <NewPasswordInput
          label={translation.fields.newPassword}
          placeholder={translation.placeholders.newPassword}
          withAsterisk
          autoComplete="new-password"
          {...resetForm.getInputProps("password")}
        />
        <Group justify="space-between" mt="lg">
          <Anchor
            onClick={() => {
              resetForm.reset();
              setStage("login");
            }}
            c="dimmed"
            size="sm"
          >
            <Center inline>
              <IconArrowLeft size={20} />
              <Text ml={5}>{translation.links.backToLogin}</Text>
            </Center>
          </Anchor>
          <Button type="submit" loading={loading}>{translation.buttons.newPassword}</Button>
        </Group>
      </form>
    );
  }

  return (
    <form onSubmit={emailForm.onSubmit(onRequestReset)}>
      <TextInput
        label={translation.fields.email}
        placeholder={translation.placeholders.email}
        withAsterisk
        autoComplete="username"
        {...emailForm.getInputProps("email")}
      />
      <Group justify="space-between" mt="lg">
        <Anchor
          onClick={() => {
            emailForm.reset();
            setStage("login");
          }}
          c="dimmed"
          size="sm"
        >
          <Center inline>
            <IconArrowLeft size={20} />
            <Text ml={5}>{translation.links.backToLogin}</Text>
          </Center>
        </Anchor>
        <Button type="submit" loading={loading}>{translation.buttons.submit}</Button>
      </Group>
    </form>
  );
}
