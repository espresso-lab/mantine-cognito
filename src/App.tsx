import React from "react";
import { Button, MantineProvider, Text } from "@mantine/core";
import { MantineAuth } from "./Components/MantineAuth";
import { MFASetup } from "./Components/MFASetup";
import { useAuth } from "./Hooks/useAuth";

function App() {
  return (
    <MantineProvider>
      <MantineAuth
        cognitoUserPoolId="eu-central-1_zkn7FzwJc"
        cognitoClientId="7o7ohldbtts5tj8ual0d2sb8kv"
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

  return (
    <>
      <Text>Logged in as {email}</Text>
      <Button onClick={logout}>Logout</Button>
      <MFASetup mfaAppName="test" />
    </>
  );
}

export default App;
