import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  InputLabel,
  Paper,
  PasswordInput,
  PinInput,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { FirstLogin, NewPasswordRequiredException } from "../Context/cognito";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import {useTranslation} from "../Hooks/useTranslation.ts";

export function Login() {
  const translation = useTranslation();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [firstLogin, setFirstLogin] = useState<FirstLogin>();
  const {
    login,
    confirmRegistration,
    forcedPasswordReset,
    sendEmailConfirmationCode,
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
    try {
      await login({
        ...loginForm.values,
        ...verificationForm.values,
        ...mfaForm.values,
      });
      // Login success!
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
      await onLogin();
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

      setStage("login");
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
            <Button type="submit">{translation.buttons.code}</Button>
          </Group>
        </form>
      ) : verificationRequired ? (
        <form onSubmit={verificationForm.onSubmit(onVerification)}>
          <Box>
            <InputLabel required>Verification Code</InputLabel>
            <Center>
              <Button fullWidth={true} variant="outline" onClick={sendEmailConfirmationCode} my="md">
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
            <Button type="submit">{translation.buttons.code}</Button>
          </Group>
        </form>
      ) : firstLogin ? (
        <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
          <NewPasswordInput
            label={translation.fields.newPassword}
            placeholder={translation.placeholders.newPassword}
            autoFocus={!!firstLogin}
            withAsterisk
            showRequirements
            {...newPasswordForm.getInputProps("password")}
          />
          <Button type="submit" fullWidth mt="lg">
            {translation.buttons.newPassword}
          </Button>
        </form>
      ) : (
        <form onSubmit={loginForm.onSubmit(onLogin)}>
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
            mt="md"
          />
          <Button type="submit" fullWidth mt="lg">
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
    </Paper>
  );
}
