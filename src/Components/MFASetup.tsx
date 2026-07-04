import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Popover,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconDeviceMobile, IconFingerprint, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  disableMFA,
  getMFAPreference,
  getPasskeys,
  registerPasskey,
  removePasskey,
} from "../Context/cognito";
import { TotpSetup } from "./TotpSetup";
import { useTranslation } from "../Hooks/useTranslation.ts";

interface WebAuthnCredential {
  credentialId: string;
  friendlyCredentialName: string;
  createdAt?: Date;
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

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  icon,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Popover position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        {icon ? (
          <ActionIcon variant="subtle" color="red" aria-label={label}>
            {icon}
          </ActionIcon>
        ) : (
          <Button size="xs" variant="light" color="red">
            {label}
          </Button>
        )}
      </Popover.Target>
      <Popover.Dropdown>
        <Button size="xs" color="red" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Popover.Dropdown>
    </Popover>
  );
}

export function MFASetup({
  mfaAppName,
  enablePasskeys = false,
  onEnable,
  onDisable,
  onError,
}: MFASetupProps) {
  const translation = useTranslation();
  const [totpMode, setTotpMode] = useState<"disabled" | "enabling" | "enabled">("disabled");
  const [passkeys, setPasskeys] = useState<WebAuthnCredential[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

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
        if (pref.enabled?.includes("TOTP")) setTotpMode("enabled");
      })
      .catch(() => {});

    if (enablePasskeys) {
      getPasskeys()
        .then((result) => setPasskeys(result.credentials as WebAuthnCredential[]))
        .catch(() => setPasskeys([]));
    }
  }, [enablePasskeys]);

  const onDisableTotp = async () => {
    try {
      await disableMFA();
      setTotpMode("disabled");
      onDisable?.();
    } catch (err) {
      onError?.(formatError(err));
    }
  };

  const onAddPasskey = async () => {
    setPasskeyLoading(true);
    try {
      await registerPasskey();
      await loadPasskeys();
    } catch (err) {
      onError?.(formatError(err));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const onRemovePasskey = async (credentialId: string) => {
    try {
      await removePasskey(credentialId);
      await loadPasskeys();
    } catch (err) {
      onError?.(formatError(err));
    }
  };

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" size="lg" radius="md">
              <IconDeviceMobile size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>{translation.title.authenticatorApp}</Text>
              <Text size="sm" c="dimmed">
                {translation.texts.totpDescription}
              </Text>
            </div>
          </Group>
          <Badge variant="light" flex="none" color={totpMode === "enabled" ? "teal" : "gray"}>
            {totpMode === "enabled" ? translation.badges.active : translation.badges.inactive}
          </Badge>
        </Group>

        {totpMode === "enabling" && (
          <Card.Section inheritPadding pt="md" mt="md" withBorder>
            <TotpSetup
              mfaAppName={mfaAppName}
              onVerified={() => {
                setTotpMode("enabled");
                onEnable?.();
              }}
              onCancel={() => setTotpMode("disabled")}
            />
          </Card.Section>
        )}

        {totpMode !== "enabling" && (
          <Group justify="flex-end" mt="md">
            {totpMode === "disabled" ? (
              <Button size="xs" variant="light" onClick={() => setTotpMode("enabling")}>
                {translation.buttons.enable}
              </Button>
            ) : (
              <ConfirmButton
                label={translation.buttons.disable}
                confirmLabel={translation.buttons.confirmRemove}
                onConfirm={onDisableTotp}
              />
            )}
          </Group>
        )}
      </Card>

      {enablePasskeys && (
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon variant="light" size="lg" radius="md">
                <IconFingerprint size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600}>{translation.title.passkeys}</Text>
                <Text size="sm" c="dimmed">
                  {translation.texts.passkeysDescription}
                </Text>
              </div>
            </Group>
            <Badge variant="light" flex="none" color={passkeys.length > 0 ? "teal" : "gray"}>
              {passkeys.length > 0 ? translation.badges.active : translation.badges.inactive}
            </Badge>
          </Group>

          <Stack gap="xs" mt="md">
            {passkeys.map((passkey) => (
              <Group key={passkey.credentialId} justify="space-between" wrap="nowrap">
                <div>
                  <Text size="sm">{passkey.friendlyCredentialName || translation.title.passkeys}</Text>
                  {passkey.createdAt && (
                    <Text size="xs" c="dimmed">
                      {translation.texts.addedOn} {new Date(passkey.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </div>
                <ConfirmButton
                  label={translation.buttons.remove}
                  confirmLabel={translation.buttons.confirmRemove}
                  onConfirm={() => onRemovePasskey(passkey.credentialId)}
                  icon={<IconTrash size={16} />}
                />
              </Group>
            ))}
            {passkeys.length === 0 && (
              <Text size="sm" c="dimmed">
                {translation.texts.noPasskeys}
              </Text>
            )}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconFingerprint size={14} />}
              loading={passkeyLoading}
              onClick={onAddPasskey}
            >
              {translation.buttons.addPasskey}
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
