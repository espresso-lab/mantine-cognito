import {
  Anchor,
  Paper,
  Stack,
  TextInput,
  Group,
  Center,
  Button,
  Text,
} from "@mantine/core";
import { useForm, isEmail, isNotEmpty } from "@mantine/form";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAuth } from "../Hooks/useAuth";
import { NewPasswordInput } from "./NewPasswordInput";
import { translation } from "../translation";

export function Register() {
  const { register, user, setMode } = useAuth();
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: isEmail("Invalid email."),
      password: isNotEmpty("Password required."),
    },
  });

  async function onSubmit() {
    try {
      await register(form.values);
      setMode("login");
    } catch (reason) {
      if (reason instanceof Error) {
        switch (reason.name) {
          case "UsernameExistsException": {
            form.setFieldError("email", reason.message);
            break;
          }
          case "InvalidPasswordException": {
            form.setFieldError("password", reason.message);
            break;
          }
          default: {
            console.error(reason.name, reason.message);
          }
        }
      }
    }
  }

  if (user) {
    setMode("login");
  }

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md">
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label={translation.fields.email}
            placeholder="you@email.com"
            withAsterisk
            {...form.getInputProps("email")}
          />
          <NewPasswordInput
            label={translation.fields.password}
            placeholder="Password"
            {...form.getInputProps("password")}
            withAsterisk
            showRequirements={
              form.isDirty("password") || form.isTouched("password")
            }
          />
          <Group justify="space-between">
            <Anchor
              onClick={() => {
                form.reset();
                setMode("login");
              }}
              c="dimmed"
              size="sm"
            >
              <Center inline>
                <IconArrowLeft size={20} />
                <Text ml={5}>{translation.links.backToLogin}</Text>
              </Center>
            </Anchor>
            <Button type="submit">{translation.buttons.register}</Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
