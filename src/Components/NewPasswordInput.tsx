import {
  Box,
  Center,
  Group,
  PasswordInput,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { PasswordInputProps } from "@mantine/core";
import { useRoleColor } from "../Hooks/useRoleColor";
import { useTranslation } from "../Hooks/useTranslation.ts";
import { useState } from "react";

type NewPasswordInputProps = PasswordInputProps & {
  showRequirements?: boolean;
};

const PasswordRequirement = ({ meets, label }: { meets: boolean; label: string }) => {
  const success = useRoleColor("success");
  return (
    <Center>
      {meets ? (
        <IconCheck color={`var(--mantine-color-${success}-filled)`} size={12} stroke={1.5} />
      ) : (
        <IconX color="var(--mantine-color-red-filled)" size={12} stroke={1.5} />
      )}
      <Text size="sm" c={meets ? success : "red"} ml={4}>
        {label}
      </Text>
    </Center>
  );
};

const getStrength = (password: string, requirements: { re: RegExp; label: string }[]) => {
  let multiplier = password.length > 5 ? 0 : 1;
  requirements.forEach(({ re }) => {
    if (!re.test(password)) multiplier += 1;
  });
  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
};

export function NewPasswordInput({ showRequirements, onChange, value, ...rest }: NewPasswordInputProps) {
  const [touched, setTouched] = useState(false);
  const translation = useTranslation();
  const success = useRoleColor("success");
  const warning = useRoleColor("warning");

  const valueStr = typeof value === "string" ? value : "";

  const requirements = [
    { re: /^.{8,}$/, label: translation.passwordRequirements.min },
    { re: /[0-9]/, label: translation.passwordRequirements.number },
    { re: /[a-z]/, label: translation.passwordRequirements.lowercase },
    { re: /[A-Z]/, label: translation.passwordRequirements.uppercase },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: translation.passwordRequirements.special },
  ];

  const strength = getStrength(valueStr, requirements);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTouched(true);
    onChange?.(event);
  };

  return (
    <Box>
      <PasswordInput {...rest} value={value} onChange={handleChange} />

      <Group gap={4} grow mt="xs" mb="md">
        {Array.from({ length: 4 }, (_, i) => (
          <Progress
            animated={false}
            value={valueStr.length > 0 && i === 0 ? 100 : strength >= ((i + 1) / 4) * 100 ? 100 : 0}
            color={strength > 80 ? success : strength > 50 ? warning : "red"}
            key={i}
            size={4}
          />
        ))}
      </Group>

      {showRequirements && touched && (
        <Stack align="start" gap={0}>
          {requirements.map(({ re, label }) => (
            <PasswordRequirement key={label} meets={re.test(valueStr)} label={label} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
