import crypto from "crypto";

type Session = {
  id: string;
  createdAt: number;
};

const sessions = new Map<string, Session>();

export function createSession() {
  const id = crypto.randomBytes(24).toString("hex");
  sessions.set(id, { id, createdAt: Date.now() });
  return id;
}

export function hasSession(id: string | undefined | null) {
  if (!id) return false;
  return sessions.has(id);
}

export function deleteSession(id: string) {
  sessions.delete(id);
}