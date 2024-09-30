import { AuthProvider } from "../Context/AuthContext";
import { AuthWrapper } from "./AuthWrapper";

interface MantineAuthProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration?: boolean;
  children: React.ReactNode;
}

export function MantineAuth({
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration = true,
  children,
}: MantineAuthProps) {
  return (
    <AuthProvider
      {...{ cognitoUserPoolId, cognitoClientId, allowRegistration }}
    >
      <AuthWrapper>{children}</AuthWrapper>
    </AuthProvider>
  );
}
