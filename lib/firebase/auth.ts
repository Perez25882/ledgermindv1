import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updatePassword,
  type User,
  type UserCredential,
} from "firebase/auth"
import { auth } from "./firebase"

const googleProvider = new GoogleAuthProvider()

/**
 * Sign in with Google popup. Returns UserCredential on success.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider)
}

/**
 * Sign in with email and password. Returns UserCredential on success.
 */
export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

/**
 * Create a new user with email and password. Returns UserCredential on success.
 */
export async function signUp(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password)
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

/**
 * Get the ID token for the currently signed-in user.
 * Returns null if no user is signed in.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Get the current Firebase auth user. Returns null if not signed in.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser
}

/**
 * Update the password of the currently signed-in user.
 */
export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error("No user is currently signed in")
  return updatePassword(user, newPassword)
}

/**
 * Set the session cookie by calling the session API route.
 */
export async function setSessionCookie(idToken: string): Promise<boolean> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  })
  return response.ok
}

/**
 * Clear the session cookie by calling the session API route.
 */
export async function clearSessionCookie(): Promise<boolean> {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
  })
  return response.ok
}
