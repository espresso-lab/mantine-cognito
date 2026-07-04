import { AuthProvider, Language } from "../Context/AuthContext";
import { AuthWrapper } from "./AuthWrapper";
import { MfaConfig } from "./MfaNudge";

interface MantineAuthProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration?: boolean;
  children: React.ReactNode;
  language?: Language;
  headerSection?: React.ReactNode;
  footerSection?: React.ReactNode;
  mfa?: MfaConfig;
}

export function MantineAuth({
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration = true,
  children,
  language = "en",
  headerSection,
  footerSection,
  mfa,
}: MantineAuthProps) {
  return (
    <AuthProvider
      cognitoUserPoolId={cognitoUserPoolId}
      cognitoClientId={cognitoClientId}
      allowRegistration={allowRegistration}
      language={language}
    >
      <AuthWrapper headerSection={headerSection} footerSection={footerSection} mfa={mfa}>
        {children}
      </AuthWrapper>
    </AuthProvider>
  );
}
