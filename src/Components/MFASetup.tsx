import {
  Anchor,
  Box,
  Button,
  Center,
  InputLabel,
  PinInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useClipboard } from "@mantine/hooks";
import { useEffect, useState } from "react";
import UAParser from "ua-parser-js";
import {
  getUserData,
  verifySoftwareToken,
  enableMFA,
  associateSoftwareToken,
  disableMFA,
} from "../Context/cognito";
import { QRCode } from "./QRCode";

export interface MFASetupProps {
  mfaAppName: string;
}

export function MFASetup({ mfaAppName }: MFASetupProps) {
  const clipboard = useClipboard();
  const [mode, setMode] = useState<"disabled" | "enabling" | "enabled">(
    "disabled",
  );
  const [code, setCode] = useState<string>();
  const [email, setEmail] = useState<string>();

  const uap = new UAParser(navigator.userAgent);
  const name = `${uap.getResult().os.name ?? "Unknown OS"} ${
    uap.getBrowser().name ?? "Unknown Browser"
  }`;
  const form = useForm({
    initialValues: {
      deviceName: name,
      totp: "",
    },
  });

  useEffect(() => {
    getUserData()
      .then((data) => {
        if (data == null) return console.error("No user data in MFASetup.");
        if (data.PreferredMfaSetting === "SOFTWARE_TOKEN_MFA")
          setMode("enabled");
        setEmail(
          data.UserAttributes.find((attr) => attr.Name === "email")?.Value,
        );
      })
      .catch((err: Error) => {
        console.error("Error getting user data", err.message);
      });
  }, []);

  useEffect(() => {
    // forms use React state to store values so we need to wait for a refresh
    // after setting value before processing
    if (
      mode === "enabling" &&
      form.values.totp.length === 6 &&
      !form.errors.totp
    ) {
      // No errors and full length, try the code
      verifySoftwareToken(form.values.totp, form.values.deviceName)
        .then(() => {
          enableMFA()
            .then(() => {
              setMode("enabled");
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err: Error) => {
          form.setFieldError("totp", err.message);
          console.error(err.name, err.message);
        });
    }
  }, [mode, form]);

  const onStartEnable = () => {
    form.setFieldValue("totp", "");
    associateSoftwareToken()
      .then((code) => {
        setCode(code);
        setMode("enabling");
      })
      .catch((err: Error) => {
        console.error("Unable to get MFA code", err.message);
      });
  };

  const onDisable = () => {
    disableMFA()
      .then(() => {
        setMode("disabled");
      })
      .catch((err) => {
        console.error(err.name, err.message);
      });
  };

  const emailPart = email === undefined ? "" : `:${email}`;
  const secretPart = code === undefined ? "" : `?secret=${code}`;
  const value = `otpauth://totp/${mfaAppName}${emailPart}${secretPart}`;
  const enabling =
    code !== undefined ? (
      <form>
        <Stack>
          <Text size="sm">
            Scan the qr code or{" "}
            <Anchor
              size="sm"
              onClick={() => {
                clipboard.copy(code);
              }}
            >
              click here
            </Anchor>{" "}
            to copy the secret code.
          </Text>
          <Center>
            <QRCode value={value} />
          </Center>
          <Text size="sm">
            Then enter the code from your authenticator app.
          </Text>
          <TextInput
            label="Device Name"
            {...form.getInputProps("deviceName")}
          />
          <Box>
            <InputLabel required>Multi-Factor Code</InputLabel>
            <Center>
              <PinInput
                oneTimeCode
                type="number"
                size="md"
                length={6}
                {...form.getInputProps("totp")}
              />
            </Center>
            <Text c="red" size="xs">
              {form.errors.totp}
            </Text>
          </Box>
        </Stack>
      </form>
    ) : (
      <Text size="sm" c="red">
        No code received.
      </Text>
    );

  return (
    <Stack>
      {mode === "disabled" && (
        <Button onClick={onStartEnable}>Enable MFA</Button>
      )}
      {mode === "enabling" && enabling}
      {mode === "enabled" && (
        <Button color="red" onClick={onDisable}>
          Disable MFA
        </Button>
      )}
    </Stack>
  );
}
