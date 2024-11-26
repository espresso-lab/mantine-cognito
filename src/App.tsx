import { Button, MantineProvider, Text } from "@mantine/core";
import { MantineAuth } from "./Components/MantineAuth";
import { MFASetup } from "./Components/MFASetup";
import { useAuth } from "./Hooks/useAuth";

function App() {
  return (
    <MantineProvider>
      <MantineAuth
        cognitoUserPoolId="eu-central-1_hTk8B9TeZ"
        cognitoClientId="4f8lepkmgdmin6vein41gbhfh9"
        allowRegistration={true}
      >
        <SecureContent />
      </MantineAuth>
    </MantineProvider>
  );
}

function SecureContent() {
  const { logout, userAttributes } = useAuth();
  const { email } = userAttributes || {};

  console.log("userAttributes", userAttributes);

  return (
    <>
      <Text>Logged in as {email}</Text>
      <Button onClick={logout}>Logout</Button>
      <MFASetup mfaAppName="test" />
    </>
  );
}

export default App;
