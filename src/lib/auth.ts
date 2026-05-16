import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { readPrivateJson, writePrivateJson } from "@/lib/private-json-store";

const scryptAsync = promisify(crypto.scrypt);
const AUTH_KEY = "file-room/private/auth.json";
const SESSION_COOKIE = "filevault_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type UserRole = "owner" | "member";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
};

export type Invite = {
  id: string;
  email: string;
  tokenHash: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type AuthState = {
  users: AuthUser[];
  invites: Invite[];
};

type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
};

const emptyAuthState: AuthState = {
  users: [],
  invites: [],
};

export function configuredOwnerEmail() {
  return (process.env.OWNER_EMAIL ?? "samac1234qwerty@gmail.com").trim().toLowerCase();
}

export async function readAuthState() {
  const state = await readPrivateJson<AuthState>(AUTH_KEY, emptyAuthState);
  return {
    users: state.users ?? [],
    invites: state.invites ?? [],
  };
}

async function writeAuthState(state: AuthState) {
  await writePrivateJson(AUTH_KEY, state);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }

  return secret;
}

export function createRandomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, "hex");

  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
}

export async function bootstrapOwner(input: {
  email: string;
  password: string;
  setupCode: string;
}) {
  if (input.setupCode !== process.env.OWNER_SETUP_CODE) {
    throw new Error("Owner setup code is invalid.");
  }

  const email = normalizeEmail(input.email);
  if (email !== configuredOwnerEmail()) {
    throw new Error("Only the configured owner email can be bootstrapped.");
  }

  if (input.password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }

  const state = await readAuthState();
  const existingOwner = state.users.find((user) => user.role === "owner");
  if (existingOwner) {
    throw new Error("Owner account already exists.");
  }

  const user: AuthUser = {
    id: crypto.randomUUID(),
    email,
    role: "owner",
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  await writeAuthState({ ...state, users: [user, ...state.users] });
  return user;
}

export async function loginUser(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const state = await readAuthState();
  const user = state.users.find((item) => item.email === normalized);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid email or password.");
  }

  return user;
}

export async function createInvite(input: { email: string; invitedBy: string }) {
  const email = normalizeEmail(input.email);
  const state = await readAuthState();

  if (state.users.some((user) => user.email === email)) {
    throw new Error("That email already has access.");
  }

  const token = createRandomToken();
  const invite: Invite = {
    id: crypto.randomUUID(),
    email,
    tokenHash: tokenHash(token),
    invitedBy: input.invitedBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };

  const invites = state.invites.filter((item) => item.email !== email || item.usedAt);
  await writeAuthState({ ...state, invites: [invite, ...invites] });

  return { invite, token };
}

export async function consumeInvite(input: {
  token: string;
  password: string;
}) {
  if (input.password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }

  const state = await readAuthState();
  const invite = state.invites.find(
    (item) => item.tokenHash === tokenHash(input.token) && !item.usedAt,
  );

  if (!invite) {
    throw new Error("Invite is invalid or already used.");
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("Invite has expired.");
  }

  if (state.users.some((user) => user.email === invite.email)) {
    throw new Error("That email already has access.");
  }

  const user: AuthUser = {
    id: crypto.randomUUID(),
    email: invite.email,
    role: "member",
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  invite.usedAt = new Date().toISOString();
  await writeAuthState({ ...state, users: [user, ...state.users] });
  return user;
}

export function signSession(user: Pick<AuthUser, "id" | "email" | "role">) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySession(token?: string): SessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function setSessionCookie(user: Pick<AuthUser, "id" | "email" | "role">) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (session.role !== "owner") {
    redirect("/");
  }

  return session;
}
