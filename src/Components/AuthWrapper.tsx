import { Container } from "@mantine/core";
import { useAuth } from "../Hooks/useAuth";
import { Login } from "./Login";
import { Register } from "./Register";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, mode } = useAuth();
  return user ? (
    children
  ) : (
    <Container size={420} my={40}>
      {mode === "login" && <Login />}
      {mode === "register" && <Register />}
    </Container>
  );
}
