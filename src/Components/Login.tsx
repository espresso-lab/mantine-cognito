import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  InputLabel,
  PasswordInput,
  PinInput,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import {useTranslation} from "../Hooks/useTranslation.ts";

export function Login() {
  const translation = useTranslation();
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const {
    login,
    confirmMFA,
    confirmRegistration,
    forcedPasswordReset,
    sendAccountConfirmationCode,
    setStage,
    allowRegistration,
  } = useAuth();
  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: isEmail(translation.validation.email),
      password: isNotEmpty(translation.validation.password),
    },
  });

  const mfaForm = useForm({
    initialValues: {
      totp: undefined,
    },
    validate: {
      totp: isNotEmpty(translation.validation.code),
    },
  });

  const verificationForm = useForm({
    initialValues: {
      totp: "",
    },
    validate: {
      totp: isNotEmpty(translation.validation.code),
    },
  });

  const newPasswordForm = useForm({
    initialValues: {
      password: "",
    },
    validate: {
      password: isNotEmpty(translation.validation.password),
    },
  });

  async function onLogin() {
    setLoading(true);
    try {
      const result = mfaRequired
        ? await confirmMFA({ code: mfaForm.values.totp ?? "" })
        : await login(loginForm.values);

      switch (result.nextStep) {
        case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
          setMfaRequired(true);
          break;
        case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
          setNewPasswordRequired(true);
          break;
        case "CONFIRM_SIGN_UP":
          setVerificationRequired(true);
          break;
      }
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UserNotFoundException": {
            loginForm.setFieldError("email", reason.message);
            break;
          }
          case "NotAuthorizedException": {
            loginForm.setFieldError(
              "email",
              translation.validation.incorrectUserOrPassword,
            );
            loginForm.setFieldError(
              "password",
              translation.validation.incorrectUserOrPassword,
            );
            break;
          }
          case "CodeMismatchException":
          case "ExpiredCodeException": {
            if (verificationRequired) {
              verificationForm.setFieldError("totp", reason.message);
            } else if (mfaRequired) {
              mfaForm.setFieldError("totp", reason.message);
            }
            break;
          }
          case "UserNotConfirmedException": {
            setVerificationRequired(true);
            break;
          }
          default:
            break;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerification() {
    setLoading(true);
    try {
      await confirmRegistration({
        ...loginForm.values,
        ...verificationForm.values,
      });
      await onLogin();
    } catch (reason) {
      if (reason instanceof Error) {
        verificationForm.setFieldError("totp", reason.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onNewPassword() {
    setLoading(true);
    try {
      await forcedPasswordReset(newPasswordForm.values);
      setStage("login");
    } catch (reason) {
      if (reason instanceof Error) {
        newPasswordForm.setFieldError("password", reason.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {mfaRequired ? (
        <form onSubmit={mfaForm.onSubmit(onLogin)}>
          <Box>
            <InputLabel required>{translation.title.mfa}</InputLabel>
            <Center>
              <PinInput
                oneTimeCode
                type="number"
                size="md"
                length={6}
                autoFocus={mfaRequired}
                onComplete={onLogin}
                {...mfaForm.getInputProps("totp")}
              />
            </Center>
            <Text c="red" size="xs">
              {mfaForm.errors.totp}
            </Text>
          </Box>
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                mfaForm.reset();
                setMfaRequired(false);
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
            <Button type="submit" loading={loading}>{translation.buttons.code}</Button>
          </Group>
        </form>
      ) : verificationRequired ? (
        <form onSubmit={verificationForm.onSubmit(onVerification)}>
          <Box>
            <InputLabel required>{translation.title.code}</InputLabel>
            <Center>
              <Button fullWidth variant="outline" onClick={() => sendAccountConfirmationCode(loginForm.values.email)} my="md">
                {translation.buttons.sendEmailCode}
              </Button>

              <PinInput
                oneTimeCode
                type="number"
                size="md"
                length={6}
                autoFocus={verificationRequired}
                onComplete={onVerification}
                {...verificationForm.getInputProps("totp")}
              />
            </Center>
            <Text c="red" size="xs">
              {verificationForm.errors.totp}
            </Text>
          </Box>
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                verificationForm.reset();
                setVerificationRequired(false);
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
            <Button type="submit" loading={loading}>{translation.buttons.code}</Button>
          </Group>
        </form>
      ) : newPasswordRequired ? (
        <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
          <NewPasswordInput
            label={translation.fields.newPassword}
            placeholder={translation.placeholders.newPassword}
            autoFocus={newPasswordRequired}
            withAsterisk
            showRequirements
            {...newPasswordForm.getInputProps("password")}
              autoComplete="new-password"
          />
          <Button type="submit" fullWidth mt="lg" loading={loading}>
            {translation.buttons.newPassword}
          </Button>
        </form>
      ) : (
        <form onSubmit={loginForm.onSubmit(onLogin)}>
          <TextInput
              autoComplete="username"
            label={translation.fields.email}
            withAsterisk
            placeholder={translation.placeholders.email}
            {...loginForm.getInputProps("email")}
          />
          <PasswordInput
            label={translation.fields.password}
            placeholder={translation.placeholders.password}
            {...loginForm.getInputProps("password")}
            autoComplete="current-password"
            withAsterisk
            mt="md"
          />
          <Button type="submit" fullWidth mt="lg" loading={loading}>
            {translation.buttons.login}
          </Button>
          <Group justify="space-between" mt="md">
            {allowRegistration && (
              <Anchor
                component="button"
                c="dimmed"
                size="sm"
                onClick={() => {
                  setStage("register");
                }}
              >
                {translation.links.register}
              </Anchor>
            )}
            <Anchor
              component="button"
              c="dimmed"
              size="sm"
              onClick={() => {
                setStage("forgotPassword");
              }}
            >
              {translation.links.forgotPassword}
            </Anchor>
          </Group>
        </form>
      )}
    </>
  );
}
