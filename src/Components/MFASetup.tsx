import { Box, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFingerprint } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
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

function StatusDot({ label }: { label: string }) {
  return (
    <Group gap={5} wrap="nowrap">
      <Box w={6} h={6} bdrs="50%" bg="var(--mantine-color-teal-filled)" />
      <Text fz={12} fw={600} c="teal">
        {label}
      </Text>
    </Group>
  );
}

function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button variant="subtle" color="red" size="compact-sm" onClick={open}>
        {label}
      </Button>
      <Modal opened={opened} onClose={close} title={title} size="sm" centered>
        <Stack gap="md">
          <Text size="sm">{description}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {cancelLabel}
            </Button>
            <Button
              color="red"
              onClick={() => {
                close();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function SecurityRow({
  title,
  description,
  active,
  activeLabel,
  inactiveLabel,
  action,
  withDivider,
}: {
  title: string;
  description: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  action: ReactNode;
  withDivider?: boolean;
}) {
  return (
    <Group
      align="center"
      gap={16}
      wrap="nowrap"
      py={14}
      style={
        withDivider
          ? { borderBottom: "1px solid var(--mantine-color-default-border)" }
          : undefined
      }
    >
      <Stack gap={3} flex={1} miw={0}>
        <Group gap={8} wrap="nowrap">
          <Text fz={14} fw={500}>
            {title}
          </Text>
          {active && <StatusDot label={activeLabel} />}
        </Group>
        <Text fz={13} c="dimmed">
          {active ? description : `${inactiveLabel} · ${description}`}
        </Text>
      </Stack>
      <Box flex="none">{action}</Box>
    </Group>
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
    <Stack gap={0}>
      <SecurityRow
        title={translation.title.authenticatorApp}
        description={translation.texts.totpDescription}
        active={totpMode === "enabled"}
        activeLabel={translation.badges.active}
        inactiveLabel={translation.badges.inactive}
        withDivider
        action={
          totpMode === "enabled" ? (
            <ConfirmAction
              label={translation.buttons.disable}
              title={translation.title.authenticatorApp}
              description={translation.texts.confirmDisableTotp}
              confirmLabel={translation.buttons.disable}
              cancelLabel={translation.buttons.cancel}
              onConfirm={onDisableTotp}
            />
          ) : (
            totpMode === "disabled" && (
              <Button variant="default" size="compact-sm" onClick={() => setTotpMode("enabling")}>
                {translation.buttons.enable}
              </Button>
            )
          )
        }
      />

      {totpMode === "enabling" && (
        <Box py={14}>
          <TotpSetup
            mfaAppName={mfaAppName}
            onVerified={() => {
              setTotpMode("enabled");
              onEnable?.();
            }}
            onCancel={() => setTotpMode("disabled")}
          />
        </Box>
      )}

      {enablePasskeys && (
        <>
          <SecurityRow
            title={translation.title.passkeys}
            description={translation.texts.passkeysDescription}
            active={passkeys.length > 0}
            activeLabel={translation.badges.active}
            inactiveLabel={translation.badges.inactive}
            action={
              <Button
                variant="default"
                size="compact-sm"
                loading={passkeyLoading}
                onClick={onAddPasskey}
              >
                {translation.buttons.addPasskey}
              </Button>
            }
          />

          {passkeys.length > 0 && (
            <Stack gap={8} pb={14}>
              {passkeys.map((passkey) => (
                <Paper
                  key={passkey.credentialId}
                  withBorder
                  radius={10}
                  px={13}
                  py={11}
                  bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
                >
                  <Group gap={12} wrap="nowrap">
                    <IconFingerprint
                      size={19}
                      stroke={1.7}
                      style={{ color: "var(--mantine-color-dimmed)" }}
                    />
                    <Stack gap={2} flex={1} miw={0}>
                      <Text fz={13} fw={500} truncate>
                        {passkey.friendlyCredentialName || translation.title.passkeys}
                      </Text>
                      {passkey.createdAt && (
                        <Text fz={12} c="dimmed">
                          {translation.texts.addedOn}{" "}
                          {new Date(passkey.createdAt).toLocaleDateString()}
                        </Text>
                      )}
                    </Stack>
                    <ConfirmAction
                      label={translation.buttons.remove}
                      title={translation.title.passkeys}
                      description={translation.texts.confirmRemovePasskey}
                      confirmLabel={translation.buttons.confirmRemove}
                      cancelLabel={translation.buttons.cancel}
                      onConfirm={() => onRemovePasskey(passkey.credentialId)}
                    />
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
