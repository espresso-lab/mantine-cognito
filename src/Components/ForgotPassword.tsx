import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  InputLabel,
  Paper,
  PinInput,
  Text,
  TextInput,
} from "@mantine/core";
import { isEmail, isNotEmpty, useForm } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { NewPasswordInput } from "./NewPasswordInput";
import { useAuth } from "../Hooks/useAuth";

export function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword, setStage } = useAuth();

  const [nextStage, setNextStage] = useState(false);
  const forgotPasswordForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: isEmail("Invalid email."),
    },
  });

  const newPasswordForm = useForm({
    initialValues: {
      totp: "",
      password: "",
    },
    validate: {
      totp: isNotEmpty("Code required."),
      password: isNotEmpty("Password required."),
    },
  });

  async function onForgotPassword() {
    try {
      await forgotPassword(forgotPasswordForm.values);
      setNextStage(true);
    } catch (reason) {
      if (reason instanceof Error) {
        console.log(reason.name, reason.message);
        switch (reason.name) {
          case "UserNotFoundException": {
            forgotPasswordForm.setFieldError("email", reason.message);
            break;
          }
          default: {
            forgotPasswordForm.setFieldError("email", reason.message);
            console.error(reason.name, reason.message);
          }
        }
      }
    }
  }

  async function onNewPassword() {
    try {
      await confirmForgotPassword({
        ...forgotPasswordForm.values,
        ...newPasswordForm.values,
      });
      setStage("login");
    } catch (reason) {
      if (reason instanceof Error) {
        console.log(reason.name, reason.message);
        switch (reason.name) {
          case "CodeMismatchException": {
            newPasswordForm.setFieldError("totp", reason.message);
            break;
          }
          default: {
            newPasswordForm.setFieldError("password", reason.message);
            console.error(reason.name, reason.message);
          }
        }
      }
    }
  }

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md">
      {nextStage ? (
        <form onSubmit={newPasswordForm.onSubmit(onNewPassword)}>
          <Box>
            <InputLabel required>Recovery Code</InputLabel>
            <Center>
              <PinInput
                oneTimeCode
                type="number"
                size="md"
                length={6}
                autoFocus={nextStage}
                {...newPasswordForm.getInputProps("totp")}
              />
            </Center>
            <Text c="red" size="xs">
              {newPasswordForm.errors.totp}
            </Text>
          </Box>
          <NewPasswordInput
            label="Neues Passwort"
            placeholder="Neues Passwort"
            {...newPasswordForm.getInputProps("password")}
            withAsterisk
          />
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                newPasswordForm.reset();
                setStage("login");
              }}
              c="dimmed"
              size="sm"
            >
              <Center inline>
                <IconArrowLeft size={20} />
                <Text ml={5}>Zurück zum Login</Text>
              </Center>
            </Anchor>
            <Button type="submit">Submit</Button>
          </Group>
        </form>
      ) : (
        <form onSubmit={forgotPasswordForm.onSubmit(onForgotPassword)}>
          <TextInput
            label="E-Mail"
            placeholder="you@email.com"
            withAsterisk
            {...forgotPasswordForm.getInputProps("email")}
          />
          <Group justify="space-between" mt="lg">
            <Anchor
              onClick={() => {
                forgotPasswordForm.reset();
                setStage("login");
              }}
              c="dimmed"
              size="sm"
            >
              <Center inline>
                <IconArrowLeft size={20} />
                <Text ml={5}>Zurück zum Login</Text>
              </Center>
            </Anchor>
            <Button type="submit">Absenden</Button>
          </Group>
        </form>
      )}
    </Paper>
  );
}
