# Mantine UI Wrapper for AWS Cognito

This is a simple wrapper for the [Mantine UI](https://mantine.dev/) library to work with [AWS Cognito](https://aws.amazon.com/cognito/).

[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![NPM Version](https://img.shields.io/npm/v/@espresso-lab/mantine-cognito.svg?style=flat)]()
[![NPM Downloads](https://img.shields.io/npm/d18m/@espresso-lab/mantine-cognito.svg?style=flat)]()


![image](https://raw.githubusercontent.com/espresso-lab/mantine-cognito/refs/heads/main/docs/screenshots.png)

## Installation

```bash
npm i @espresso-lab/mantine-cognito
```

## Usage

### `<MantineAuth>`-Provider

```tsx
import { MantineAuth, MFASetup } from "@espresso-lab/mantine-cognito";

function App() {
  return (
    <MantineAuth
      cognitoUserPoolId="<cognito-user-pool-id>"
      cognitoClientId="<cognito-client-id>"
      language="en"
    >
      <p>You are logged in!</p>
      <MFASetup mfaAppName="Test" />
    </MantineAuth>
  );
}

export default App;
```

In the example above, the `MantineAuth` component will handle the authentication flow with AWS Cognito. The `MFASetup` component will handle the MFA setup flow.

### `useAuth()`-Hook

```tsx
import { Button, Paper, Title } from "@mantine/core";
import { useAuth } from "@espresso-lab/mantine-cognito";

export function AnyComponent() {
  const { logout, userAttributes } = useAuth();
  const { given_name } = userAttributes || {};

  return (
    <Paper>
      <Title>Hello {given_name}</Title>
      <Button onClick={logout}>Logout</Button>
    </Paper>
  );
}
```

In the example above, the `useAuth` hook is used to get the user attributes and the logout function.
The `useAuth` hook works only inside the `MantineAuth`-Provider.

### Backend authorization

```tsx
import { getIdToken, getAccessToken } from "@espresso-lab/mantine-cognito";

export async function myApiCall() {
  fetch("https://example.com/api", {
      method: "GET",
      headers: {
          "Authorization": await getIdToken() ?? ""
      }
  });
}
```
