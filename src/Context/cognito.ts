import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
  CookieStorage,
  ISignUpResult,
  UserData,
} from "amazon-cognito-identity-js";
import { convertUserAttributeValue } from "./utils";

export type UserAttributes = Record<string, string | boolean>;

export type AuthenticatedCallCallback<Type> = (
  authenticatedUser: CognitoUser,
  resolve: (value: Type | PromiseLike<Type>) => void,
  reject: (error: Error | null) => void,
) => void;

export interface FirstLogin {
  cognitoUser: CognitoUser;
  userAttributes: UserAttributes;
}

export class LoginMFAException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginMFAException";
  }
}

export class NewPasswordRequiredException extends Error {
  firstLogin: FirstLogin;
  constructor(message: string, firstLogin: FirstLogin) {
    super(message);
    this.name = "NewPasswordRequiredException";
    this.firstLogin = firstLogin;
  }
}

/**
 * get cognito user pool
 */

interface UserPoolAttributes {
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export function initUserPool(poolProps: UserPoolAttributes, remember: boolean = false) {
  window.MantineCognitoUserPool = new CognitoUserPool({
    UserPoolId: poolProps.cognitoUserPoolId,
    ClientId: poolProps.cognitoClientId,
    Storage: remember
        ? new CookieStorage({ domain: `.${window.location.hostname}` })
        : window.sessionStorage,
  });

  return window.MantineCognitoUserPool;
}

function getUserPool() {
  return window.MantineCognitoUserPool;
}

/**
 * get cognito user
 */

function getCognitoUser(
  email: string,
  remember: boolean = false,
) {
  return new CognitoUser({
    Username: email,
    Pool: getUserPool(),
    Storage: remember
      ? new CookieStorage({ domain: `.${window.location.hostname}` })
      : window.sessionStorage,
  });
}

/**
 * get current user
 */

export function getCurrentUser() {
  const sessionUser = getUserPool().getCurrentUser();
  return sessionUser !== null
    ? sessionUser
    : getUserPool().getCurrentUser();
}

/**
 * sign up
 */

export function signUp(
  email: string,
  password: string,
) {
  return new Promise<ISignUpResult>((resolve, reject) =>
    getUserPool().signUp(
      email,
      password,
      [
        new CognitoUserAttribute({
          Name: "email",
          Value: email,
        }),
      ],
      [],
      (error, data) => {
        if (error) {
          reject(error);
        } else if (data) {
          resolve(data);
        } else {
          reject(new Error("Did not get a user from signUp."));
        }
      },
    ),
  );
}

/**
 * sign in
 */

export function signIn(
  email: string,
  password: string,
  remember: boolean = false,
  totp?: string,
) {
  return new Promise<CognitoUser>((resolve, reject) => {
    signOut();
    const cognitoUser = getCognitoUser(email, remember);
    cognitoUser.authenticateUser(
      new AuthenticationDetails({
        Username: email,
        Password: password,
      }),
      {
        onSuccess: () => {
          resolve(cognitoUser);
        },
        onFailure: (error) => {
          reject(error);
        },
        newPasswordRequired: (userAttributes) => {
          reject(
            new NewPasswordRequiredException("A new password must be set.", {
              cognitoUser,
              userAttributes,
            }),
          );
        },
        totpRequired: () => {
          if (totp !== undefined) {
            cognitoUser.sendMFACode(
              totp,
              {
                onSuccess: () => {
                  resolve(cognitoUser);
                },
                onFailure: (error) => {
                  reject(error);
                },
              },
              "SOFTWARE_TOKEN_MFA",
            );
          } else {
            return reject(new LoginMFAException("No MFA token provided."));
          }
        },
      },
    );
  });
}

/**
 * sign out
 */

export function signOut() {
  const cognitoUser = getCurrentUser();
  cognitoUser?.globalSignOut({
    onSuccess: () => {},
    onFailure: () => {},
  });
  // twice, because of session and cookie
  cognitoUser?.signOut();
  cognitoUser?.signOut();
}

/**
 * get session
 */

export function getSession() {
  return new Promise<{
    session: CognitoUserSession;
    authenticatedUser: CognitoUser;
  }>((resolve, reject) => {
    const cognitoUser = getCurrentUser();
    if (cognitoUser === null) reject(null);
    cognitoUser?.getSession(
      (error: Error, session: CognitoUserSession | null) => {
        if (error !== null || session === null) {
          return reject(null);
        }
        resolve({ session, authenticatedUser: cognitoUser });
      },
    );
  });
}

/**
 * authenticated call
 */

export function authenticatedCall<Type>(
  callback: AuthenticatedCallCallback<Type>,
) {
  return new Promise<Type>((resolve, reject) => {
    getSession().then(({ authenticatedUser }) => {
      if (!authenticatedUser) {
        return reject(new Error("Unable to get current user."));
      }
      callback(authenticatedUser, resolve, reject);
    });
  });
}

/**
 * get session valid
 */

export async function isSessionValid() {
  const { session } = await getSession();
  return session?.isValid();
}

/**
 * get access token
 */

export async function getAccessToken() {
  const { session } = await getSession();
  return session?.getAccessToken().getJwtToken();
}

/**
 * get id token
 */

export async function getIdToken() {
  const { session } = await getSession();
  return session?.getIdToken().getJwtToken();
}

/**
 * get user attributes
 */

export function getUserAttributes() {
  return authenticatedCall<UserAttributes>(
    (authenticatedUser, resolve, reject) => {
      authenticatedUser.getUserAttributes((error, attributes) => {
        if (error) return reject(error);
        resolve(
          (attributes
            ? attributes.reduce(
                (acc, cur) => ({
                  ...acc,
                  [cur.getName()]: convertUserAttributeValue(cur.getValue()),
                }),
                {},
              )
            : {}) as UserAttributes,
        );
      });
    },
  );
}

/**
 * confirm user registration
 */

export function confirmSignUp(
  email: string,
  totp: string,
) {
  return new Promise<void>((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser?.confirmRegistration(totp, true, (error, data) => {
      if (error) {
        reject(error);
      } else if (data) {
        resolve(data);
      } else {
        reject(new Error("Error confirming signup."));
      }
    });
  });
}

/**
 * new account confirmation code
 */

export function resendAccountConfirmationCode() {
  return new Promise<string>((resolve, reject) => {
    const cognitoUser = getCurrentUser();
    cognitoUser?.resendConfirmationCode((error, data) => {
      if (error) {
        reject(error);
      }
      resolve(data);
    });
  });
}

/**
 * resend email confirmation code
 */

export function resendEmailConfirmationCode() {
  return authenticatedCall<string>(
    (cognitoUser, resolve, reject) => {
      cognitoUser.getAttributeVerificationCode("email", {
        onSuccess: (data) => {
          resolve(data);
        },
        onFailure: (error) => {
          reject(error);
        },
      });
    },
  );
}

/**
 * update user attribute
 */

export function updateUserAttributes(
  attributes: UserAttributes,
) {
  const attributeList = Object.keys(attributes).map(
    (attribute) =>
      new CognitoUserAttribute({
        Name: attribute,
        Value: String(attributes[attribute]),
      }),
  );
  return authenticatedCall<string>(
    (cognitoUser, resolve, reject) => {
      cognitoUser.updateAttributes(attributeList, (error, result) => {
        if (error != null) return reject(error);
        resolve(result ?? "User updated.");
      });
    },
  );
}

/**
 * password reset
 */

export function passwordReset(email: string) {
  return new Promise<void>((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser?.forgotPassword({
      onSuccess: (data) => {
        resolve(data);
      },
      onFailure: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * confirm password reset
 */

export function confirmPasswordReset(
  email: string,
  totp: string,
  password: string,
) {
  return new Promise<string>((resolve, reject) => {
    const cognitoUser = getCognitoUser( email);
    cognitoUser.confirmPassword(totp, password, {
      onSuccess: (success) => {
        resolve(success);
      },
      onFailure: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * new password challenge
 */

export function newPasswordChallenge(
  cognitoUser: CognitoUser,
  userAttributes: UserAttributes,
  password: string,
) {
  return new Promise<CognitoUserSession>((resolve, reject) => {
    delete userAttributes.email;
    delete userAttributes.email_verified;
    cognitoUser.completeNewPasswordChallenge(password, userAttributes, {
      onSuccess: (data) => {
        resolve(data);
      },
      onFailure: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * verify user attribute
 */

export function verifyUserAttribute(
  attribute: string,
  totp: string,
) {
  return authenticatedCall<string>(
    (cognitoUser, resolve, reject) => {
      cognitoUser.verifyAttribute(attribute, totp, {
        onFailure(error) {
          reject(error);
        },
        onSuccess(success) {
          resolve(success);
        },
      });
    },
  );
}

/**
 * associate software token
 */

export function associateSoftwareToken() {
  return authenticatedCall<string>(
    (cognitoUser, resolve, reject) => {
      cognitoUser.associateSoftwareToken({
        associateSecretCode: (secretCode) => {
          resolve(secretCode);
        },
        onFailure: (error) => {
          reject(error);
        },
      });
    },
  );
}

/**
 * get user data
 */

export function getUserData() {
  return authenticatedCall<UserData | undefined>(
    (cognitoUser, resolve, reject) => {
      cognitoUser.getUserData((err, data) => {
        if (err != null) return reject(err);
        resolve(data);
      });
    },
  );
}

/**
 * verify software token
 */

export function verifySoftwareToken(
  code: string,
  deviceName: string,
) {
  return authenticatedCall((cognitoUser, resolve, reject) => {
    cognitoUser.verifySoftwareToken(code, deviceName, {
      onSuccess: () => {
        resolve(undefined);
      },
      onFailure: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * enable mfa
 */

export function enableMFA() {
  return setMFA(true);
}

/**
 * disable mfa
 */

export function disableMFA() {
  return setMFA(false);
}

/**
 * set mfa
 */

export function setMFA(enabled: boolean) {
  return authenticatedCall<string | undefined>(
    (cognitoUser, resolve, reject) => {
      const totpMfaSettings = {
        PreferredMfa: enabled,
        Enabled: enabled,
      };

      cognitoUser.setUserMfaPreference(
        null,
        totpMfaSettings,
        (error, result) => {
          if (error != null) return reject(error);
          type CognitoUserEnhanced = CognitoUser & {
            clearCachedUserData: () => void;
          };
          const user = cognitoUser as CognitoUserEnhanced;
          user.clearCachedUserData();
          resolve(result);
        },
      );
    },
  );
}

/**
 * get user groups
 */

export async function getUserGroups() {
  const { session } = await getSession();
  return session?.getAccessToken()?.decodePayload()?.["cognito:groups"] ?? [];
}
