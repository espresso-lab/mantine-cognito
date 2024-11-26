import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  ISignUpResult,
} from "amazon-cognito-identity-js";

import {createContext, ReactNode, useEffect} from "react";

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
  getUser:  () => Promise<CognitoUser | null>;
  allowRegistration: boolean;
  setStage: (stage: Stage) => void;
  stage: Stage;
  userGroups: string[];
  userAttributes: UserAttributes | null;
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
  password,
}: ForcedPasswordResetProps) => {
  const res = await newPasswordChallenge(cognitoUser, password);

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
  language,
}: AuthProviderProps) => {
  initUserPool({ cognitoUserPoolId, cognitoClientId });

  const [stage, setStage] = usePersistentState<State["stage"]>("login", "login-state");
  const [userAttributes, setUserAttributes] = usePersistentState<State["userAttributes"]>(null, "user-attr-state");
  const [userGroups, setUserGroups] = usePersistentState<State["userGroups"]>([], "user-group-state");

  const getUser = async () => {
    return getSession()
        .then(async ({ authenticatedUser }) => {
          return authenticatedUser;
        })
        .catch(() => {
          return null;
        });
  };

  useEffect(() => {
    getSession()
        .then(async () => {
          // setAuthenticatedUser(authenticatedUser);
              getUserAttributes().then(data => setUserAttributes(data));
              getUserGroups().then(data => setUserGroups(data));
        })
        .catch(() => {
          setUserAttributes(null);
          setUserGroups([]);
        });
  }, []);

  // Handling event listener
  useEffect(() => {
    const evFunction = () => getSession()
        .then(async () => {
          getUserAttributes().then(data => setUserAttributes(data));
          getUserGroups().then(data => setUserGroups(data));
        })
        .catch(() => {
          setUserAttributes(null);
          setUserGroups([]);
        });

    document.addEventListener("mantine-cognito-session", evFunction, false);

    return () => document.removeEventListener("mantine-cognito-session", evFunction, false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        allowRegistration,
        stage,
        setStage,
        getUser,
        userAttributes,
        userGroups,
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
        language,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
