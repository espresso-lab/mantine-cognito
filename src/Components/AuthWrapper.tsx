import { Center, Container, Divider, Loader, Paper, Text, Title } from "@mantine/core";
import { useAuth } from "../Hooks/useAuth";
import { Login } from "./Login";
import { Register } from "./Register";
import { ForgotPassword } from "./ForgotPassword";
import { MfaNudge, MfaConfig } from "./MfaNudge";
import { useTranslation } from "../Hooks/useTranslation.ts";

interface AuthWrapperProps {
  children: React.ReactNode;
  headerSection?: React.ReactNode;
  footerSection?: React.ReactNode;
  mfa?: MfaConfig;
}

export function AuthWrapper({ children, headerSection, footerSection, mfa }: AuthWrapperProps) {
  const { isAuthenticated, initializing, stage } = useAuth();
  const translation = useTranslation();

  if (initializing) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        {children}
        {mfa && <MfaNudge config={mfa} />}
      </>
    );
  }

  return (
    <Container size={420} my={40}>
      {headerSection}

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title ta="center" order={2}>
          {stage === "login" && translation.title.login}
          {stage === "register" && translation.title.register}
          {stage === "forgotPassword" && translation.title.forgotPassword}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mt={5}>
          {stage === "login" && translation.description.login}
          {stage === "register" && translation.description.register}
          {stage === "forgotPassword" && translation.description.forgotPassword}
        </Text>

        <Divider my="md" />

        {stage === "login" && <Login />}
        {stage === "register" && <Register />}
        {stage === "forgotPassword" && <ForgotPassword />}
      </Paper>

      {footerSection}
    </Container>
  );
}
