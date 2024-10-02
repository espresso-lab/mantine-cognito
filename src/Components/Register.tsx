import {
  Anchor,
  Paper,
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
import {useTranslation} from "../Hooks/useTranslation.ts";

export function Register() {
  const translation = useTranslation();
  const { register, user, setStage } = useAuth();
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: isEmail(translation.validation.email),
      password: isNotEmpty(translation.validation.password),
    },
  });

  async function onSubmit() {
    try {
      await register(form.values);
      setStage("login");
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
    setStage("login");
  }

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md">
      <form onSubmit={form.onSubmit(onSubmit)}>
        <TextInput
          label={translation.fields.email}
          placeholder={translation.placeholders.email}
          withAsterisk
          {...form.getInputProps("email")}
        />
        <NewPasswordInput
          label={translation.fields.password}
          placeholder={translation.placeholders.password}
          {...form.getInputProps("password")}
          withAsterisk
          mt="md"
          showRequirements={
            form.isDirty("password") || form.isTouched("password")
          }
        />
        <Group justify="space-between" mt="lg">
          <Anchor
            onClick={() => {
              form.reset();
              setStage("login");
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
      </form>
    </Paper>
  );
}
