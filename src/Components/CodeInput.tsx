import { Box, Center, InputLabel, PinInput, Text } from "@mantine/core";
import type { PinInputProps } from "@mantine/core";
import type { ReactNode } from "react";

type CodeInputProps = Omit<PinInputProps, "error"> & {
  label?: ReactNode;
  error?: ReactNode;
};

export function CodeInput({ label, error, ...pinProps }: CodeInputProps) {
  return (
    <Box>
      {label && (
        <InputLabel required mb={4} display="block" ta="center">
          {label}
        </InputLabel>
      )}
      <Center>
        <PinInput
          oneTimeCode
          type="number"
          size="md"
          length={6}
          error={!!error}
          {...pinProps}
        />
      </Center>
      {error && (
        <Text c="red" size="xs" mt={6} ta="center">
          {error}
        </Text>
      )}
    </Box>
  );
}
