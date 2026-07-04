import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronRight,
  IconDeviceMobile,
  IconFingerprint,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getMFAPreference, getPasskeys, registerPasskey } from "../Context/cognito";
import { TotpSetup } from "./TotpSetup";
import { useAuth } from "../Hooks/useAuth";
import { useTranslation } from "../Hooks/useTranslation.ts";

export interface MfaConfig {
  appName: string;
  nudge?: boolean;
  enablePasskeys?: boolean;
}

const DISMISS_KEY = "mantine-cognito.mfa-nudge-dismissed";

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
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Group wrap="nowrap">
        <ThemeIcon variant="light" size="xl" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={2} flex={1}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
        <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
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

  useEffect(() => {
    if (!isAuthenticated || config.nudge === false) {
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) {
        return;
      }
    } catch {
      return;
    }
    let active = true;
    (async () => {
      try {
        const pref = await getMFAPreference();
        if (pref.enabled?.includes("TOTP")) {
          return;
        }
        if (config.enablePasskeys !== false) {
          const { credentials } = await getPasskeys();
          if ((credentials ?? []).length > 0) {
            return;
          }
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
  }, [isAuthenticated, config.nudge, config.enablePasskeys]);

  const close = () => {
    setOpened(false);
    setView("choice");
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      void 0;
    }
    close();
  };

  const complete = () => close();

  const onSetupPasskey = async () => {
    setPasskeyLoading(true);
    try {
      await registerPasskey();
      complete();
    } catch {
      void 0;
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      size="md"
      withCloseButton={false}
      overlayProps={{ blur: 3 }}
    >
      <Stack gap="md" p="xs">
        <Stack gap={4} align="center">
          <ThemeIcon variant="light" color="teal" size={48} radius="xl">
            <IconShieldCheck size={28} />
          </ThemeIcon>
          <Text fw={700} size="lg" ta="center">
            {translation.title.secureAccount}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {translation.description.secureAccount}
          </Text>
        </Stack>

        {view === "choice" && (
          <>
            <Stack gap="sm">
              {config.enablePasskeys !== false && (
                <OptionButton
                  icon={<IconFingerprint size={24} />}
                  title={translation.buttons.setupPasskey}
                  description={translation.texts.secureAccountPasskey}
                  onClick={onSetupPasskey}
                  loading={passkeyLoading}
                />
              )}
              <OptionButton
                icon={<IconDeviceMobile size={24} />}
                title={translation.buttons.setupAuthenticator}
                description={translation.texts.secureAccountTotp}
                onClick={() => setView("totp")}
              />
            </Stack>
            <Button variant="subtle" color="gray" onClick={dismiss}>
              {translation.buttons.skipForNow}
            </Button>
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
