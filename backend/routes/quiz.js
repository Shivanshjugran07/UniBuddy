const express = require("express");
const router = express.Router();
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// GET ALL QUIZZES
router.get("/", async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("quizzes")
      .select("id, title, subject, course, mentor_name, is_premium, duration, total_marks, created_at")
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

    let { title, subject, course, is_premium, questions, duration, total_marks } = req.body;

    if (!title || !subject || !questions || questions.length === 0)
      return res.status(400).json({ message: "Title, subject & questions required" });

    let { data, error } = await supabase
      .from("quizzes")
      .insert([{
        title, subject, course,
        mentor_id: req.user.id,
        mentor_name: req.user.name,
        is_premium: is_premium || false,
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

module.exports = router;