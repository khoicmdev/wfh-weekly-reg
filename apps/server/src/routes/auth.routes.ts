import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { adminAuth, adminDb } from "../lib/firebase-admin.js";
import { verifyToken } from "../middleware/auth.middleware.js";

export const authRouter = Router();

// ── Zod schemas ──────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .trim(),
});

// ── POST /api/v1/auth/register ────────────────────────────────────────────────

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const userRecord = await adminAuth.createUser({ email, password });

    // Create Firestore profile doc — displayName starts as null (triggers onboarding)
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: null,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: "Account created. Please sign in." });
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    console.error("[register]", firebaseError);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    // Call Firebase Auth REST API to exchange email/password for an idToken
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    if (!firebaseRes.ok) {
      const errBody = (await firebaseRes.json()) as { error?: { message?: string } };
      const code = errBody.error?.message ?? "";

      if (code === "INVALID_LOGIN_CREDENTIALS" || code === "EMAIL_NOT_FOUND" || code === "INVALID_PASSWORD") {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
      if (code === "USER_DISABLED") {
        res.status(403).json({ error: "This account has been disabled." });
        return;
      }
      res.status(401).json({ error: "Authentication failed. Please try again." });
      return;
    }

    const { idToken, refreshToken } = (await firebaseRes.json()) as {
      idToken: string;
      refreshToken: string;
    };

    // Fetch the user's Firestore profile to return displayName
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const userProfile = userDoc.data() as {
      uid: string;
      email: string;
      displayName: string | null;
      createdAt: string;
    } | undefined;

    res.json({
      token: idToken,
      refreshToken,
      user: userProfile ?? { uid: decoded.uid, email, displayName: null },
    });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

authRouter.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const doc = await adminDb.collection("users").doc(req.user!.uid).get();

    if (!doc.exists) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    res.json(doc.data());
  } catch (err) {
    console.error("[me]", err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// ── PATCH /api/v1/auth/me ─────────────────────────────────────────────────────

authRouter.patch("/me", verifyToken, async (req: Request, res: Response) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { displayName } = parsed.data;
  const uid = req.user!.uid;

  try {
    // Update in Firebase Auth (affects token claims display name)
    await adminAuth.updateUser(uid, { displayName });

    // Update in Firestore profile doc
    await adminDb.collection("users").doc(uid).update({
      displayName,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: "Profile updated.", displayName });
  } catch (err) {
    console.error("[update-me]", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});
