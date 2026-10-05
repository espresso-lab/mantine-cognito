import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFingerprint, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  disableMFA,
  getMFAPreference,
  getPasskeys,
  registerPasskey,
  removePasskey,
} from "../Context/cognito";
import { TotpSetup } from "./TotpSetup";
import { useRoleColor } from "../Hooks/useRoleColor";
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

function ConfirmAction({
  trigger,
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const translation = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      {trigger(open)}
      <Modal
        opened={opened}
        onClose={close}
        title={title}
        centered
        radius="md"
        closeButtonProps={{ "aria-label": translation.buttons.close }}
      >
        <Text size="sm">{message}</Text>
        <Group justify="flex-end" gap="xs" mt="md">
          <Button variant="default" onClick={close}>
            {translation.buttons.cancel}
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
}: {
  title: string;
  description: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  action: ReactNode;
}) {
  const success = useRoleColor("success");
  return (
    <Group align="center" gap="md" wrap="nowrap" py="sm">
      <Stack gap={4} flex={1} miw={0}>
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={500}>
            {title}
          </Text>
          <Badge variant="light" color={active ? success : "gray"}>
            {active ? activeLabel : inactiveLabel}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {description}
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
        action={
          totpMode === "enabled" ? (
            <ConfirmAction
              trigger={(open) => (
                <Button variant="default" size="compact-sm" onClick={open}>
                  {translation.buttons.disable}
                </Button>
              )}
              title={translation.title.disableTotp}
              message={translation.texts.confirmDisableTotp}
              confirmLabel={translation.buttons.disable}
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
      <Divider />

      {totpMode === "enabling" && (
        <Box py="sm">
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
                variant="light"
                size="xs"
                leftSection={<IconPlus size={14} />}
                loading={passkeyLoading}
                onClick={onAddPasskey}
              >
                {translation.buttons.addPasskey}
              </Button>
            }
          />

          {passkeys.length > 0 && (
            <Stack gap="xs" pb="sm">
              {passkeys.map((passkey) => {
                const name = passkey.friendlyCredentialName || translation.title.passkeys;
                return (
                  <Paper key={passkey.credentialId} withBorder radius="md" px="sm" py="xs">
                    <Group gap="sm" wrap="nowrap">
                      <IconFingerprint
                        size={18}
                        stroke={1.7}
                        color="var(--mantine-color-dimmed)"
                      />
                      <Stack gap={2} flex={1} miw={0}>
                        <Text size="sm" fw={500} truncate>
                          {name}
                        </Text>
                        {passkey.createdAt && (
                          <Text size="sm" c="dimmed">
                            {translation.texts.addedOn}{" "}
                            {new Date(passkey.createdAt).toLocaleDateString(translation.locale, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </Text>
                        )}
                      </Stack>
                      <ConfirmAction
                        trigger={(open) => (
                          <Tooltip label={translation.buttons.delete} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={`${translation.buttons.delete}: ${name}`}
                              onClick={open}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        title={translation.title.deletePasskey}
                        message={translation.texts.confirmDeletePasskey(name)}
                        confirmLabel={translation.buttons.delete}
                        onConfirm={() => onRemovePasskey(passkey.credentialId)}
                      />
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
