import {
  Anchor,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  InputLabel,
  Paper,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";
import { FirstLogin, NewPasswordRequiredException } from "../Context/cognito";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import { translation } from "../translation";

export function Login() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [firstLogin, setFirstLogin] = useState<FirstLogin>();
  const {
    login,
    confirmRegistration,
    forcedPasswordReset,
    userAttributes,
    sendEmailConfirmationCode,
    setMode,
  } = useAuth();
  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
      remember: true,
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

  function handleLoginSuccess() {
    console.log("Login success!");
  }

  async function onLogin() {
    try {
      await login({
        ...loginForm.values,
        ...verificationForm.values,
        ...mfaForm.values,
      });
      handleLoginSuccess();
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UserNotFoundException": {
            loginForm.setFieldError("email", reason.message);
            break;
          }
          case "NotAuthorizedException": {
            loginForm.setFieldError("email", translation.validation.incorrect_user_or_password);
            loginForm.setFieldError("password", translation.validation.incorrect_user_or_password);
            break;
          }
          case "CodeMismatchException": {
            if (verificationForm.isDirty()) {
              verificationForm.setFieldError("totp", reason.message);
            } else if (mfaForm.isDirty()) {
              mfaForm.setFieldError("totp", reason.message);
            }
            break;
          }
          case "ExpiredCodeException": {
            if (verificationForm.isDirty()) {
              verificationForm.setFieldError("totp", reason.message);
            } else if (mfaForm.isDirty()) {
              mfaForm.setFieldError("totp", reason.message);
            }
            break;
          }
          case "NewPasswordRequiredException": {
            if (reason instanceof NewPasswordRequiredException) {
              setFirstLogin(reason.firstLogin);
            }
            break;
          }
          case "LoginMFAException": {
            setMfaRequired(true);
            break;
          }
          case "UserNotConfirmedException": {
            setVerificationRequired(true);
            break;
          }
          default: {
            console.error(reason);
          }
        }
      }
    }
  }

  async function onVerification() {
    try {
      await confirmRegistration({
        ...loginForm.values,
        ...verificationForm.values,
      });
      onLogin();
    } catch (reason) {
      if (reason instanceof Error) {
        console.error(reason);
        verificationForm.setFieldError("totp", reason.message);
      }
    }
  }

  async function onNewPassword() {
    try {
      await forcedPasswordReset({
        ...firstLogin!,
        ...newPasswordForm.values,
      });
      if (!userAttributes?.email_verified) {
        sendEmailConfirmationCode();
      }
      setMode("login");
    } catch (reason) {
      if (reason instanceof Error) {
        console.error(reason);
        newPasswordForm.setFieldError("password", reason.message);
      }
    }
  }

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md">
      {mfaRequired ? (
        <form onSubmit={mfaForm.onSubmit(onLogin)}>
          <Stack>
            <Box>
              <InputLabel required>Multi-Factor Code</InputLabel>
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
            <Group justify="space-between">
              <Anchor
                onClick={() => {
                  mfaForm.reset();
                  setMfaRequired(false);
                  setMode("login");
                }}
                c="dimmed"
                size="sm"
              >
                <Center inline>
                  <IconArrowLeft size={20} />
                  <Text ml={5}>{translation.links.backToLogin}</Text>
                </Center>
              </Anchor>
              <Button type="submit">{translation.buttons.code}</Button>
            </Group>
          </Stack>
        </form>
      ) : verificationRequired ? (
        <form onSubmit={verificationForm.onSubmit(onVerification)}>
          <Stack>
            <Box>
              <InputLabel required>Verification Code</InputLabel>
              <Center>
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
            <Group justify="space-between">
              <Anchor
                onClick={() => {
                  verificationForm.reset();
                  setVerificationRequired(false);
                  setMode("login");
                }}
                c="dimmed"
                size="sm"
              >
                <Center inline>
                  <IconArrowLeft size={20} />
                  <Text ml={5}>{translation.links.backToLogin}</Text>
                </Center>
              </Anchor>
              <Button type="submit">{translation.buttons.code}</Button>
            </Group>
          </Stack>
        </form>
      ) : firstLogin ? (
        <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
          <Stack>
            <NewPasswordInput
              label={translation.fields.newPassword}
              placeholder={translation.placeholders.newPassword}
              autoFocus={!!firstLogin}
              withAsterisk
              {...newPasswordForm.getInputProps("password")}
            />
            <Button type="submit" fullWidth>
              {translation.buttons.newPassword}
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={loginForm.onSubmit(onLogin)}>
          <Stack>
            <TextInput
              label={translation.fields.email}
              withAsterisk
              placeholder={translation.placeholders.email}
              {...loginForm.getInputProps("email")}
            />
            <PasswordInput
              label={translation.fields.password}
              placeholder={translation.placeholders.password}
              {...loginForm.getInputProps("password")}
              withAsterisk
            />
            <Group justify="space-between">
              <Checkbox
                label={translation.fields.remember}
                {...loginForm.getInputProps("remember")}
              />
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={() => {
                  setMode("forgotPassword");
                }}
              >
                {translation.links.forgotPassword}
              </Anchor>
            </Group>
            <Group justify="space-between">
              <Anchor
                onClick={() => {
                  setMode("register");
                }}
                c="dimmed"
                size="sm"
              >
                <Center inline>
                  <Text ml={5}>{translation.links.register}</Text>
                  <IconArrowRight size={20} />
                </Center>
              </Anchor>
              <Button type="submit">{translation.buttons.login}</Button>
            </Group>
          </Stack>
        </form>
      )}
    </Paper>
  );
}
