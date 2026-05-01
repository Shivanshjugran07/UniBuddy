const express = require("express");
const router = express.Router();
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// ── GET ALL MENTORS ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    let { data, error } = await supabase.from("mentors").select("*").order("rating", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── GET SINGLE MENTOR BY ID ───────────────────────────────────────────────
router.get("/:id/profile", async (req, res) => {
  try {
    let { data, error } = await supabase.from("mentors").select("*").eq("id", req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── REGISTER AS MENTOR ────────────────────────────────────────────────────
router.post("/register", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor")
      return res.status(403).json({ message: "Only mentor accounts can register" });

    let { data: existing } = await supabase.from("mentors").select("id").eq("user_id", req.user.id).single();
    if (existing) return res.status(400).json({ message: "Already a mentor" });

    let { subjects, bio, experience, price, upi_id } = req.body;
    let { data, error } = await supabase.from("mentors")
      .insert([{ user_id: req.user.id, name: req.user.name, subjects: subjects || [], bio, experience, price: Number(price) || 0, upi_id: upi_id || "", rating: 0, total_ratings: 0 }])
      .select().single();

    if (error) throw error;
    res.json({ message: "Mentor profile created ✅", mentor: data });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── SEND REQUEST to mentor (student only) ────────────────────────────────
router.post("/:id/request", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student")
      return res.status(403).json({ message: "Only students can send requests" });

    let { data: mentor } = await supabase.from("mentors").select("id, user_id").eq("id", req.params.id).single();
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    let { data: existing } = await supabase.from("mentor_requests")
      .select("id, status").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();

    if (existing) {
      if (existing.status === "pending") return res.status(400).json({ message: "Request already bheji hai ⏳" });
      if (existing.status === "accepted") return res.status(400).json({ message: "Already connected hai ✅" });
      await supabase.from("mentor_requests").update({ status: "pending" }).eq("id", existing.id);
      return res.json({ message: "Request dobara bheji ✅" });
    }

    let { error } = await supabase.from("mentor_requests")
      .insert([{ mentor_id: req.params.id, student_id: req.user.id, mentor_user_id: mentor.user_id, status: "pending" }]);

    if (error) throw error;
    res.json({ message: "Request bheji gayi ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── GET REQUEST STATUS ────────────────────────────────────────────────────
router.get("/:id/request-status", authMiddleware, async (req, res) => {
  try {
    let { data } = await supabase.from("mentor_requests")
      .select("id, status").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();
    res.json({ status: data?.status || "none", requestId: data?.id });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── GET INCOMING REQUESTS (mentor) ────────────────────────────────────────
router.get("/requests/incoming", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { data: mp } = await supabase.from("mentors").select("id").eq("user_id", req.user.id).single();
    if (!mp) return res.json([]);

    let { data: requests } = await supabase.from("mentor_requests")
      .select("id, status, created_at, student_id").eq("mentor_id", mp.id).eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!requests?.length) return res.json([]);
    const ids = requests.map(r => r.student_id);
    let { data: students } = await supabase.from("users")
      .select("id, name, email, avatar, course, year, subjects").in("id", ids);
    const map = {};
    (students || []).forEach(s => map[s.id] = s);
    res.json(requests.map(r => ({ requestId: r.id, status: r.status, created_at: r.created_at, student: map[r.student_id] || {} })));
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── GET CONNECTED STUDENTS ────────────────────────────────────────────────
router.get("/requests/students", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { data: mp } = await supabase.from("mentors").select("id").eq("user_id", req.user.id).single();
    if (!mp) return res.json([]);

    let { data: requests } = await supabase.from("mentor_requests")
      .select("student_id").eq("mentor_id", mp.id).eq("status", "accepted");
    if (!requests?.length) return res.json([]);

    const ids = requests.map(r => r.student_id);
    let { data: students } = await supabase.from("users")
      .select("id, name, email, avatar, course, year, subjects, study_style").in("id", ids);
    res.json(students || []);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── ACCEPT / REJECT REQUEST ───────────────────────────────────────────────
router.put("/requests/:requestId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    let { data: request } = await supabase.from("mentor_requests")
      .select("id, mentor_id, student_id").eq("id", req.params.requestId).maybeSingle();
    if (!request) return res.status(404).json({ message: "Request nahi mili" });

    await supabase.from("mentor_requests").update({ status }).eq("id", req.params.requestId);
    if (status === "accepted") {
      await supabase.from("mentor_students").insert([{ mentor_id: request.mentor_id, student_id: request.student_id }]);
    }
    res.json({ message: status === "accepted" ? "Student accept kiya ✅" : "Request reject ki ❌" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── GET MY RATING for a mentor ────────────────────────────────────────────
router.get("/:id/my-rating", authMiddleware, async (req, res) => {
  try {
    let { data } = await supabase.from("mentor_ratings")
      .select("rating, review").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();
    res.json({ rating: data?.rating || null, review: data?.review || "" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ── RATE A MENTOR (upsert — one rating per student per mentor) ────────────
router.post("/:id/rate", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student")
      return res.status(403).json({ message: "Only students can rate mentors" });

    let { rating, review } = req.body;
    rating = Number(rating);
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "Rating must be 1-5" });

    let { data: mentor } = await supabase.from("mentors")
      .select("id, rating, total_ratings").eq("id", req.params.id).single();
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    // Check if student is connected with this mentor
    let { data: connected } = await supabase.from("mentor_requests")
      .select("id").eq("mentor_id", req.params.id).eq("student_id", req.user.id).eq("status", "accepted").maybeSingle();
    if (!connected)
      return res.status(403).json({ message: "Pehle mentor se connected ho ✅" });

    // Check for existing rating
    let { data: existing } = await supabase.from("mentor_ratings")
      .select("id, rating").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();

    let newAvg, newTotal;

    if (existing) {
      // Update existing rating — recalculate average
      await supabase.from("mentor_ratings")
        .update({ rating, review: review || "" }).eq("id", existing.id);
      // Recalculate: remove old, add new
      const totalWithoutOld = (mentor.rating * mentor.total_ratings) - existing.rating;
      newTotal = mentor.total_ratings; // same count
      newAvg = Math.round((totalWithoutOld + rating) / newTotal * 10) / 10;
    } else {
      // New rating
      await supabase.from("mentor_ratings")
        .insert([{ mentor_id: req.params.id, student_id: req.user.id, rating, review: review || "" }]);
      newTotal = mentor.total_ratings + 1;
      newAvg = Math.round(((mentor.rating * mentor.total_ratings) + rating) / newTotal * 10) / 10;
    }

    await supabase.from("mentors").update({ rating: newAvg, total_ratings: newTotal }).eq("id", req.params.id);
    res.json({ message: existing ? "Rating update ho gayi ✅" : "Rating submit ho gayi ✅", rating: newAvg, isUpdate: !!existing });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server Error ❌" }); }
});

// ════════════════════════════════════════════════════════════════
//  PAYMENT ROUTES
// ════════════════════════════════════════════════════════════════

// Submit payment
router.post("/:id/payment", authMiddleware, async (req, res) => {
  try {
    const { txn_id, amount } = req.body;
    if (!txn_id) return res.status(400).json({ message: "Transaction ID required" });

    let { data: existing } = await supabase.from("mentor_payments")
      .select("id, status").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();

    if (existing?.status === "approved") return res.status(400).json({ message: "Already paid ✅" });

    if (existing) {
      await supabase.from("mentor_payments").update({ txn_id, status: "pending" }).eq("id", existing.id);
    } else {
      await supabase.from("mentor_payments").insert([{
        mentor_id: req.params.id, student_id: req.user.id, amount: Number(amount) || 0, txn_id, status: "pending"
      }]);
    }
    res.json({ message: "Payment submitted! Mentor verification ke baad access milega ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// Check payment status
router.get("/:id/payment-status", authMiddleware, async (req, res) => {
  try {
    let { data } = await supabase.from("mentor_payments")
      .select("id, status, txn_id").eq("mentor_id", req.params.id).eq("student_id", req.user.id).maybeSingle();
    res.json({ status: data?.status || "none", txn_id: data?.txn_id });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// Get pending payments (mentor approves)
router.get("/payments/pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { data: mp } = await supabase.from("mentors").select("id").eq("user_id", req.user.id).single();
    if (!mp) return res.json([]);

    let { data: payments } = await supabase.from("mentor_payments")
      .select("id, student_id, amount, txn_id, status, created_at")
      .eq("mentor_id", mp.id).eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!payments?.length) return res.json([]);
    const ids = payments.map(p => p.student_id);
    let { data: students } = await supabase.from("users").select("id, name, email, avatar").in("id", ids);
    const map = {};
    (students || []).forEach(s => map[s.id] = s);
    res.json(payments.map(p => ({ ...p, student: map[p.student_id] || {} })));
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// Approve/reject payment (mentor)
router.put("/payments/:paymentId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    await supabase.from("mentor_payments").update({ status }).eq("id", req.params.paymentId);
    res.json({ message: status === "approved" ? "Payment approved! Student ka access unlock ✅" : "Payment rejected ❌" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ════════════════════════════════════════════════════════════════
//  LMS ROUTES — COURSE CONTENT
// ════════════════════════════════════════════════════════════════

// Get course content for a mentor
router.get("/:id/content", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase.from("course_content")
      .select("*").eq("mentor_id", req.params.id).order("order_num", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// Add course content (mentor only)
router.post("/:id/content", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { data: mp } = await supabase.from("mentors").select("id").eq("id", req.params.id).eq("user_id", req.user.id).single();
    if (!mp) return res.status(403).json({ message: "Not your mentor profile" });

    let { title, description, content_type, file_url, content, order_num } = req.body;
    let { data, error } = await supabase.from("course_content")
      .insert([{ mentor_id: req.params.id, title, description, content_type: content_type || "note", file_url: file_url || "", content: content || "", order_num: order_num || 0 }])
      .select().single();
    if (error) throw error;
    res.json({ message: "Content added ✅", content: data });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// Delete course content
router.delete("/content/:contentId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    await supabase.from("course_content").delete().eq("id", req.params.contentId);
    res.json({ message: "Content deleted ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ════════════════════════════════════════════════════════════════
//  LMS ROUTES — ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════

router.get("/:id/announcements", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase.from("announcements")
      .select("*").eq("mentor_id", req.params.id).order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.post("/:id/announcements", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { title, content } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });
    let { data, error } = await supabase.from("announcements")
      .insert([{ mentor_id: req.params.id, title, content: content || "" }]).select().single();
    if (error) throw error;
    res.json({ message: "Announcement posted ✅", announcement: data });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.delete("/announcements/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    await supabase.from("announcements").delete().eq("id", req.params.id);
    res.json({ message: "Deleted ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ════════════════════════════════════════════════════════════════
//  LMS ROUTES — LIVE CLASSES
// ════════════════════════════════════════════════════════════════

router.get("/:id/live-classes", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase.from("live_classes")
      .select("*").eq("mentor_id", req.params.id).order("scheduled_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.post("/:id/live-classes", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    let { title, subject, scheduled_at, duration_mins, meet_link } = req.body;
    if (!title || !scheduled_at) return res.status(400).json({ message: "Title and time required" });
    let { data, error } = await supabase.from("live_classes")
      .insert([{ mentor_id: req.params.id, title, subject: subject || "", scheduled_at, duration_mins: duration_mins || 60, meet_link: meet_link || "" }])
      .select().single();
    if (error) throw error;
    res.json({ message: "Class scheduled ✅", class: data });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.delete("/live-classes/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Only mentors" });
    await supabase.from("live_classes").delete().eq("id", req.params.id);
    res.json({ message: "Class deleted ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

// ════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════════════════════

router.get("/admin/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only ❌" });
    let { data } = await supabase.from("users")
      .select("id, name, email, role, course, year, avatar, created_at").order("created_at", { ascending: false });
    res.json(data);
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.get("/admin/stats", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only ❌" });
    const [users, mentors, books, quizzes, requests] = await Promise.all([
      supabase.from("users").select("id, role"),
      supabase.from("mentors").select("id"),
      supabase.from("books").select("id"),
      supabase.from("quizzes").select("id"),
      supabase.from("mentor_requests").select("id, status"),
    ]);
    res.json({
      totalUsers: users.data?.length || 0,
      totalStudents: users.data?.filter(u => u.role === "student").length || 0,
      totalMentors: users.data?.filter(u => u.role === "mentor").length || 0,
      totalBooks: books.data?.length || 0,
      totalQuizzes: quizzes.data?.length || 0,
      pendingRequests: requests.data?.filter(r => r.status === "pending").length || 0,
    });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

router.delete("/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only ❌" });
    await supabase.from("users").delete().eq("id", req.params.id);
    res.json({ message: "User deleted ✅" });
  } catch (err) { res.status(500).json({ message: "Server Error ❌" }); }
});

module.exports = router;