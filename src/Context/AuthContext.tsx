import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  ISignUpResult,
} from "amazon-cognito-identity-js";

import { createContext, ReactNode, useEffect } from "react";

import {
  confirmPasswordReset,
  confirmSignUp,
  getSession,
  getUserAttributes,
  getUserGroups,
  initUserPool,
  newPasswordChallenge,
  passwordReset,
  resendAccountConfirmationCode,
  resendEmailConfirmationCode,
  signIn,
  signOut,
  signUp,
  updateUserAttributes,
  UserAttributes,
  verifyUserAttribute,
} from "./cognito";
import usePersistentState from "../Hooks/usePersitentState.ts";

declare global {
  interface Window {
    MantineCognitoUserPool: CognitoUserPool;
  }
}

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
  totp?: string;
}

export interface ForcedPasswordResetProps {
  cognitoUser: CognitoUser;
  userAttributes: UserAttributes;
  password: string;
}

export interface VerifyAttributeProps {
  userAttribute: string;
  totp: string;
}

export interface UpdateAttributesProps {
  userAttributes: UserAttributes;
}

type Stage = "login" | "register" | "forgotPassword";

type State = {
  allowRegistration: boolean;
  setStage: (stage: Stage) => void;
  stage: Stage;
  user: CognitoUser | null;
  userGroups: string[];
  userAttributes: UserAttributes | null;
  isSuperAdmin: boolean;
  register: (props: RegisterProps) => Promise<ISignUpResult>;
  confirmRegistration: (props: ConfirmRegistrationProps) => Promise<void>;
  forgotPassword: (props: ForgotPasswordProps) => Promise<void>;
  confirmForgotPassword: (props: ConfirmForgotPasswordProps) => Promise<string>;
  forcedPasswordReset: (
    props: ForcedPasswordResetProps,
  ) => Promise<CognitoUserSession>;
  verifyAttribute: (props: VerifyAttributeProps) => Promise<string>;
  updateAttributes: (props: UpdateAttributesProps) => Promise<string>;
  sendAccountConfirmationCode: () => Promise<string>;
  sendEmailConfirmationCode: () => Promise<string>;
  login: (props: LoginProps) => Promise<CognitoUser>;
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

const confirmRegistration = ({ email, totp }: ConfirmRegistrationProps) => {
  return confirmSignUp(email, totp);
};

const forgotPassword = ({ email }: ForgotPasswordProps) => {
  return passwordReset(email);
};

const confirmForgotPassword = ({
  email,
  totp,
  password,
}: ConfirmForgotPasswordProps) => {
  return confirmPasswordReset(email, totp, password);
};

const login = async ({ email, password, totp }: LoginProps) => {
  const cognitoUser = await signIn(email, password, totp);

  document.dispatchEvent(new Event("mantine-cognito-session"));

  return cognitoUser;
};

const logout = async () => {
  signOut();

  document.dispatchEvent(new Event("mantine-cognito-session"));
};

const forcedPasswordReset = async ({
  cognitoUser,
  userAttributes,
  password,
}: ForcedPasswordResetProps) => {
  const res = await newPasswordChallenge(cognitoUser, userAttributes, password);

  document.dispatchEvent(new Event("mantine-cognito-session"));

  return res;
};

const verifyAttribute = async ({
  userAttribute,
  totp,
}: VerifyAttributeProps) => {
  const res = await verifyUserAttribute(userAttribute, totp);
  document.dispatchEvent(new Event("mantine-cognito-session"));

  return res;
};

const sendAccountConfirmationCode = () => {
  return resendAccountConfirmationCode();
};

const sendEmailConfirmationCode = () => {
  return resendEmailConfirmationCode();
};

const updateAttributes = async ({ userAttributes }: UpdateAttributesProps) => {
  const res = await updateUserAttributes(userAttributes);
  document.dispatchEvent(new Event("mantine-cognito-session"));

  return res;
};

export const AuthProvider = ({
  children,
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration,
    language
}: AuthProviderProps) => {
  const [stage, setStage] = usePersistentState<State["stage"]>("login", "login-state");
  const [user, setUser] = usePersistentState<State["user"]>(null, "user-state");
  const [userAttributes, setUserAttributes] = usePersistentState<State["userAttributes"]>(null, "user-attr-state");
  const [userGroups, setUserGroups] = usePersistentState<State["userGroups"]>([], "user-group-state");
  const [isSuperAdmin, setIsSuperAdmin] = usePersistentState<State["isSuperAdmin"]>(false, "super-admin-state");

  initUserPool({ cognitoUserPoolId, cognitoClientId });

  async function checkSession() {
    getSession()
      .then(async ({ authenticatedUser, session }) => {
        if (session.isValid()) {
          setUser(authenticatedUser);
          setUserAttributes(await getUserAttributes());
          setUserGroups(await getUserGroups());
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }

  useEffect(() => {
    checkSession();
    document.addEventListener(
      "mantine-cognito-session",
      () => checkSession(),
      false,
    );

    // TODO: Remove event listener
    //return () => document.removeEventListener("mantine-cognito-session", ev, false);
  }, []);

  useEffect(() => {
    setIsSuperAdmin(userGroups.includes("SUPERADMIN") || userGroups.includes("SUPER_ADMIN"));
  }, [userGroups]);

  return (
    <AuthContext.Provider
      value={{
        allowRegistration,
        stage,
        setStage,
        user,
        userAttributes,
        userGroups,
        isSuperAdmin,
        register,
        login,
        logout,
        confirmRegistration,
        forgotPassword,
        confirmForgotPassword,
        forcedPasswordReset,
        verifyAttribute,
        sendAccountConfirmationCode,
        sendEmailConfirmationCode,
        updateAttributes,
        language
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
