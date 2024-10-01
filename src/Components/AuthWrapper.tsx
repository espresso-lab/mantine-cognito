import { Container } from "@mantine/core";
import { useAuth } from "../Hooks/useAuth";
import { Login } from "./Login";
import { Register } from "./Register";
import { ForgotPassword } from "./ForgotPassword";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, stage } = useAuth();
  return user ? (
    children
  ) : (
    <Container size={420} my={40}>
      {stage === "login" && <Login />}
      {stage === "register" && <Register />}
      {stage === "forgotPassword" && <ForgotPassword />}
    </Container>
  );
}
