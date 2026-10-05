import { Anchor, Center, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "../Hooks/useTranslation.ts";

export function BackToLogin({ onClick }: { onClick: () => void }) {
  const translation = useTranslation();
  return (
    <Anchor component="button" type="button" onClick={onClick} c="dimmed" size="sm">
      <Center inline>
        <IconArrowLeft size={16} />
        <Text ml={4} size="sm">
          {translation.links.backToLogin}
        </Text>
      </Center>
    </Anchor>
  );
}
