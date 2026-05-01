const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const SECRET = process.env.JWT_SECRET || "unibuddy_super_secret_2026";

// Compute AI match vector
function computeMatchVector(user) {
  const courses = ["BCA", "MCA", "B.Tech", "MBA", "B.Sc", "Other"];
  const years = ["1st", "2nd", "3rd", "4th"];
  const styles = ["morning", "night", "group", "solo", "flexible"];
  const allSubjects = ["DSA", "DBMS", "OS", "CN", "Maths", "Physics", "Python", "Java", "Web Dev", "AI", "ML", "Cloud"];

  let vector = [];
  courses.forEach(c => vector.push(user.course === c ? 1 : 0));
  years.forEach(y => vector.push(user.year === y ? 1 : 0));
  styles.forEach(s => vector.push(user.study_style === s ? 1 : 0));
  allSubjects.forEach(s => vector.push((user.subjects || []).includes(s) ? 1 : 0));
  return vector;
}

// ─────────────────────────────────────────────
// REGISTER (Email/Password)
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email & password required" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    let { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing)
      return res.status(400).json({ message: "User already exists" });

    let hashed = await bcrypt.hash(password, 10);

    let { data: user, error } = await supabase
      .from("users")
      .insert([{
        name,
        email,
        password: hashed,
        role: role || "student",
        subjects: [],
        match_vector: []
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Registered Successfully ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ─────────────────────────────────────────────
// LOGIN (Email/Password)
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    let { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) return res.status(400).json({ message: "User not found" });

    // Google-only users ke paas password nahi hota
    if (!user.password)
      return res.status(400).json({ message: "This account uses Google Sign-In. Please login with Google." });

    let match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    let token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        course: user.course,
        year: user.year,
        subjects: user.subjects
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ─────────────────────────────────────────────
// GOOGLE OAUTH CALLBACK  ← NEW
// Frontend se Google access token aata hai,
// hum user ko DB mein upsert karte hain aur
// apna JWT return karte hain
// ─────────────────────────────────────────────
router.post("/google-callback", async (req, res) => {
  try {
    const { email, name, avatar, supabase_id, supabase_access_token } = req.body;

    if (!email || !supabase_id)
      return res.status(400).json({ message: "Invalid Google auth data" });

    // Check karo user already hai ya nahi
    let { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    let user;

    if (existingUser) {
      // User exists — avatar update karo agar naya hai
      const updates = {};
      if (avatar && !existingUser.avatar) updates.avatar = avatar;
      if (supabase_id && !existingUser.supabase_id) updates.supabase_id = supabase_id;

      if (Object.keys(updates).length > 0) {
        await supabase.from("users").update(updates).eq("id", existingUser.id);
      }
      user = { ...existingUser, ...updates };
    } else {
      // Naya user — create karo (Google users ka password null rehta hai)
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([{
          name: name || email.split("@")[0],
          email,
          password: null,          // Google login = no password
          avatar: avatar || null,
          supabase_id,
          role: "student",          // Default role
          subjects: [],
          match_vector: []
        }])
        .select()
        .single();

      if (error) throw error;
      user = newUser;
    }

    // Apna JWT banao
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        course: user.course,
        year: user.year,
        subjects: user.subjects
      }
    });
  } catch (err) {
    console.error("Google callback error:", err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ─────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    let { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, avatar, course, year, subjects, study_style, bio, phone")
      .eq("id", req.user.id)
      .single();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    let { name, course, year, subjects, study_style, bio, phone, avatar } = req.body;

    let updateData = { name, course, year, study_style, bio, phone };
    if (subjects) updateData.subjects = typeof subjects === "string" ? JSON.parse(subjects) : subjects;
    if (avatar) updateData.avatar = avatar;

    updateData.match_vector = computeMatchVector({ ...updateData });

    let { data: user, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.user.id)
      .select("id, name, email, role, avatar, course, year, subjects, study_style, bio, phone")
      .single();

    if (error) throw error;

    res.json({ message: "Profile updated ✅", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

module.exports = router;