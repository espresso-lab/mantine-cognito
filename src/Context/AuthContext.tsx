import {
  CognitoUser, CognitoUserPool,
  CognitoUserSession,
  ISignUpResult,
} from "amazon-cognito-identity-js";
import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  confirmPasswordReset,
  confirmSignUp,
  getSession,
  getUserAttributes,
  getUserGroups, initUserPool,
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

declare global {
  interface Window {
    MantineCognito: {
      cognitoUserPoolId: string,
      cognitoClientId: string
    },
    MantineCognitoUserPool: CognitoUserPool
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
  remember?: boolean;
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

type Mode = "login" | "register" | "forgotPassword";

type State = {
  allowRegistration: boolean;
  setMode: (mode: Mode) => void;
  mode: Mode;
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
};

export const AuthContext = createContext<State | undefined>(undefined);

interface AuthProviderProps {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  allowRegistration: boolean;
  children: ReactNode;
}

export const AuthProvider = ({
  children,
  cognitoUserPoolId,
  cognitoClientId,
  allowRegistration,
}: AuthProviderProps) => {
  const [mode, setMode] = useState<State["mode"]>("login");
  const [user, setUser] = useState<State["user"]>(null);
  const [userAttributes, setUserAttributes] =
    useState<State["userAttributes"]>(null);
  const [userGroups, setUserGroups] = useState<State["userGroups"]>([]);
  const [isSuperAdmin, setIsSuperAdmin] =
    useState<State["isSuperAdmin"]>(false);

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
  }, []);

  useEffect(() => {
    setIsSuperAdmin(userGroups.includes("SUPERADMIN"));
  }, [userGroups]);

  const register = useCallback(({ email, password }: RegisterProps) => {
    return signUp(email, password);
  }, []);

  const confirmRegistration = useCallback(
    ({ email, totp }: ConfirmRegistrationProps) => {
      return confirmSignUp(email, totp);
    },
    [],
  );

  const forgotPassword = useCallback(({ email }: ForgotPasswordProps) => {
    return passwordReset(email);
  }, []);

  const confirmForgotPassword = useCallback(
    ({ email, totp, password }: ConfirmForgotPasswordProps) => {
      return confirmPasswordReset(email, totp, password);
    },
    [],
  );

  const login = useCallback(
    async ({ email, password, remember, totp }: LoginProps) => {
      const cognitoUser = await signIn(
        email,
        password,
        remember,
        totp,
      );
      await checkSession();
      return cognitoUser;
    },
    [],
  );

  const logout = useCallback(async () => {
    signOut();
    await checkSession();
    window.location.reload();
  }, []);

  const forcedPasswordReset = useCallback(
    async ({
      cognitoUser,
      userAttributes,
      password,
    }: ForcedPasswordResetProps) => {
      const res = await newPasswordChallenge(
        cognitoUser,
        userAttributes,
        password,
      );
      await checkSession();
      return res;
    },
    [],
  );

  const verifyAttribute = useCallback(
    async ({ userAttribute, totp }: VerifyAttributeProps) => {
      const res = await verifyUserAttribute(userAttribute, totp);
      await checkSession();
      return res;
    },
    [],
  );

  const sendAccountConfirmationCode = useCallback(() => {
    return resendAccountConfirmationCode();
  }, []);

  const sendEmailConfirmationCode = useCallback(() => {
    return resendEmailConfirmationCode();
  }, []);

  const updateAttributes = useCallback(
    async ({ userAttributes }: UpdateAttributesProps) => {
      const res = await updateUserAttributes(userAttributes);
      await checkSession();
      return res;
    },
    [],
  );

  const values = useMemo(
    () => ({
      allowRegistration,
      mode,
      setMode,
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
    }),
    [
      allowRegistration,
      mode,
      setMode,
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
    ],
  );

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};
