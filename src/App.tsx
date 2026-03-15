import {Button, Center, MantineProvider, Text} from "@mantine/core";
import { MantineAuth } from "./Components/MantineAuth";
import { MFASetup } from "./Components/MFASetup";
import { useAuth } from "./Hooks/useAuth";

function App() {
  return (
    <MantineProvider>
      <MantineAuth
        cognitoUserPoolId={import.meta.env.VITE_COGNITO_USER_POOL_ID}
        cognitoClientId={import.meta.env.VITE_COGNITO_CLIENT_ID}
        allowRegistration={true}
        headerSection={<Center>Example Company</Center>}
        footerSection={<Text size="xs" p="md">Link to homepage</Text>}
      >
        <SecureContent />
      </MantineAuth>
    </MantineProvider>
  );
}

function SecureContent() {
  const { logout, userAttributes } = useAuth();
  const { email } = userAttributes || {};

  return (
    <>
      <Text>Logged in as {email}</Text>
      <Button onClick={logout}>Logout</Button>
      <MFASetup mfaAppName="test" enablePasskeys />
    </>
  );
}

export default App;
