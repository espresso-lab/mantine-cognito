export function convertUserAttributeValue(
  userAttributeValue: string | boolean,
) {
  if (typeof userAttributeValue === "boolean") {
    return String(userAttributeValue);
  } else {
    switch (userAttributeValue) {
      case "true":
      case "false":
        return Boolean(userAttributeValue);
      default:
        return userAttributeValue;
    }
  }
}
