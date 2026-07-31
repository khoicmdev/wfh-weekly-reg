import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { adminAuth, adminDb } from "../lib/firebase-admin.js";
import { verifyToken } from "../middleware/auth.middleware.js";

export const authRouter = Router();

// ── Zod schemas ──────────────────────────────────────────────────────────────

const SendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  code: z.string().length(6, "Verification code must be 6 digits"),
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

// ── POST /api/v1/auth/send-otp ────────────────────────────────────────────────

authRouter.post("/send-otp", async (req: Request, res: Response) => {
  const parsed = SendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { email } = parsed.data;

  try {
    // Check if user already exists
    try {
      await adminAuth.getUserByEmail(email);
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code !== "auth/user-not-found") {
        throw err;
      }
    }

    // Generate random 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Save to Firestore
    await adminDb.collection("email_otps").doc(email).set({
      code,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    console.log(`\n========================================`);
    console.log(`🔑 VERIFICATION CODE FOR ${email}: ${code}`);
    console.log(`========================================\n`);

    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("[send-otp]", err);
    res.status(500).json({ error: "Failed to send verification code. Please try again." });
  }
});

// ── POST /api/v1/auth/register ────────────────────────────────────────────────

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { email, password, code } = parsed.data;

  try {
    // Verify OTP code stored in Firestore
    const otpDoc = await adminDb.collection("email_otps").doc(email).get();
    if (!otpDoc.exists) {
      res.status(400).json({ error: "Please request a verification code first." });
      return;
    }

    const otpData = otpDoc.data() as { code: string; expiresAt: string };
    if (new Date(otpData.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      return;
    }

    if (otpData.code !== code) {
      res.status(400).json({ error: "Invalid verification code." });
      return;
    }

    // Delete used OTP
    await adminDb.collection("email_otps").doc(email).delete();

    // Create user in Firebase Auth
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

  const apiKey =
    process.env.WEB_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY ||
    "AIzaSyAv5i6KjmcoxB8hJfZwkH7tScNfk0dJwAE";

  try {
    // Call Firebase Auth REST API to exchange email/password for an idToken
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
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
