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
} from "aws-amplify/auth";

export type UserAttributes = Record<string, string | boolean>;

export type SignInNextStep =
  | "DONE"
  | "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
  | "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
  | "CONFIRM_SIGN_IN_WITH_PASSWORD"
  | "CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION"
  | "CONFIRM_SIGN_UP";

export interface SignInResult {
  isSignedIn: boolean;
  nextStep: SignInNextStep;
}

interface UserPoolAttributes {
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export function initUserPool(poolProps: UserPoolAttributes) {
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

export async function signUp(email: string, password: string) {
  return amplifySignUp({
    username: email.toLowerCase(),
    password,
    options: { userAttributes: { email: email.toLowerCase() } },
  });
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  await amplifySignOut().catch(() => {});
  const { isSignedIn, nextStep } = await amplifySignIn({
    username: email.toLowerCase(),
    password,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep as SignInNextStep,
  };
}

export async function signInWithPasskey(email: string): Promise<SignInResult> {
  await amplifySignOut().catch(() => {});
  const { isSignedIn, nextStep } = await amplifySignIn({
    username: email.toLowerCase(),
    options: {
      authFlowType: "USER_AUTH",
      preferredChallenge: "WEB_AUTHN",
    },
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep as SignInNextStep,
  };
}

export async function confirmSignInWithCode(code: string): Promise<SignInResult> {
  const { isSignedIn, nextStep } = await confirmSignIn({
    challengeResponse: code,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep as SignInNextStep,
  };
}

export async function confirmSignInWithNewPassword(password: string): Promise<SignInResult> {
  const { isSignedIn, nextStep } = await confirmSignIn({
    challengeResponse: password,
  });
  return {
    isSignedIn,
    nextStep: nextStep.signInStep as SignInNextStep,
  };
}

export async function signOut() {
  await amplifySignOut({ global: true });
}

export async function isSessionValid() {
  const session = await fetchAuthSession();
  return session.tokens !== undefined;
}

export async function getAccessToken() {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString();
}

export async function getIdToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString();
}

export async function getUserAttributes(): Promise<UserAttributes> {
  const attrs = await fetchUserAttributes();
  return convertAttributes(attrs);
}

export async function confirmRegistration(email: string, code: string) {
  await confirmSignUp({ username: email.toLowerCase(), confirmationCode: code });
}

export async function resendAccountConfirmationCode(email: string) {
  await resendSignUpCode({ username: email.toLowerCase() });
}

export async function resendEmailConfirmationCode() {
  await sendUserAttributeVerificationCode({ userAttributeKey: "email" });
}

export async function updateUserAttributes(attributes: UserAttributes) {
  const userAttributes = Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, String(value)]),
  );
  await amplifyUpdateUserAttributes({ userAttributes });
}

export async function passwordReset(email: string) {
  await resetPassword({ username: email.toLowerCase() });
}

export async function confirmPasswordReset(email: string, code: string, password: string) {
  await confirmResetPassword({
    username: email.toLowerCase(),
    confirmationCode: code,
    newPassword: password,
  });
}

export async function verifyUserAttribute(attribute: "email" | "phone_number", code: string) {
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
}

export async function getPasskeys() {
  return listWebAuthnCredentials();
}

export async function removePasskey(credentialId: string) {
  await deleteWebAuthnCredential({ credentialId });
}
