import { MantineProvider } from "@mantine/core";
import { MantineAuth } from "./Components/MantineAuth";

function App() {
  return (
    <MantineProvider>
      <MantineAuth
        cognitoUserPoolId="eu-central-1_zkn7FzwJc"
        cognitoClientId="7o7ohldbtts5tj8ual0d2sb8kv"
      >
        <p>Logged in</p>
      </MantineAuth>
    </MantineProvider>
  );
}

export default App;
