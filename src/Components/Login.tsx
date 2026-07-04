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
import { IconArrowLeft, IconFingerprint, IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../Hooks/useAuth";
import { getPasskeyHint } from "../Context/cognito";
import { NewPasswordInput } from "./NewPasswordInput";
import { CodeInput } from "./CodeInput";
import { ResendCode } from "./ResendCode";
import { useTranslation } from "../Hooks/useTranslation.ts";

type LoginStep = "credentials" | "mfa" | "verification" | "newPassword";

function BackToLogin({ onClick }: { onClick: () => void }) {
  const translation = useTranslation();
  return (
    <Anchor component="button" type="button" onClick={onClick} c="dimmed" size="sm">
      <Center inline>
        <IconArrowLeft size={16} />
        <Text ml={5} size="sm">
          {translation.links.backToLogin}
        </Text>
      </Center>
    </Anchor>
  );
}

export function Login() {
  const translation = useTranslation();
  const [loading, setLoading] = useState<"login" | "passkey" | false>(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [error, setError] = useState<string>();
  const autoPasskeyAttempted = useRef(false);
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
    initialValues: { email: "", password: "" },
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

  async function onLogin() {
    setLoading("login");
    setError(undefined);
    try {
      const result =
        step === "mfa"
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
      handleAuthError(reason);
    } finally {
      setLoading(false);
    }
  }

  async function onVerification() {
    setLoading("login");
    setError(undefined);
    try {
      await confirmRegistration({
        ...loginForm.values,
        ...verificationForm.values,
      });
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
      await forcedPasswordReset(newPasswordForm.values);
      setStage("login");
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

  async function onPasskeyLogin(email?: string, silent = false) {
    const passkeyEmail = email ?? loginForm.values.email;
    if (!email && (await loginForm.validateField("email")).hasError) {
      return;
    }
    setLoading("passkey");
    setError(undefined);
    try {
      const result = await loginWithPasskey(passkeyEmail);
      if (result.nextStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
        setStep("mfa");
      }
    } catch (reason) {
      if (!silent) {
        handleAuthError(reason);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const hint = getPasskeyHint();
    if (!hint || autoPasskeyAttempted.current) {
      return;
    }
    autoPasskeyAttempted.current = true;
    loginForm.setFieldValue("email", hint);
    void onPasskeyLogin(hint, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorAlert = error && (
    <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
      {error}
    </Alert>
  );

  if (step === "mfa") {
    return (
      <form onSubmit={mfaForm.onSubmit(onLogin)}>
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
      <form onSubmit={verificationForm.onSubmit(onVerification)}>
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

  return (
    <form onSubmit={loginForm.onSubmit(() => onLogin())}>
      <Stack gap="md">
        {errorAlert}
        <TextInput
          autoFocus
          autoComplete="username webauthn"
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
          {...loginForm.getInputProps("password")}
        />
        <Button type="submit" fullWidth loading={loading === "login"} disabled={loading === "passkey"}>
          {translation.buttons.login}
        </Button>
        <Divider />
        <Button
          fullWidth
          variant="light"
          leftSection={<IconFingerprint size={20} />}
          onClick={() => onPasskeyLogin()}
          loading={loading === "passkey"}
          disabled={loading === "login"}
        >
          {translation.buttons.loginWithPasskey}
        </Button>
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
