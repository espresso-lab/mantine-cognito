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
import {useTranslation} from "../Hooks/useTranslation.ts";
import {IconArrowLeft, IconFingerprint, IconTrash} from "@tabler/icons-react";

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

export function MFASetup({ mfaAppName, enablePasskeys = false, onEnable, onDisable, onError }: MFASetupProps) {
    const translation = useTranslation();
  const clipboard = useClipboard();
  const [mode, setMode] = useState<"disabled" | "enabling" | "enabled">(
    "disabled",
  );
  const [code, setCode] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [passkeys, setPasskeys] = useState<WebAuthnCredential[]>([]);

  const form = useForm({
    initialValues: {
      totp: "",
    },
  });

  const formatError = (err: unknown): string => {
    const error = err as Error & { code?: string; underlyingError?: Error };
    const message = error.underlyingError?.message ?? error.message ?? JSON.stringify(err);
    return `${error.name ?? "Error"}: ${message}${error.code ? ` (${error.code})` : ""}`;
  };

  const loadPasskeys = async () => {
    try {
      const result = await getPasskeys();
      setPasskeys(result.credentials as WebAuthnCredential[]);
    } catch {
      setPasskeys([]);
    }
  };

  useEffect(() => {
    getMFAPreference()
      .then((pref) => {
        if (pref.preferred === "TOTP") setMode("enabled");
      })
      .catch(() => {});

    getUserAttributes()
      .then((attrs) => {
        setEmail(attrs.email as string);
      })
      .catch(() => {});

    if (enablePasskeys) {
      loadPasskeys();
    }
  }, [enablePasskeys]);

  useEffect(() => {
    if (
      mode === "enabling" &&
      form.values.totp.length === 6 &&
      !form.errors.totp
    ) {
      verifySoftwareToken(form.values.totp)
        .then(() => {
          enableMFA()
            .then(() => {
              setMode("enabled");
              onEnable?.();
            })
            .catch((err) => {
              onError?.(formatError(err));
            });
        })
        .catch((err: Error) => {
          form.setFieldError("totp", err.message);
        });
    }
  }, [mode, form.values.totp, form.errors.totp]);

  const onStartEnable = () => {
    form.setFieldValue("totp", "");
    associateSoftwareToken()
      .then((code) => {
        setCode(code);
        setMode("enabling");
      })
      .catch((err: unknown) => {
        onError?.(formatError(err));
      });
  };

  const onDisableHandler = () => {
    disableMFA()
      .then(() => {
        setMode("disabled");
        onDisable?.();
      })
      .catch((err: unknown) => {
        onError?.(formatError(err));
      });
  };

  const onAddPasskey = async () => {
    try {
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

  const emailPart = email ? encodeURIComponent(`${mfaAppName}:${email}`) : encodeURIComponent(mfaAppName);
  const value = code ? `otpauth://totp/${emailPart}?secret=${code}&issuer=${encodeURIComponent(mfaAppName)}` : "";
  const enabling =
    code !== undefined ? (
      <form>
        <Text size="sm" ta="center">
          {translation.texts.scanQRCode}
          <Anchor
            size="sm"
            onClick={() => {
              clipboard.copy(code);
            }}
          >
            {translation.links.clickHere}
          </Anchor>{" "}
          {translation.texts.copyCode}
        </Text>
        <Center mt="lg">
          <QRCode value={value} />
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
    );

  return (
    <Paper maw={380}>
      {mode === "disabled" && (
        <Button color="green" onClick={onStartEnable}>{translation.buttons.enableMFA}</Button>
      )}
      {mode === "enabling" && enabling}
      {mode === "enabled" && (
        <Button color="red" onClick={onDisableHandler}>
          {translation.buttons.disableMFA}
        </Button>
      )}

      {enablePasskeys && (
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
