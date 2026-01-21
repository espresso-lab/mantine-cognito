import { AuthProvider, Language } from "../Context/AuthContext";
import { AuthWrapper } from "./AuthWrapper";

interface MantineAuthProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration?: boolean;
  children: React.ReactNode;
  language?: Language;
  headerSection?: React.ReactNode;
  footerSection?: React.ReactNode;
}

export function MantineAuth({
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration = true,
  children,
  language = 'en',
  headerSection,
  footerSection
}: MantineAuthProps) {
  return (
    <AuthProvider
      {...{ cognitoUserPoolId, cognitoClientId, allowRegistration, language }}
    >
      <AuthWrapper
          headerSection={headerSection}
          footerSection={footerSection}
      >{children}</AuthWrapper>
    </AuthProvider>
  );
}
