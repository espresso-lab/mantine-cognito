import { Amplify } from "aws-amplify";
import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  confirmUserAttribute,
  fetchAuthSession,
  fetchMFAPreference,
  fetchUserAttributes,
  resendSignUpCode,
  resetPassword,
  sendUserAttributeVerificationCode,
  setUpTOTP,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  updateMFAPreference,
  updateUserAttributes as amplifyUpdateUserAttributes,
  verifyTOTPSetup,
  associateWebAuthnCredential,
  listWebAuthnCredentials,
  deleteWebAuthnCredential,
  signUp as amplifySignUp,
  type FetchUserAttributesOutput,
  type SignInOutput,
} from "aws-amplify/auth";

export type UserAttributes = Record<string, string | boolean>;

export type SignInNextStep = SignInOutput["nextStep"]["signInStep"];

export type VerifiableAttribute = "email" | "phone_number";

export interface SignInResult {
  isSignedIn: boolean;
  nextStep: SignInNextStep;
}

export type SignOutScope = "global" | "local";

interface UserPoolAttributes {
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

let configuredClientId: string | undefined;

/**
 * Every Amplify.configure resets the token store and freezes a new config, so the pool is
 * configured once per client and not on every render of the provider.
 */
export function initUserPool(poolProps: UserPoolAttributes) {
  if (configuredClientId === poolProps.cognitoClientId) {
    return;
  }
  configuredClientId = poolProps.cognitoClientId;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: poolProps.cognitoUserPoolId,
        userPoolClientId: poolProps.cognitoClientId,
      },
    },
  });
}

function convertAttributes(attrs: FetchUserAttributesOutput): UserAttributes {
  return Object.entries(attrs).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value === "true" ? true : value === "false" ? false : (value ?? ""),
    }),
    {} as UserAttributes,
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const PASSKEY_HINT_KEY = "mantine-cognito.passkey-email";

/**
 * The hint belongs to one user pool client: an app that offers two logins on the same origin would
 * otherwise propose the address of the other pool, whose passkey cannot answer the challenge.
 */
function passkeyHintKey() {
  const clientId = Amplify.getConfig().Auth?.Cognito?.userPoolClientId;
  return clientId ? `${PASSKEY_HINT_KEY}.${clientId}` : PASSKEY_HINT_KEY;
}

export function getPasskeyHint(): string | null {
  try {
    return localStorage.getItem(passkeyHintKey());
  } catch {
    return null;
  }
}

function setPasskeyHint(email: string) {
  try {
    localStorage.setItem(passkeyHintKey(), normalizeEmail(email));
  } catch {
    void 0;
  }
}

export function clearPasskeyHint() {
  try {
    localStorage.removeItem(passkeyHintKey());
  } catch {
    void 0;
  }
}

export async function signUp(email: string, password: string) {
  return amplifySignUp({
    username: normalizeEmail(email),
    password,
    options: { userAttributes: { email: normalizeEmail(email) } },
  });
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  await amplifySignOut().catch(() => {});
  const { isSignedIn, nextStep } = await amplifySignIn({
    username: normalizeEmail(email),
    password,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep,
  };
}

/**
 * Cognito answers a passkey sign-in of an account without a passkey with the choice of first factors
 * instead of a challenge; the remembered address then no longer stands for a passkey.
 */
export async function signInWithPasskey(email: string): Promise<SignInResult> {
  await amplifySignOut().catch(() => {});
  const { isSignedIn, nextStep } = await amplifySignIn({
    username: normalizeEmail(email),
    options: {
      authFlowType: "USER_AUTH",
      preferredChallenge: "WEB_AUTHN",
    },
  });
  if (isSignedIn) {
    setPasskeyHint(email);
  } else if (nextStep.signInStep === "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION") {
    clearPasskeyHint();
  }
  return {
    isSignedIn,
    nextStep: nextStep.signInStep,
  };
}

/** Whether this window can run a passkey ceremony at all — a native shell may stand in for the browser's API. */
export function passkeysSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "credentials" in navigator &&
    typeof window.PublicKeyCredential === "function"
  );
}

export type PasskeyProblem = "cancelled" | "exists" | "unavailable";

/**
 * What went wrong with a passkey in the terms the user acts on: dismissed the system dialog, already
 * holds one on this device, or cannot use passkeys here. Anything else is an ordinary error.
 */
export function passkeyProblem(error: unknown): PasskeyProblem | null {
  switch (error instanceof Error ? error.name : "") {
    case "PasskeyRegistrationCanceled":
    case "PasskeyAuthenticationCanceled":
    case "PasskeyOperationAborted":
    case "NotAllowedError":
    case "AbortError":
      return "cancelled";
    case "PasskeyAlreadyExists":
    case "InvalidStateError":
      return "exists";
    case "PasskeyNotSupported":
    case "RelyingPartyMismatch":
    case "NotSupportedError":
    case "SecurityError":
      return "unavailable";
    default:
      return null;
  }
}

