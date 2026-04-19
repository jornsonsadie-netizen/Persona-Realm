import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.AUTH_SECRET || "fallback_secret_change_me_in_prod";

// Register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, email)),
    });

    if (existingUser) {
      res.status(400).json({ error: "Username or email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
    }).returning();

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: "30d" });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({ user: { id: newUser.id, username: newUser.username, email: newUser.email } });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Me (Get current user)
router.get("/auth/me", async (req: any, res): Promise<void> => {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie("auth_token");
  res.json({ message: "Logged out" });
});

export default router;
