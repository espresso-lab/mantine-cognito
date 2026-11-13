import {
  Alert,
  Anchor,
  Button,
  Center,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconExclamationCircle, IconFingerprint } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { getPasskeyHint, passkeyProblem, type SignInResult } from "../Context/cognito";
import { NewPasswordInput } from "./NewPasswordInput";
import { CodeInput } from "./CodeInput";
import { ResendCode } from "./ResendCode";
import { BackToLogin } from "./BackToLogin";
import { useTranslation } from "../Hooks/useTranslation.ts";

type LoginStep = "credentials" | "mfa" | "verification" | "newPassword";

interface LoginComponentProps {
  passkeys: boolean;
}

export function Login({ passkeys }: LoginComponentProps) {
  const translation = useTranslation();
  const [loading, setLoading] = useState<"login" | "passkey" | false>(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [error, setError] = useState<string>();
  const [passkeyHint, setPasskeyHint] = useState(() => (passkeys ? getPasskeyHint() : null));
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
    initialValues: { email: passkeyHint ?? "", password: "" },
    validate: {
      email: isEmail(translation.validation.email),
      password: isNotEmpty(translation.validation.password),
    },
  });

  const mfaForm = useForm({
    initialValues: { totp: "" },
    validate: { totp: isNotEmpty(translation.validation.code) },
  });

  const verificationForm = useForm({
    initialValues: { totp: "" },
    validate: { totp: isNotEmpty(translation.validation.code) },
  });

  const newPasswordForm = useForm({
    initialValues: { password: "" },
    validate: { password: isNotEmpty(translation.validation.password) },
  });

  function handleAuthError(reason: unknown) {
    if (!(reason instanceof Error)) {
      setError(translation.errors.generic);
      return;
    }
    switch (reason.name) {
      case "UserNotFoundException":
      case "NotAuthorizedException":
        loginForm.setFieldError("email", translation.validation.incorrectUserOrPassword);
        loginForm.setFieldError("password", translation.validation.incorrectUserOrPassword);
        break;
      case "CodeMismatchException":
      case "ExpiredCodeException":
        if (step === "verification") {
          verificationForm.setFieldError("totp", translation.validation.code);
        } else {
          mfaForm.setFieldError("totp", translation.validation.code);
        }
        break;
      case "UserNotConfirmedException":
        setStep("verification");
        break;
      case "PasswordResetRequiredException":
        setStage("forgotPassword");
        break;
      case "LimitExceededException":
      case "TooManyRequestsException":
        setError(translation.errors.limitExceeded);
        break;
      default:
        setError(translation.errors.generic);
    }
  }

  function continueWith({ nextStep }: SignInResult) {
    switch (nextStep) {
      case "DONE":
        return;
      case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
        setStep("mfa");
        return;
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        setStep("newPassword");
        return;
      case "CONFIRM_SIGN_UP":
        setStep("verification");
        return;
      case "RESET_PASSWORD":
        setStage("forgotPassword");
        return;
      case "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION":
        setPasskeyHint(null);
        setError(translation.errors.noPasskey);
        return;
      default:
        setStep("credentials");
        setError(translation.errors.unsupportedStep);
    }
  }

  async function onLogin(mfaCode = mfaForm.values.totp) {
    setLoading("login");
    setError(undefined);
    try {
      continueWith(
        step === "mfa"
          ? await confirmMFA({ code: mfaCode })
          : await login(loginForm.values),
      );
    } catch (reason) {
      handleAuthError(reason);
    } finally {
      setLoading(false);
    }
  }

  async function onVerification(code = verificationForm.values.totp) {
    setLoading("login");
    setError(undefined);
    try {
      await confirmRegistration({ ...loginForm.values, totp: code });
      await onLogin();
    } catch (reason) {
      handleAuthError(reason);
    } finally {
      setLoading(false);
    }
  }

  async function onNewPassword() {
    setLoading("login");
    setError(undefined);
    try {
      continueWith(await forcedPasswordReset(newPasswordForm.values));
    } catch (reason) {
      if (reason instanceof Error) {
        newPasswordForm.setFieldError("password", reason.message);
      } else {
        setError(translation.errors.generic);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onPasskeyLogin() {
    if (loginForm.validateField("email").hasError) {
      return;
    }
    setLoading("passkey");
    setError(undefined);
    try {
      continueWith(await loginWithPasskey(loginForm.values.email));
    } catch (reason) {
      switch (passkeyProblem(reason)) {
        case "cancelled":
          break;
        case "unavailable":
          setError(translation.errors.passkeyUnavailable);
          break;
        default:
          handleAuthError(reason);
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmitCredentials() {
    if (passkeyHint && !loginForm.values.password) {
      void onPasskeyLogin();
      return;
    }
    if (!loginForm.validate().hasErrors) {
      void onLogin();
    }
  }

  const errorAlert = error && (
    <Alert
      color="red"
      title={translation.title.loginFailed}
      icon={<IconExclamationCircle size={18} />}
    >
      {error}
    </Alert>
  );

  if (step === "mfa") {
    return (
      <form onSubmit={mfaForm.onSubmit(({ totp }) => onLogin(totp))}>
        <Stack gap="md">
          {errorAlert}
          <Text size="sm" c="dimmed" ta="center">
            {translation.description.mfa}
          </Text>
          <CodeInput
            autoFocus
            onComplete={onLogin}
            disabled={loading === "login"}
            {...mfaForm.getInputProps("totp")}
          />
          <Group justify="space-between" mt="xs">
            <BackToLogin
              onClick={() => {
                mfaForm.reset();
                setError(undefined);
                setStep("credentials");
              }}
            />
            <Button type="submit" loading={loading === "login"}>
              {translation.buttons.code}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  }

  if (step === "verification") {
    return (
      <form onSubmit={verificationForm.onSubmit(({ totp }) => onVerification(totp))}>
        <Stack gap="md">
          {errorAlert}
          <Text size="sm" c="dimmed" ta="center">
            {translation.texts.codeSentTo}{" "}
            <Text span fw={600} size="sm">
              {loginForm.values.email}
            </Text>
          </Text>
          <CodeInput
            autoFocus
            onComplete={onVerification}
            disabled={loading === "login"}
            {...verificationForm.getInputProps("totp")}
          />
          <Center>
            <ResendCode
              label={translation.links.sendCode}
              onResend={() => sendAccountConfirmationCode(loginForm.values.email)}
            />
          </Center>
          <Group justify="space-between" mt="xs">
            <BackToLogin
              onClick={() => {
                verificationForm.reset();
                setError(undefined);
                setStep("credentials");
              }}
            />
            <Button type="submit" loading={loading === "login"}>
              {translation.buttons.code}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  }

  if (step === "newPassword") {
    return (
      <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
        <Stack gap="md">
          {errorAlert}
          <NewPasswordInput
            label={translation.fields.newPassword}
            placeholder={translation.placeholders.newPassword}
            autoFocus
            withAsterisk
            showRequirements
            autoComplete="new-password"
            {...newPasswordForm.getInputProps("password")}
          />
          <Button type="submit" fullWidth loading={loading === "login"}>
            {translation.buttons.newPassword}
          </Button>
        </Stack>
      </form>
    );
  }

  const passkeyButton = passkeys && (
    <Button
      fullWidth
      variant={passkeyHint ? "filled" : "default"}
      leftSection={<IconFingerprint size={16} />}
      onClick={() => void onPasskeyLogin()}
      loading={loading === "passkey"}
      disabled={loading === "login"}
    >
      {translation.buttons.loginWithPasskey}
    </Button>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitCredentials();
      }}
    >
      <Stack gap="md">
        {errorAlert}
        <TextInput
          autoFocus={!passkeyHint}
          autoComplete="username webauthn"
          label={translation.fields.email}
          withAsterisk
          placeholder={translation.placeholders.email}
          {...loginForm.getInputProps("email")}
        />
        {passkeyHint && (
          <>
            {passkeyButton}
            <Divider label={translation.texts.orWithPassword} labelPosition="center" />
          </>
        )}
        <PasswordInput
          label={translation.fields.password}
          placeholder={translation.placeholders.password}
          autoComplete="current-password"
          withAsterisk={!passkeyHint}
          {...loginForm.getInputProps("password")}
        />
        <Button
          type="submit"
          fullWidth
          variant={passkeyHint ? "default" : "filled"}
          loading={loading === "login"}
          disabled={loading === "passkey"}
        >
          {translation.buttons.login}
        </Button>
        {!passkeyHint && passkeyButton && (
          <>
            <Divider label={translation.texts.or} labelPosition="center" />
            {passkeyButton}
          </>
        )}
        <Group justify="space-between">
          {allowRegistration && (
            <Anchor component="button" type="button" c="dimmed" size="sm" onClick={() => setStage("register")}>
              {translation.links.register}
            </Anchor>
          )}
          <Anchor component="button" type="button" c="dimmed" size="sm" onClick={() => setStage("forgotPassword")}>
            {translation.links.forgotPassword}
          </Anchor>
        </Group>
      </Stack>
    </form>
  );
}
