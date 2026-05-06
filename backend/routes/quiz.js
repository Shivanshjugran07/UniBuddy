const express = require("express");
const router = express.Router();
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// GET ALL QUIZZES — FIXED: added is_mock, mentor_id, session_fee
router.get("/", async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("quizzes")
      .select("id, title, subject, course, mentor_name, mentor_id, is_premium, is_mock, session_fee, duration, total_marks, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// GET QUIZ BY ID (with questions)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (!data) return res.status(404).json({ message: "Quiz not found" });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// CREATE QUIZ (mentor only)
router.post("/create", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor")
      return res.status(403).json({ message: "Only mentors can create quizzes ❌" });

    let { title, subject, course, is_premium, is_mock, questions, duration, total_marks, session_fee } = req.body;

    if (!title || !subject || !questions || questions.length === 0)
      return res.status(400).json({ message: "Title, subject & questions required" });

    let { data, error } = await supabase
      .from("quizzes")
      .insert([{
        title, subject, course,
        mentor_id: req.user.id,
        mentor_name: req.user.name,
        is_premium: is_premium || false,
        is_mock: is_mock || false,
        session_fee: session_fee || 0,
        questions,
        duration: duration || 15,
        total_marks: total_marks || 10
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ message: "Quiz created ✅", quiz: data });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// SUBMIT QUIZ
router.post("/:id/submit", authMiddleware, async (req, res) => {
  try {
    let { data: quiz } = await supabase.from("quizzes").select("questions").eq("id", req.params.id).single();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    let { answers } = req.body;
    let score = 0;
    let results = [];

    quiz.questions.forEach((q, i) => {
      let isCorrect = answers[i] === q.correct;
      if (isCorrect) score++;
      results.push({ question: q.question, selected: answers[i], correct: q.correct, isCorrect, explanation: q.explanation });
    });

    res.json({
      score,
      total: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      results
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});
// DELETE QUIZ (mentor only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor")
      return res.status(403).json({ message: "Only mentors can delete ❌" });
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", req.params.id)
      .eq("mentor_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Quiz delete ho gayi ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ── PAYMENT ROUTES ──────────────────────────────────────────────────────────

// SUBMIT PAYMENT REQUEST — student payment bhejta hai, mentor approval pending
// Frontend ab auto-unlock nahi karta, backend mein pending record banta hai
router.post("/:id/payment-request", authMiddleware, async (req, res) => {
  try {
    const { txnId } = req.body;
    if (!txnId || txnId.trim().length < 6)
      return res.status(400).json({ message: "Valid transaction ID required (min 6 chars)" });

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, mentor_id, title")
      .eq("id", req.params.id)
      .single();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Already approved? Seedha bata do
    const { data: existing } = await supabase
      .from("quiz_payments")
      .select("status")
      .eq("quiz_id", req.params.id)
      .eq("student_id", req.user.id)
      .maybeSingle();

    if (existing?.status === "approved")
      return res.json({ message: "Already approved ✅", approved: true });

    // Naya payment request insert / update karo
    const { error } = await supabase
      .from("quiz_payments")
      .upsert({
        quiz_id: req.params.id,
        student_id: req.user.id,
        student_name: req.user.name,
        mentor_id: quiz.mentor_id,
        quiz_title: quiz.title,
        txn_id: txnId.trim(),
        status: "pending"
      }, { onConflict: "quiz_id,student_id" });

    if (error) throw error;
    res.json({ message: "Payment request bhej di! Mentor approve kare tab unlock hoga ⏳", pending: true });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// CHECK PAYMENT STATUS — student apna status check kare
router.get("/:id/payment-status", authMiddleware, async (req, res) => {
  try {
    const { data } = await supabase
      .from("quiz_payments")
      .select("status")
      .eq("quiz_id", req.params.id)
      .eq("student_id", req.user.id)
      .maybeSingle();
    res.json({ status: data?.status || "none" });
  } catch (err) {
    res.status(500).json({ status: "none" });
  }
});

// GET PENDING PAYMENTS — mentor apne pending requests dekhe
router.get("/payments/pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor" && req.user.role !== "admin")
      return res.status(403).json({ message: "Only mentors/admins can view payments ❌" });

    const { data, error } = await supabase
      .from("quiz_payments")
      .select("*")
      .eq("mentor_id", req.user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// APPROVE / REJECT PAYMENT — mentor payment verify kare
router.put("/payment/:paymentId/approve", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "mentor" && req.user.role !== "admin")
      return res.status(403).json({ message: "Only mentors/admins can approve ❌" });

    const { action } = req.body; // 'approved' ya 'rejected'
    const newStatus = action === "rejected" ? "rejected" : "approved";

    const { data, error } = await supabase
      .from("quiz_payments")
      .update({ status: newStatus })
      .eq("id", req.params.paymentId)
      .eq("mentor_id", req.user.id) // sirf apne quizzes ke payments approve kare
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Payment not found ya unauthorized" });

    res.json({ message: newStatus === "approved" ? "Payment approved ✅" : "Payment rejected ❌", data });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

module.exports = router;