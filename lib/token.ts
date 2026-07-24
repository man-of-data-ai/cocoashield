/**
 * Signature et vérification d'un jeton de session "maison".
 *
 * On évite volontairement une dépendance externe (type jsonwebtoken) afin de
 * garder le projet léger, et surtout parce que le middleware Next.js
 * s'exécute dans le runtime Edge, qui n'a pas accès au module `crypto` de
 * Node. On utilise donc l'API Web Crypto (`crypto.subtle`), disponible à la
 * fois côté Edge et côté Node (Route Handlers).
 *
 * Format du jeton : `<payload_base64url>.<signature_base64url>`
 * La signature est un HMAC-SHA256 du payload, avec un secret serveur.
 *
 * ⚠️ Pour une mise en production réelle connectée à une vraie API REST,
 * ce module serait simplement retiré : l'authentification (émission /
 * vérification du token) serait déléguée au backend externe, et ce fichier
 * n'aurait plus lieu d'être. Il sert ici à ce que l'API interne de démo
 * (app/api/**) soit malgré tout sécurisée de bout en bout.
 */

import type { User } from "@/types/auth";

const SECRET =
  process.env.AUTH_TOKEN_SECRET ??
  "dev-secret-change-me-in-production-env-var";

export type SessionPayload = {
  user: User;
  /** Timestamp d'expiration, en millisecondes epoch. */
  exp: number;
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signe un payload de session et retourne le jeton sérialisé.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const key = await getHmacKey();
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes);

  return `${toBase64Url(payloadBytes)}.${toBase64Url(signature)}`;
}

/**
 * Vérifie l'intégrité et l'expiration d'un jeton.
 * Retourne le payload s'il est valide, sinon `null`.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  try {
    const key = await getHmacKey();
    const payloadBytes = fromBase64Url(payloadPart);
    const signatureBytes = fromBase64Url(signaturePart);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      payloadBytes as BufferSource
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes)
    ) as SessionPayload;

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
