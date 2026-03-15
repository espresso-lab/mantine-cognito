export { MantineAuth } from "./Components/MantineAuth";
export { MFASetup } from "./Components/MFASetup";
export { useAuth } from "./Hooks/useAuth";
export type {
  ConfirmForgotPasswordProps,
  ConfirmRegistrationProps,
  ConfirmMFAProps,
  ForcedPasswordResetProps,
  ForgotPasswordProps,
  LoginProps,
  RegisterProps,
  UpdateAttributesProps,
  VerifyAttributeProps,
} from "./Context/AuthContext";

export {
  getIdToken,
  getAccessToken,
  registerPasskey,
  getPasskeys,
  removePasskey,
} from "./Context/cognito";