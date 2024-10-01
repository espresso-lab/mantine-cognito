import {
  Anchor,
  Box,
  Button,
  Center,
  InputLabel,
  Paper,
  PinInput,
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
import { translation } from "../translation";

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
        <Text size="sm" ta="center">
          {translation.texts.scanQRCode}
          <Anchor
            size="sm"
            onClick={() => {
              clipboard.copy(code);
            }}
          >
            {translation.links.clickHere}
          </Anchor>{" "}
          {translation.texts.copyCode}
        </Text>
        <Center mt="lg">
          <QRCode value={value} />
        </Center>
        <Text size="sm" ta="center" mt="lg">
          {translation.texts.enterCode}
        </Text>
        <TextInput
          label="Device Name"
          {...form.getInputProps("deviceName")}
          mt="lg"
        />
        <Box mt="md">
          <InputLabel required>{translation.title.mfa}</InputLabel>
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
        <Button
          fullWidth
          mt="lg"
          onClick={() => {
            setCode(undefined);
            setMode("disabled");
          }}
        >
          {translation.buttons.cancel}
        </Button>
      </form>
    ) : (
      <Text size="sm" c="red">
        {translation.errors.noCode}
      </Text>
    );

  return (
    <Paper p={30} mt={30} maw={380}>
      {mode === "disabled" && (
        <Button onClick={onStartEnable}>{translation.buttons.enableMFA}</Button>
      )}
      {mode === "enabling" && enabling}
      {mode === "enabled" && (
        <Button color="red" onClick={onDisable}>
          {translation.buttons.disableMFA}
        </Button>
      )}
    </Paper>
  );
}