export async function confirmSignInWithCode(code: string): Promise<SignInResult> {
  const { isSignedIn, nextStep } = await confirmSignIn({
    challengeResponse: code,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep,
  };
}

export async function confirmSignInWithNewPassword(password: string): Promise<SignInResult> {
  const { isSignedIn, nextStep } = await confirmSignIn({
    challengeResponse: password,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep,
  };
}

/**
 * A global sign-out revokes every token the user holds in the pool, on every device and every app
 * client. An app that shares its pool with another one signs the user out there too, so it can ask
 * for "local" and end only the session in this browser.
 */
export async function signOut(scope: SignOutScope = "global") {
  if (scope === "local") {
    await amplifySignOut();
    return;
  }

  try {
    await amplifySignOut({ global: true });
  } catch {
    await amplifySignOut();
  }
}

/**
 * The ID token carries the attributes the backends read (email, name). After a change it has to be
 * fetched anew, or the old values travel along until the token expires on its own.
 */
export async function refreshSession() {
  await fetchAuthSession({ forceRefresh: true });
}

export async function isSessionValid() {
  const session = await fetchAuthSession();
  return session.tokens !== undefined;
}

export async function getAccessToken() {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString();
}

/**
 * Amplify renews a token only seconds before it expires. A request that keeps using the token while it
 * runs — a streamed answer calling tools on the user's behalf — passes how long the token must still be
 * valid, and gets a renewed one when less is left.
 */
export async function getIdToken(minValiditySeconds = 0) {
  const session = await fetchAuthSession();
  const expiresAt = session.tokens?.idToken?.payload.exp;
  if (minValiditySeconds > 0 && expiresAt !== undefined && expiresAt * 1000 - Date.now() < minValiditySeconds * 1000) {
    return (await fetchAuthSession({ forceRefresh: true })).tokens?.idToken?.toString();
  }
  return session.tokens?.idToken?.toString();
}

export async function getUserAttributes(): Promise<UserAttributes> {
  const attrs = await fetchUserAttributes();
  return convertAttributes(attrs);
}

export async function confirmRegistration(email: string, code: string) {
  await confirmSignUp({ username: normalizeEmail(email), confirmationCode: code });
}

export async function resendAccountConfirmationCode(email: string) {
  await resendSignUpCode({ username: normalizeEmail(email) });
}

export async function resendEmailConfirmationCode() {
  await sendUserAttributeVerificationCode({ userAttributeKey: "email" });
}

/** Returns the attributes Cognito holds back until the user confirms them with a code. */
export async function updateUserAttributes(attributes: UserAttributes): Promise<VerifiableAttribute[]> {
  const userAttributes = Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, String(value)]),
  );
  const result = await amplifyUpdateUserAttributes({ userAttributes });
  return Object.entries(result)
    .filter(([, output]) => output.nextStep.updateAttributeStep === "CONFIRM_ATTRIBUTE_WITH_CODE")
    .map(([key]) => key as VerifiableAttribute);
}

export async function passwordReset(email: string) {
  await resetPassword({ username: normalizeEmail(email) });
}

export async function confirmPasswordReset(email: string, code: string, password: string) {
  await confirmResetPassword({
    username: normalizeEmail(email),
    confirmationCode: code,
    newPassword: password,
  });
}

export async function verifyUserAttribute(attribute: VerifiableAttribute, code: string) {
  await confirmUserAttribute({ userAttributeKey: attribute, confirmationCode: code });
}

export async function associateSoftwareToken() {
  const totpSetup = await setUpTOTP();
  return totpSetup.sharedSecret;
}

export async function verifySoftwareToken(code: string) {
  await verifyTOTPSetup({ code });
}

export async function enableMFA() {
  await updateMFAPreference({ totp: "PREFERRED" });
}

export async function disableMFA() {
  await updateMFAPreference({ totp: "DISABLED" });
}

export async function getMFAPreference() {
  return fetchMFAPreference();
}

export async function getUserGroups(): Promise<string[]> {
  const session = await fetchAuthSession();
  return (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) ?? [];
}

export async function registerPasskey() {
  await associateWebAuthnCredential();
  try {
    const attrs = await fetchUserAttributes();
    if (attrs.email) {
      setPasskeyHint(attrs.email);
    }
  } catch {
    void 0;
  }
}

export async function getPasskeys() {
  return listWebAuthnCredentials();
}

export async function removePasskey(credentialId: string) {
  await deleteWebAuthnCredential({ credentialId });
}
