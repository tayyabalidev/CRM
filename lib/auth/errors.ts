export function toUserFacingAuthError(message: string) {
  const value = message.toLowerCase()

  if (value.includes("invalid login credentials")) {
    return "Email or password is incorrect."
  }

  if (value.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for a link."
  }

  if (value.includes("user already registered") || value.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead."
  }

  if (value.includes("password")) {
    return "Use a stronger password with at least 8 characters."
  }

  if (value.includes("rate limit") || value.includes("too many")) {
    return "Too many attempts. Wait a moment and try again."
  }

  return "Something went wrong. Try again."
}
