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

function getUserPool(poolProps: UserPoolAttributes, remember: boolean = false) {
  return new CognitoUserPool({
    UserPoolId: poolProps.cognitoUserPoolId,
    ClientId: poolProps.cognitoClientId,
    Storage: remember
      ? new CookieStorage({ domain: `.${window.location.hostname}` })
      : window.sessionStorage,
  });
}

/**
 * get cognito user
 */

function getCognitoUser(
  poolProps: UserPoolAttributes,
  email: string,
  remember: boolean = false,
) {
  return new CognitoUser({
    Username: email,
    Pool: getUserPool(poolProps, remember),
    Storage: remember
      ? new CookieStorage({ domain: `.${window.location.hostname}` })
      : window.sessionStorage,
  });
}

/**
 * get current user
 */

export function getCurrentUser(poolProps: UserPoolAttributes) {
  const sessionUser = getUserPool(poolProps).getCurrentUser();
  return sessionUser !== null
    ? sessionUser
    : getUserPool(poolProps, true).getCurrentUser();
}

/**
 * sign up
 */

export function signUp(
  poolProps: UserPoolAttributes,
  email: string,
  password: string,
) {
  return new Promise<ISignUpResult>((resolve, reject) =>
    getUserPool(poolProps).signUp(
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
  poolProps: UserPoolAttributes,
  email: string,
  password: string,
  remember: boolean = false,
  totp?: string,
) {
  return new Promise<CognitoUser>((resolve, reject) => {
    signOut(poolProps);
    const cognitoUser = getCognitoUser(poolProps, email, remember);
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

export function signOut(poolProps: UserPoolAttributes) {
  const cognitoUser = getCurrentUser(poolProps);
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

export function getSession(poolProps: UserPoolAttributes) {
  return new Promise<{
    session: CognitoUserSession;
    authenticatedUser: CognitoUser;
  }>((resolve, reject) => {
    const cognitoUser = getCurrentUser(poolProps);
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
  poolProps: UserPoolAttributes,
  callback: AuthenticatedCallCallback<Type>,
) {
  return new Promise<Type>(async (resolve, reject) => {
    const { authenticatedUser } = await getSession(poolProps);
    if (!authenticatedUser) {
      return reject(new Error("Unable to get current user."));
    }
    callback(authenticatedUser, resolve, reject);
  });
}

/**
 * get session valid
 */

export async function isSessionValid(poolProps: UserPoolAttributes) {
  const { session } = await getSession(poolProps);
  return session?.isValid();
}

/**
 * get access token
 */

export async function getAccessToken(poolProps: UserPoolAttributes) {
  const { session } = await getSession(poolProps);
  return session?.getAccessToken().getJwtToken();
}

/**
 * get id token
 */

export async function getIdToken(poolProps: UserPoolAttributes) {
  const { session } = await getSession(poolProps);
  return session?.getIdToken().getJwtToken();
}

/**
 * get user attributes
 */

export function getUserAttributes(poolProps: UserPoolAttributes) {
  return authenticatedCall<UserAttributes>(
    poolProps,
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
  poolProps: UserPoolAttributes,
  email: string,
  totp: string,
) {
  return new Promise<void>((resolve, reject) => {
    const cognitoUser = getCognitoUser(poolProps, email);
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

export function resendAccountConfirmationCode(poolProps: UserPoolAttributes) {
  return new Promise<string>((resolve, reject) => {
    const cognitoUser = getCurrentUser(poolProps);
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

export function resendEmailConfirmationCode(poolProps: UserPoolAttributes) {
  return authenticatedCall<string>(
    poolProps,
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
  poolProps: UserPoolAttributes,
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
    poolProps,
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

export function passwordReset(poolProps: UserPoolAttributes, email: string) {
  return new Promise<void>((resolve, reject) => {
    const cognitoUser = getCognitoUser(poolProps, email);
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
  poolProps: UserPoolAttributes,
  email: string,
  totp: string,
  password: string,
) {
  return new Promise<string>((resolve, reject) => {
    const cognitoUser = getCognitoUser(poolProps, email);
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
  poolProps: UserPoolAttributes,
  attribute: string,
  totp: string,
) {
  return authenticatedCall<string>(
    poolProps,
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

export function associateSoftwareToken(poolProps: UserPoolAttributes) {
  return authenticatedCall<string>(
    poolProps,
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

export function getUserData(poolProps: UserPoolAttributes) {
  return authenticatedCall<UserData | undefined>(
    poolProps,
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
  poolProps: UserPoolAttributes,
  code: string,
  deviceName: string,
) {
  return authenticatedCall(poolProps, (cognitoUser, resolve, reject) => {
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

export function enableMFA(poolProps: UserPoolAttributes) {
  return setMFA(poolProps, true);
}

/**
 * disable mfa
 */

export function disableMFA(poolProps: UserPoolAttributes) {
  return setMFA(poolProps, false);
}

/**
 * set mfa
 */

export function setMFA(poolProps: UserPoolAttributes, enabled: boolean) {
  return authenticatedCall<string | undefined>(
    poolProps,
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

export async function getUserGroups(poolProps: UserPoolAttributes) {
  const { session } = await getSession(poolProps);
  return session?.getAccessToken()?.decodePayload()?.["cognito:groups"] ?? [];
}
