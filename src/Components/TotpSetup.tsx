import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Code,
  CopyButton,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  associateSoftwareToken,
  enableMFA,
  getUserAttributes,
  verifySoftwareToken,
} from "../Context/cognito";
import { CodeInput } from "./CodeInput";
import { QRCode } from "./QRCode";
import { useTranslation } from "../Hooks/useTranslation.ts";

export interface TotpSetupProps {
  mfaAppName: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TotpSetup({ mfaAppName, onVerified, onCancel }: TotpSetupProps) {
  const translation = useTranslation();
  const [secret, setSecret] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      associateSoftwareToken(),
      getUserAttributes().catch(() => ({}) as Record<string, unknown>),
    ])
      .then(([sharedSecret, attrs]) => {
        if (!active) return;
        setSecret(sharedSecret);
        if (typeof attrs.email === "string") setEmail(attrs.email);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const onVerify = async (totpCode: string) => {
    if (totpCode.length < 6 || verifying) return;
    setVerifying(true);
    setCodeError(undefined);
    try {
      await verifySoftwareToken(totpCode);
      await enableMFA();
      onVerified();
    } catch (err) {
      setCodeError(err instanceof Error ? translation.validation.code : translation.errors.generic);
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  if (failed) {
    return <Alert color="red">{translation.errors.noCode}</Alert>;
  }

  if (!secret) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  const label = email ? `${mfaAppName}:${email}` : mfaAppName;
  const otpAuthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(mfaAppName)}`;

  return (
    <Stack gap="md">
      <Text size="sm">{translation.texts.scanQRCode}</Text>
      <Center>
        <QRCode value={otpAuthUrl} options={{ width: 200, height: 200 }} />
      </Center>
      <Group justify="center" gap="xs" wrap="nowrap">
        <Code style={{ wordBreak: "break-all" }}>{secret}</Code>
        <CopyButton value={secret}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "✓" : undefined} disabled={!copied}>
              <ActionIcon variant="subtle" color={copied ? "teal" : "gray"} onClick={copy}>
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
      <Text size="sm">{translation.texts.enterCode}</Text>
      <CodeInput
        autoFocus
        value={code}
        onChange={setCode}
        onComplete={onVerify}
        error={codeError}
        disabled={verifying}
      />
      <Group justify="space-between" mt="xs">
        <Button variant="subtle" color="gray" onClick={onCancel}>
          {translation.buttons.cancel}
        </Button>
        <Button loading={verifying} disabled={code.length < 6} onClick={() => onVerify(code)}>
          {translation.buttons.code}
        </Button>
      </Group>
    </Stack>
  );
}
