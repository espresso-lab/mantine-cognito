import {
  Box,
  Center,
  Group,
  PasswordInput,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { useInputState } from "@mantine/hooks";
import { IconCheck, IconX } from "@tabler/icons-react";

import type { PasswordInputProps } from "@mantine/core";
import { translation } from "../translation";

type NewPasswordInputProps = PasswordInputProps & {
  showRequirements?: boolean;
};

const PasswordRequirement = ({
  meets,
  label,
}: {
  meets: boolean;
  label: string;
}) => {
  return (
    <Center>
      {meets ? (
        <IconCheck color={meets ? "teal" : "red"} size={12} stroke={1.5} />
      ) : (
        <IconX color={meets ? "teal" : "red"} size={12} stroke={1.5} />
      )}
      <Text size="sm" c={meets ? "teal" : "red"} ml={3}>
        {label}
      </Text>
    </Center>
  );
};

const requirements = [
  { re: /^.{8,}$/, label: translation.passwortRequirements.min },
  { re: /[0-9]/, label: translation.passwortRequirements.number },
  { re: /[a-z]/, label: translation.passwortRequirements.lowercase },
  { re: /[A-Z]/, label: translation.passwortRequirements.uppercase },
  {
    re: /[$&+,:;=?@#|'<>.^*()%!-]/,
    label: translation.passwortRequirements.special,
  },
];

const getStrength = (password: NewPasswordInputProps["value"]) => {
  if (password === undefined) return 0;

  const value = password.toString();
  let multiplier = value.length > 5 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(value)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
};

export function NewPasswordInput(props: NewPasswordInputProps) {
  const [value, setValue] = useInputState(props.value);
  const strength = getStrength(value);
  const valueString = value === undefined ? "" : value.toString();

  const onChange: NewPasswordInputProps["onChange"] = (event) => {
    setValue(event.currentTarget.value);
    props.onChange?.(event);
  };

  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement
      key={index}
      label={requirement.label}
      meets={requirement.re.test(valueString)}
    />
  ));

  const bars = Array(4)
    .fill(0)
    .map((_, index) => {
      return (
        <Progress
          animated={false}
          value={
            valueString.length > 0 && index === 0
              ? 100
              : strength >= ((index + 1) / 4) * 100
                ? 100
                : 0
          }
          color={strength > 80 ? "teal" : strength > 50 ? "yellow" : "red"}
          key={index}
          size={4}
        />
      );
    });

  // required because showRequirements does not exist on PasswordInput
  const passwordInputProps = {
    ...props,
    showRequirements: undefined,
  };

  return (
    <Box>
      <PasswordInput {...passwordInputProps} onChange={onChange} />

      <Group gap={5} grow mt="xs" mb="md">
        {bars}
      </Group>

      {props.showRequirements && (
        <Stack align="start" gap={0}>
          {checks}
        </Stack>
      )}
    </Box>
  );
}
