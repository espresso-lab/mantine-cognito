export { MantineAuth } from "./Components/MantineAuth";
export { MFASetup } from "./Components/MFASetup";
export { EmailVerification } from "./Components/EmailVerification";
export type { EmailVerificationProps } from "./Components/EmailVerification";
export type { MfaConfig } from "./Components/MfaNudge";
export { useAuth } from "./Hooks/useAuth";
export type {
  ConfirmForgotPasswordProps,
  ConfirmRegistrationProps,
  ConfirmMFAProps,
  ForcedPasswordResetProps,
  ForgotPasswordProps,
  LoginProps,
  LogoutProps,
  RegisterProps,
  UpdateAttributesProps,
  VerifyAttributeProps,
} from "./Context/AuthContext";

export type { SignInNextStep, SignOutScope, VerifiableAttribute } from "./Context/cognito";

export {
  getIdToken,
  getAccessToken,
  registerPasskey,
  getPasskeys,
  removePasskey,
} from "./Context/cognito";