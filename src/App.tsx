import {Button, MantineProvider} from "@mantine/core";
import { MantineAuth } from "./Components/MantineAuth";
import {useAuth} from "./Hooks/useAuth";

function App() {
  return (
    <MantineProvider>
      <MantineAuth
        cognitoUserPoolId="eu-central-1_zkn7FzwJc"
        cognitoClientId="7o7ohldbtts5tj8ual0d2sb8kv"
      >
          <SecureContent />
      </MantineAuth>
    </MantineProvider>
  );
}

function SecureContent() {
    const { logout, userAttributes } =   useAuth();
    const {email} = userAttributes || {};

    return <>
        <p>Logged in as {email}</p>
        <Button onClick={logout}>Logout</Button>
    </>
}

export default App;
