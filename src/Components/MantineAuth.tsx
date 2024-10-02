import { AuthProvider, Language } from "../Context/AuthContext";
import { AuthWrapper } from "./AuthWrapper";

interface MantineAuthProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration?: boolean;
  children: React.ReactNode;
  language?: Language;
}

export function MantineAuth({
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration = true,
  children,
  language = 'en'
}: MantineAuthProps) {
  return (
    <AuthProvider
      {...{ cognitoUserPoolId, cognitoClientId, allowRegistration, language }}
    >
      <AuthWrapper>{children}</AuthWrapper>
    </AuthProvider>
  );
}
