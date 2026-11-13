import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronRight,
  IconDeviceMobile,
  IconFingerprint,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getMFAPreference, getPasskeys, passkeyProblem, passkeysSupported, registerPasskey } from "../Context/cognito";
import { TotpSetup } from "./TotpSetup";
import { useAuth } from "../Hooks/useAuth";
import { useTranslation } from "../Hooks/useTranslation.ts";

export interface MfaConfig {
  appName: string;
  nudge?: boolean;
  enablePasskeys?: boolean;
}

const SNOOZE_KEY = "mantine-cognito.mfa-nudge-snoozed-until";
const SNOOZE_DAYS = 14;

/** „Später erinnern“ holds for two weeks: an app that starts with the computer would ask on every start. */
function isSnoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return true;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    void 0;
  }
}

/** A passkey made anywhere — the web app, another device — secures the account, whether or not this window can make one. */
async function hasPasskey() {
  try {
    const { credentials } = await getPasskeys();
    return (credentials ?? []).length > 0;
  } catch {
    return false;
  }
}

function OptionButton({
  icon,
  title,
  description,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      disabled={loading}
      p="md"
      bd="1px solid var(--mantine-color-default-border)"
      bdrs="md"
    >
      <Group wrap="nowrap">
        {icon}
        <Stack gap={2} flex={1}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        {loading ? (
          <Loader size={18} />
        ) : (
          <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
        )}
      </Group>
    </UnstyledButton>
  );
}

export function MfaNudge({ config }: { config: MfaConfig }) {
  const translation = useTranslation();
  const { isAuthenticated } = useAuth();
  const [opened, setOpened] = useState(false);
  const [view, setView] = useState<"choice" | "totp">("choice");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState<string>();
  const offerPasskey = config.enablePasskeys !== false && passkeysSupported();

  useEffect(() => {
    if (!isAuthenticated || config.nudge === false || isSnoozed()) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const pref = await getMFAPreference();
        if (pref.enabled?.includes("TOTP") || (await hasPasskey())) {
          return;
        }
        if (active) {
          setOpened(true);
        }
      } catch {
        void 0;
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, config.nudge]);

  const close = () => {
    setOpened(false);
    setView("choice");
    setError(undefined);
  };

  const dismiss = () => {
    snooze();
    close();
  };

  const complete = () => close();

  const onSetupPasskey = async () => {
    setPasskeyLoading(true);
    setError(undefined);
    try {
      await registerPasskey();
      complete();
    } catch (reason) {
      switch (passkeyProblem(reason)) {
        case "cancelled":
          break;
        case "exists":
          complete();
          break;
        case "unavailable":
          setError(translation.errors.passkeyUnavailable);
          break;
        default:
          setError(translation.errors.generic);
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} centered radius="md" withCloseButton={false}>
      <Stack gap="md" p="xs">
        <Stack gap={4} align="center">
          <ThemeIcon variant="light" color="gray" size={56} radius="xl">
            <IconShieldCheck size={28} />
          </ThemeIcon>
          <Title order={4} ta="center">
            {translation.title.secureAccount}
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            {translation.description.secureAccount}
          </Text>
        </Stack>

        {view === "choice" && (
          <>
            <Stack gap="sm">
              {error && (
                <Alert color="red" title={translation.title.passkeySetupFailed}>
                  {error}
                </Alert>
              )}
              {offerPasskey && (
                <OptionButton
                  icon={<IconFingerprint size={24} color="var(--mantine-color-dimmed)" />}
                  title={translation.buttons.setupPasskey}
                  description={translation.texts.secureAccountPasskey}
                  onClick={onSetupPasskey}
                  loading={passkeyLoading}
                />
              )}
              <OptionButton
                icon={<IconDeviceMobile size={24} color="var(--mantine-color-dimmed)" />}
                title={translation.buttons.setupAuthenticator}
                description={translation.texts.secureAccountTotp}
                onClick={() => setView("totp")}
              />
            </Stack>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={dismiss}>
                {translation.buttons.skipForNow}
              </Button>
            </Group>
          </>
        )}

        {view === "totp" && (
          <TotpSetup
            mfaAppName={config.appName}
            onVerified={complete}
            onCancel={() => setView("choice")}
          />
        )}
      </Stack>
    </Modal>
  );
}
