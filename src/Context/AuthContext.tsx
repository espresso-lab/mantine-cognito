import {
  SignInResult,
} from "./cognito";

import { createContext, ReactNode, useEffect } from "react";

import {
  confirmPasswordReset,
  confirmRegistration,
  confirmSignInWithCode,
  confirmSignInWithNewPassword,
  getUserAttributes,
  getUserGroups,
  initUserPool,
  isSessionValid,
  passwordReset,
  resendAccountConfirmationCode,
  resendEmailConfirmationCode,
  signIn,
  signInWithPasskey,
  signOut,
  signUp,
  updateUserAttributes,
  UserAttributes,
  verifyUserAttribute,
} from "./cognito";
import usePersistentState from "../Hooks/usePersistentState.ts";

export interface RegisterProps {
  email: string;
  password: string;
}

export interface ConfirmRegistrationProps {
  email: string;
  totp: string;
}

export interface ForgotPasswordProps {
  email: string;
}

export interface ConfirmForgotPasswordProps {
  email: string;
  password: string;
  totp: string;
}

export interface LoginProps {
  email: string;
  password: string;
}

export interface ConfirmMFAProps {
  code: string;
}

export interface ForcedPasswordResetProps {
  password: string;
}

export interface VerifyAttributeProps {
  userAttribute: "email" | "phone_number";
  totp: string;
}

export interface UpdateAttributesProps {
  userAttributes: UserAttributes;
}

type Stage = "login" | "register" | "forgotPassword";

type State = {
  isAuthenticated: boolean;
  allowRegistration: boolean;
  setStage: (stage: Stage) => void;
  stage: Stage;
  userGroups: string[];
  userAttributes: UserAttributes | null;
  register: (props: RegisterProps) => ReturnType<typeof signUp>;
  confirmRegistration: (props: ConfirmRegistrationProps) => Promise<void>;
  forgotPassword: (props: ForgotPasswordProps) => Promise<void>;
  confirmForgotPassword: (props: ConfirmForgotPasswordProps) => Promise<void>;
  forcedPasswordReset: (props: ForcedPasswordResetProps) => Promise<SignInResult>;
  confirmMFA: (props: ConfirmMFAProps) => Promise<SignInResult>;
  verifyAttribute: (props: VerifyAttributeProps) => Promise<void>;
  updateAttributes: (props: UpdateAttributesProps) => Promise<void>;
  sendAccountConfirmationCode: (email: string) => Promise<void>;
  sendEmailConfirmationCode: () => Promise<void>;
  login: (props: LoginProps) => Promise<SignInResult>;
  loginWithPasskey: (email: string) => Promise<SignInResult>;
  logout: () => void;
  language: Language;
};

export const AuthContext = createContext<State | undefined>(undefined);

export type Language = "en" | "de";

interface AuthProviderProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration: boolean;
  language: Language;
  children: ReactNode;
}

const register = ({ email, password }: RegisterProps) => {
  return signUp(email, password);
};

const handleConfirmRegistration = async ({ email, totp }: ConfirmRegistrationProps) => {
  await confirmRegistration(email, totp);
};

const forgotPassword = ({ email }: ForgotPasswordProps) => {
  return passwordReset(email);
};

const handleConfirmForgotPassword = async ({
  email,
  totp,
  password,
}: ConfirmForgotPasswordProps) => {
  await confirmPasswordReset(email, totp, password);
};

const login = async ({ email, password }: LoginProps) => {
  const result = await signIn(email, password);
  document.dispatchEvent(new Event("mantine-cognito-session"));
  return result;
};

const loginWithPasskey = async (email: string) => {
  const result = await signInWithPasskey(email);
  document.dispatchEvent(new Event("mantine-cognito-session"));
  return result;
};

const confirmMFA = async ({ code }: ConfirmMFAProps) => {
  const result = await confirmSignInWithCode(code);
  document.dispatchEvent(new Event("mantine-cognito-session"));
  return result;
};

const logout = async () => {
  await signOut();
  document.dispatchEvent(new Event("mantine-cognito-session"));
};

const forcedPasswordReset = async ({ password }: ForcedPasswordResetProps) => {
  const result = await confirmSignInWithNewPassword(password);
  document.dispatchEvent(new Event("mantine-cognito-session"));
  return result;
};

const handleVerifyAttribute = async ({
  userAttribute,
  totp,
}: VerifyAttributeProps) => {
  await verifyUserAttribute(userAttribute, totp);
  document.dispatchEvent(new Event("mantine-cognito-session"));
};

const handleSendAccountConfirmationCode = (email: string) => {
  return resendAccountConfirmationCode(email);
};

const handleSendEmailConfirmationCode = () => {
  return resendEmailConfirmationCode();
};

const handleUpdateAttributes = async ({ userAttributes }: UpdateAttributesProps) => {
  await updateUserAttributes(userAttributes);
  document.dispatchEvent(new Event("mantine-cognito-session"));
};

export const AuthProvider = ({
  children,
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration,
  language,
}: AuthProviderProps) => {
  initUserPool({ cognitoUserPoolId, cognitoClientId });

  const [stage, setStage] = usePersistentState<State["stage"]>("login", "login-state");
  const [userAttributes, setUserAttributes] = usePersistentState<State["userAttributes"]>(null, "user-attr-state");
  const [userGroups, setUserGroups] = usePersistentState<State["userGroups"]>([], "user-group-state");

  const refreshSession = async () => {
    try {
      const valid = await isSessionValid();
      if (valid) {
        const [attrs, groups] = await Promise.all([getUserAttributes(), getUserGroups()]);
        setUserAttributes(attrs);
        setUserGroups(groups);
      } else {
        setUserAttributes(null);
        setUserGroups([]);
      }
    } catch {
      setUserAttributes(null);
      setUserGroups([]);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    document.addEventListener("mantine-cognito-session", refreshSession, false);
    return () => document.removeEventListener("mantine-cognito-session", refreshSession, false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: userAttributes !== null,
        allowRegistration,
        stage,
        setStage,
        userAttributes,
        userGroups,
        register,
        login,
        loginWithPasskey,
        logout,
        confirmMFA,
        confirmRegistration: handleConfirmRegistration,
        forgotPassword,
        confirmForgotPassword: handleConfirmForgotPassword,
        forcedPasswordReset,
        verifyAttribute: handleVerifyAttribute,
        sendAccountConfirmationCode: handleSendAccountConfirmationCode,
        sendEmailConfirmationCode: handleSendEmailConfirmationCode,
        updateAttributes: handleUpdateAttributes,
        language,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
