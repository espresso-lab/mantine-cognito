import { SignInResult, SignOutScope, VerifiableAttribute } from "./cognito";
import { createContext, ReactNode, useEffect, useState } from "react";
import { Hub } from "aws-amplify/utils";
import {
  confirmPasswordReset,
  confirmRegistration as cognitoConfirmRegistration,
  confirmSignInWithCode,
  confirmSignInWithNewPassword,
  getUserAttributes,
  getUserGroups,
  initUserPool,
  isSessionValid,
  passwordReset,
  refreshSession,
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

export interface LogoutProps {
  scope?: SignOutScope;
}

export interface VerifyAttributeProps {
  userAttribute: VerifiableAttribute;
  totp: string;
}

export interface UpdateAttributesProps {
  userAttributes: UserAttributes;
}

type Stage = "login" | "register" | "forgotPassword";

type State = {
  isAuthenticated: boolean;
  initializing: boolean;
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
  updateAttributes: (props: UpdateAttributesProps) => Promise<VerifiableAttribute[]>;
  sendAccountConfirmationCode: (email: string) => Promise<void>;
  sendEmailConfirmationCode: () => Promise<void>;
  login: (props: LoginProps) => Promise<SignInResult>;
  loginWithPasskey: (email: string) => Promise<SignInResult>;
  logout: (props?: LogoutProps) => Promise<void>;
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

/**
 * Errors after which the session is gone for good. Anything else (network, throttling) leaves the
 * tokens in place, so the user stays signed in instead of being thrown out by a flaky connection.
 */
const SIGNED_OUT_ERRORS = new Set([
  "NotAuthorizedException",
  "PasswordResetRequiredException",
  "TokenRevokedException",
  "UserNotConfirmedException",
  "UserNotFoundException",
  "UserUnAuthenticatedException",
]);

async function loadSession(
  setUserAttributes: (v: UserAttributes | null) => void,
  setUserGroups: (v: string[]) => void,
) {
  const signOut = () => {
    setUserAttributes(null);
    setUserGroups([]);
  };
  try {
    if (!(await isSessionValid())) {
      signOut();
      return;
    }
    const [attrs, groups] = await Promise.all([getUserAttributes(), getUserGroups()]);
    setUserAttributes(attrs);
    setUserGroups(groups);
  } catch (error) {
    if (error instanceof Error && SIGNED_OUT_ERRORS.has(error.name)) {
      signOut();
    }
  }
}

export const AuthProvider = ({
  children,
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration,
  language,
}: AuthProviderProps) => {
  initUserPool({ cognitoUserPoolId, cognitoClientId });

  const [stage, setStage] = useState<Stage>("login");
  const [initializing, setInitializing] = useState(true);
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.removeItem("use_persistent_storage_user-attr-state");
      localStorage.removeItem("use_persistent_storage_user-group-state");
    } catch {
      void 0;
    }
    loadSession(setUserAttributes, setUserGroups).finally(() => setInitializing(false));
  }, []);

  useEffect(
    () =>
      Hub.listen("auth", ({ payload }) => {
        switch (payload.event) {
          case "signedIn":
          case "signedOut":
          case "tokenRefresh_failure":
            void loadSession(setUserAttributes, setUserGroups);
        }
      }),
    [],
  );

  const login = async ({ email, password }: LoginProps) => {
    const result = await signIn(email, password);
    await loadSession(setUserAttributes, setUserGroups);
    return result;
  };

  const loginWithPasskey = async (email: string) => {
    const result = await signInWithPasskey(email);
    await loadSession(setUserAttributes, setUserGroups);
    return result;
  };

  const confirmMFA = async ({ code }: ConfirmMFAProps) => {
    const result = await confirmSignInWithCode(code);
    await loadSession(setUserAttributes, setUserGroups);
    return result;
  };

  const logout = async ({ scope }: LogoutProps = {}) => {
    await signOut(scope);
    setUserAttributes(null);
    setUserGroups([]);
  };

  const forcedPasswordReset = async ({ password }: ForcedPasswordResetProps) => {
    const result = await confirmSignInWithNewPassword(password);
    await loadSession(setUserAttributes, setUserGroups);
    return result;
  };

  const verifyAttribute = async ({ userAttribute, totp }: VerifyAttributeProps) => {
    await verifyUserAttribute(userAttribute, totp);
    await refreshSession();
    await loadSession(setUserAttributes, setUserGroups);
  };

  const updateAttributes = async ({ userAttributes: attrs }: UpdateAttributesProps) => {
    const pending = await updateUserAttributes(attrs);
    await refreshSession();
    await loadSession(setUserAttributes, setUserGroups);
    return pending;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: userAttributes !== null,
        initializing,
        allowRegistration,
        stage,
        setStage,
        userAttributes,
        userGroups,
        register: ({ email, password }) => signUp(email, password),
        confirmRegistration: ({ email, totp }) => cognitoConfirmRegistration(email, totp),
        forgotPassword: ({ email }) => passwordReset(email),
        confirmForgotPassword: ({ email, totp, password }) => confirmPasswordReset(email, totp, password),
        sendAccountConfirmationCode: resendAccountConfirmationCode,
        sendEmailConfirmationCode: resendEmailConfirmationCode,
        login,
        loginWithPasskey,
        logout,
        confirmMFA,
        forcedPasswordReset,
        verifyAttribute,
        updateAttributes,
        language,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
