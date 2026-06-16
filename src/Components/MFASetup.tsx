import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  InputLabel,
  Paper,
  PinInput,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useClipboard } from "@mantine/hooks";
import { useEffect, useState } from "react";
import {
  getMFAPreference,
  verifySoftwareToken,
  enableMFA,
  associateSoftwareToken,
  disableMFA,
  getUserAttributes,
  registerPasskey,
  getPasskeys,
  removePasskey,
} from "../Context/cognito";
import { QRCode } from "./QRCode";
import { useTranslation } from "../Hooks/useTranslation.ts";
import { IconArrowLeft, IconFingerprint, IconTrash } from "@tabler/icons-react";

interface WebAuthnCredential {
  credentialId: string;
  friendlyCredentialName: string;
}

export interface MFASetupProps {
  mfaAppName: string;
  enablePasskeys?: boolean;
  onEnable?: () => void;
  onDisable?: () => void;
  onError?: (error: string) => void;
}

function formatError(err: unknown): string {
  const error = err as Error & { code?: string; underlyingError?: Error };
  const message = error.underlyingError?.message ?? error.message ?? JSON.stringify(err);
  return `${error.name ?? "Error"}: ${message}${error.code ? ` (${error.code})` : ""}`;
}

export function MFASetup({ mfaAppName, enablePasskeys = false, onEnable, onDisable, onError }: MFASetupProps) {
  const translation = useTranslation();
  const clipboard = useClipboard();
  const [mode, setMode] = useState<"disabled" | "enabling" | "enabled">("disabled");
  const [code, setCode] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [passkeys, setPasskeys] = useState<WebAuthnCredential[]>([]);

  const form = useForm({ initialValues: { totp: "" } });

  useEffect(() => {
    getMFAPreference()
      .then((pref) => {
        if (pref.preferred === "TOTP") setMode("enabled");
      })
      .catch(() => {});

    getUserAttributes()
      .then((attrs) => {
        if (typeof attrs.email === "string") setEmail(attrs.email);
      })
      .catch(() => {});

    if (enablePasskeys) {
      getPasskeys()
        .then((result) => setPasskeys(result.credentials as WebAuthnCredential[]))
        .catch(() => setPasskeys([]));
    }
  }, [enablePasskeys]);

  const loadPasskeys = async () => {
    try {
      const result = await getPasskeys();
      setPasskeys(result.credentials as WebAuthnCredential[]);
    } catch {
      setPasskeys([]);
    }
  };

  const onVerifyTotp = async (totpCode: string) => {
    try {
      await verifySoftwareToken(totpCode);
      await enableMFA();
      setMode("enabled");
      onEnable?.();
    } catch (err) {
      if (err instanceof Error) {
        form.setFieldError("totp", err.message);
      } else {
        onError?.(formatError(err));
      }
    }
  };

  const onStartEnable = async () => {
    if (passkeys.length > 0) {
      try {
        for (const p of passkeys) await removePasskey(p.credentialId);
        setPasskeys([]);
      } catch (err: unknown) {
        onError?.(formatError(err));
        return;
      }
    }
    form.setFieldValue("totp", "");
    associateSoftwareToken()
      .then((secret) => {
        setCode(secret);
        setMode("enabling");
      })
      .catch((err: unknown) => onError?.(formatError(err)));
  };

  const onDisableHandler = () => {
    disableMFA()
      .then(() => {
        setMode("disabled");
        onDisable?.();
      })
      .catch((err: unknown) => onError?.(formatError(err)));
  };

  const onAddPasskey = async () => {
    try {
      if (mode === "enabled") {
        await disableMFA();
        setMode("disabled");
      }
      await registerPasskey();
      await loadPasskeys();
    } catch (err: unknown) {
      onError?.(formatError(err));
    }
  };

  const onRemovePasskey = async (credentialId: string) => {
    try {
      await removePasskey(credentialId);
      await loadPasskeys();
    } catch (err: unknown) {
      onError?.(formatError(err));
    }
  };

  const emailPart = email
    ? encodeURIComponent(`${mfaAppName}:${email}`)
    : encodeURIComponent(mfaAppName);
  const otpAuthUrl = code
    ? `otpauth://totp/${emailPart}?secret=${code}&issuer=${encodeURIComponent(mfaAppName)}`
    : "";

  return (
    <Paper maw={380}>
      {mode === "disabled" && passkeys.length === 0 && (
        <Button color="green" onClick={onStartEnable}>{translation.buttons.enableMFA}</Button>
      )}

      {mode === "enabling" && (
        code ? (
          <form>
            <Text size="sm" ta="center">
              {translation.texts.scanQRCode}
              <Anchor size="sm" onClick={() => clipboard.copy(code)}>
                {translation.links.clickHere}
              </Anchor>{" "}
              {translation.texts.copyCode}
            </Text>
            <Center mt="lg">
              <QRCode value={otpAuthUrl} />
            </Center>
            <Text size="sm" ta="center" mt="lg">
              {translation.texts.enterCode}
            </Text>
            <Box mt="md">
              <InputLabel required>{translation.title.mfa}</InputLabel>
              <Center>
                <PinInput
                  oneTimeCode
                  type="number"
                  size="md"
                  length={6}
                  onComplete={onVerifyTotp}
                  {...form.getInputProps("totp")}
                />
              </Center>
              <Text c="red" size="xs">
                {form.errors.totp}
              </Text>
            </Box>
            <Button
              fullWidth
              color="gray"
              leftSection={<IconArrowLeft size={14} />}
              variant="outline"
              mt="lg"
              onClick={() => {
                setCode(undefined);
                setMode("disabled");
              }}
            >
              {translation.buttons.cancel}
            </Button>
          </form>
        ) : (
          <Text size="sm" c="red">
            {translation.errors.noCode}
          </Text>
        )
      )}

      {mode === "enabled" && (
        <Button color="red" onClick={onDisableHandler}>
          {translation.buttons.disableMFA}
        </Button>
      )}

      {enablePasskeys && mode !== "enabling" && mode !== "enabled" && (
        <Stack mt="lg" gap="sm">
          <Group justify="space-between">
            <Text fw={500}>{translation.title.passkeys}</Text>
            <Button
              size="xs"
              leftSection={<IconFingerprint size={14} />}
              onClick={onAddPasskey}
            >
              {translation.buttons.addPasskey}
            </Button>
          </Group>
          {passkeys.map((passkey) => (
            <Group key={passkey.credentialId} justify="space-between">
              <Text size="sm">{passkey.friendlyCredentialName}</Text>
              <Button
                size="xs"
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={14} />}
                onClick={() => onRemovePasskey(passkey.credentialId)}
              >
                {translation.buttons.remove}
              </Button>
            </Group>
          ))}
          {passkeys.length === 0 && (
            <Text size="sm" c="dimmed">{translation.texts.noPasskeys}</Text>
          )}
        </Stack>
      )}
    </Paper>
  );
}
