import {
  Anchor,
  Box,
  Button,
  Center,
  Divider,
  Group,
  InputLabel,
  PasswordInput,
  PinInput,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft, IconFingerprint } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import { useTranslation } from "../Hooks/useTranslation.ts";

type LoginStep = "credentials" | "mfa" | "verification" | "newPassword";

export function Login() {
  const translation = useTranslation();
  const [loading, setLoading] = useState<"login" | "passkey" | false>(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const {
    login,
    loginWithPasskey,
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
      totp: "",
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
    setLoading("login");
    try {
      const result = step === "mfa"
        ? await confirmMFA({ code: mfaForm.values.totp })
        : await login(loginForm.values);

      switch (result.nextStep) {
        case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
          setStep("mfa");
          break;
        case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
          setStep("newPassword");
          break;
        case "CONFIRM_SIGN_UP":
          setStep("verification");
          break;
      }
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UserNotFoundException":
            loginForm.setFieldError("email", reason.message);
            break;
          case "NotAuthorizedException":
            loginForm.setFieldError("email", translation.validation.incorrectUserOrPassword);
            loginForm.setFieldError("password", translation.validation.incorrectUserOrPassword);
            break;
          case "CodeMismatchException":
          case "ExpiredCodeException":
            if (step === "verification") {
              verificationForm.setFieldError("totp", reason.message);
            } else if (step === "mfa") {
              mfaForm.setFieldError("totp", reason.message);
            }
            break;
          case "UserNotConfirmedException":
            setStep("verification");
            break;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerification() {
    setLoading("login");
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
    setLoading("login");
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

  async function onPasskeyLogin() {
    if (!(await loginForm.validateField("email")).hasError) {
      setLoading("passkey");
      try {
        const result = await loginWithPasskey(loginForm.values.email);
        if (result.nextStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
          setStep("mfa");
        }
      } catch (reason) {
        if (reason instanceof Error) {
          loginForm.setFieldError("email", reason.message);
        }
      } finally {
        setLoading(false);
      }
    }
  }

  if (step === "mfa") {
    return (
      <form onSubmit={mfaForm.onSubmit(onLogin)}>
        <Box>
          <InputLabel required>{translation.title.mfa}</InputLabel>
          <Center>
            <PinInput
              oneTimeCode
              type="number"
              size="md"
              length={6}
              autoFocus
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
              setStep("credentials");
            }}
            c="dimmed"
            size="sm"
          >
            <Center inline>
              <IconArrowLeft size={20} />
              <Text ml={5}>{translation.links.backToLogin}</Text>
            </Center>
          </Anchor>
          <Button type="submit" loading={loading === "login"}>{translation.buttons.code}</Button>
        </Group>
      </form>
    );
  }

  if (step === "verification") {
    return (
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
              autoFocus
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
              setStep("credentials");
            }}
            c="dimmed"
            size="sm"
          >
            <Center inline>
              <IconArrowLeft size={20} />
              <Text ml={5}>{translation.links.backToLogin}</Text>
            </Center>
          </Anchor>
          <Button type="submit" loading={loading === "login"}>{translation.buttons.code}</Button>
        </Group>
      </form>
    );
  }

  if (step === "newPassword") {
    return (
      <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
        <NewPasswordInput
          label={translation.fields.newPassword}
          placeholder={translation.placeholders.newPassword}
          autoFocus
          withAsterisk
          showRequirements
          autoComplete="new-password"
          {...newPasswordForm.getInputProps("password")}
        />
        <Button type="submit" fullWidth mt="lg" loading={loading === "login"}>
          {translation.buttons.newPassword}
        </Button>
      </form>
    );
  }

  return (
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
        autoComplete="current-password"
        withAsterisk
        mt="md"
        {...loginForm.getInputProps("password")}
      />
      <Button type="submit" fullWidth mt="lg" loading={loading === "login"} disabled={loading === "passkey"}>
        {translation.buttons.login}
      </Button>
      <Divider my="md" />
      <Button
        fullWidth
        variant="light"
        leftSection={<IconFingerprint size={20} />}
        onClick={onPasskeyLogin}
        loading={loading === "passkey"}
        disabled={loading === "login"}
      >
        {translation.buttons.loginWithPasskey}
      </Button>
      <Group justify="space-between" mt="md">
        {allowRegistration && (
          <Anchor component="button" c="dimmed" size="sm" onClick={() => setStage("register")}>
            {translation.links.register}
          </Anchor>
        )}
        <Anchor component="button" c="dimmed" size="sm" onClick={() => setStage("forgotPassword")}>
          {translation.links.forgotPassword}
        </Anchor>
      </Group>
    </form>
  );
}
