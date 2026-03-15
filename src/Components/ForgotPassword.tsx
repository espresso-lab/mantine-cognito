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
import {useTranslation} from "../Hooks/useTranslation.ts";

export function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword, setStage } = useAuth();
  const translation = useTranslation();

  const [loading, setLoading] = useState(false);
  const [nextStage, setNextStage] = useState(false);
  const forgotPasswordForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: isEmail(translation.validation.email),
    },
  });

  const newPasswordForm = useForm({
    initialValues: {
      totp: "",
      password: "",
    },
    validate: {
      totp: isNotEmpty(translation.validation.code),
      password: isNotEmpty(translation.validation.password),
    },
  });

  async function onForgotPassword() {
    setLoading(true);
    try {
      await forgotPassword(forgotPasswordForm.values);
      setNextStage(true);
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UserNotFoundException": {
            forgotPasswordForm.setFieldError("email", reason.message);
            break;
          }
          default: {
            forgotPasswordForm.setFieldError("email", reason.message);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onNewPassword() {
    setLoading(true);
    try {
      await confirmForgotPassword({
        ...forgotPasswordForm.values,
        ...newPasswordForm.values,
      });
      setStage("login");
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "CodeMismatchException": {
            newPasswordForm.setFieldError("totp", reason.message);
            break;
          }
          default: {
            newPasswordForm.setFieldError("password", reason.message);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {nextStage ? (
        <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
          <Box>
            <InputLabel required>{translation.title.mfa}</InputLabel>
            <Center>
              <PinInput
                oneTimeCode
                type="number"
                size="md"
                length={6}
                autoFocus={nextStage}
                {...newPasswordForm.getInputProps("totp")}
              />
            </Center>
            <Text c="red" size="xs">
              {newPasswordForm.errors.totp}
            </Text>
          </Box>
          <NewPasswordInput
            label={translation.fields.newPassword}
            placeholder={translation.placeholders.newPassword}
            {...newPasswordForm.getInputProps("password")}
            withAsterisk
            autoComplete="new-password"
          />
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                newPasswordForm.reset();
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
      ) : (
        <form onSubmit={forgotPasswordForm.onSubmit(onForgotPassword)}>
          <TextInput
            label={translation.fields.email}
            placeholder={translation.placeholders.email}
            withAsterisk
            autoComplete="username"
            {...forgotPasswordForm.getInputProps("email")}
          />
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                forgotPasswordForm.reset();
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
      )}
    </>
  );
}
