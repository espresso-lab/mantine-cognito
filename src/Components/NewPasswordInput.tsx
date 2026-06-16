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
import { useTranslation } from "../Hooks/useTranslation.ts";
import { useState } from "react";

type NewPasswordInputProps = PasswordInputProps & {
  showRequirements?: boolean;
};

const PasswordRequirement = ({ meets, label }: { meets: boolean; label: string }) => (
  <Center>
    {meets ? (
      <IconCheck color="teal" size={12} stroke={1.5} />
    ) : (
      <IconX color="red" size={12} stroke={1.5} />
    )}
    <Text size="sm" c={meets ? "teal" : "red"} ml={3}>
      {label}
    </Text>
  </Center>
);

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

      <Group gap={5} grow mt="xs" mb="md">
        {Array.from({ length: 4 }, (_, i) => (
          <Progress
            animated={false}
            value={valueStr.length > 0 && i === 0 ? 100 : strength >= ((i + 1) / 4) * 100 ? 100 : 0}
            color={strength > 80 ? "teal" : strength > 50 ? "yellow" : "red"}
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
