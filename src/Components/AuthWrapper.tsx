import { Container, Title, Text } from "@mantine/core";
import { useAuth } from "../Hooks/useAuth";
import { Login } from "./Login";
import { Register } from "./Register";
import { ForgotPassword } from "./ForgotPassword";
import {useTranslation} from "../Hooks/useTranslation.ts";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { userAttributes, stage } = useAuth();
  const translation = useTranslation();

  return userAttributes ? (
    children
  ) : (
    <Container size={420} my={40}>
      <Title ta="center">
        {stage === "login" && translation.title.login}
        {stage === "register" && translation.title.register}
        {stage === "forgotPassword" && translation.title.forgotPassword}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {stage === "login" && translation.description.login}
        {stage === "register" && translation.description.register}
        {stage === "forgotPassword" && translation.description.forgotPassword}
      </Text>
      {stage === "login" && <Login />}
      {stage === "register" && <Register />}
      {stage === "forgotPassword" && <ForgotPassword />}
    </Container>
  );
}
