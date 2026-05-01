const express = require("express");
const router = express.Router();
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// Cosine similarity
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// AI MATCH
router.get("/match", authMiddleware, async (req, res) => {
  try {
    let { data: me } = await supabase
      .from("users")
      .select("match_vector")
      .eq("id", req.user.id)
      .single();

    let { data: others } = await supabase
      .from("users")
      .select("id, name, email, avatar, course, year, subjects, study_style, bio, phone, match_vector")
      .eq("role", "student")
      .neq("id", req.user.id);

    let scored = (others || []).map(user => ({
      ...user,
      match_vector: undefined,
      matchScore: Math.round(cosineSimilarity(me?.match_vector || [], user.match_vector || []) * 100)
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored.slice(0, 10));
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// BROWSE ALL
router.get("/browse", authMiddleware, async (req, res) => {
  try {
    let { course, year } = req.query;
    let query = supabase
      .from("users")
      .select("id, name, email, avatar, course, year, subjects, study_style, bio, phone")
      .eq("role", "student")
      .neq("id", req.user.id)
      .limit(20);

    if (course) query = query.eq("course", course);
    if (year) query = query.eq("year", year);

    let { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// SEND CONNECTION REQUEST
router.post("/request/:receiverId", authMiddleware, async (req, res) => {
  try {
    const sender_id = req.user.id;
    const receiver_id = req.params.receiverId;

    if (sender_id === receiver_id)
      return res.status(400).json({ message: "Apne aap ko request nahi bhej sakte" });

    // Check already exists
    let { data: existing } = await supabase
      .from("connection_requests")
      .select("id, status")
      .eq("sender_id", sender_id)
      .eq("receiver_id", receiver_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending")
        return res.status(400).json({ message: "Request already bheji ja chuki hai ⏳" });
      if (existing.status === "accepted")
        return res.status(400).json({ message: "Already connected hai ✅" });
      // If rejected, allow re-request by updating
      if (existing.status === "rejected") {
        await supabase.from("connection_requests").update({ status: "pending" }).eq("id", existing.id);
        return res.json({ message: "Connection request dobara bheji ✅" });
      }
    }

    let { error } = await supabase
      .from("connection_requests")
      .insert([{ sender_id, receiver_id, status: "pending" }]);

    if (error) throw error;
    res.json({ message: "Connection request bheji gayi ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// GET MY INCOMING REQUESTS (jo mujhe aayi hain)
router.get("/requests/incoming", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("connection_requests")
      .select("id, status, created_at, sender_id")
      .eq("receiver_id", req.user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get sender details
    const senderIds = (data || []).map(r => r.sender_id);
    if (senderIds.length === 0) return res.json([]);

    let { data: users } = await supabase
      .from("users")
      .select("id, name, email, avatar, course, year, subjects, study_style")
      .in("id", senderIds);

    const usersMap = {};
    (users || []).forEach(u => usersMap[u.id] = u);

    const result = (data || []).map(r => ({
      requestId: r.id,
      status: r.status,
      created_at: r.created_at,
      sender: usersMap[r.sender_id] || {}
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// GET MY SENT REQUESTS (jo maine bheji hain)
router.get("/requests/sent", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("connection_requests")
      .select("id, status, created_at, receiver_id")
      .eq("sender_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const receiverIds = (data || []).map(r => r.receiver_id);
    if (receiverIds.length === 0) return res.json([]);

    let { data: users } = await supabase
      .from("users")
      .select("id, name, email, avatar, course, year")
      .in("id", receiverIds);

    const usersMap = {};
    (users || []).forEach(u => usersMap[u.id] = u);

    const result = (data || []).map(r => ({
      requestId: r.id,
      status: r.status,
      created_at: r.created_at,
      receiver: usersMap[r.receiver_id] || {}
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ACCEPT / REJECT REQUEST
router.put("/request/:requestId", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body; // "accepted" or "rejected"

    if (!["accepted", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    // Make sure current user is the receiver
    let { data: request } = await supabase
      .from("connection_requests")
      .select("id, receiver_id")
      .eq("id", req.params.requestId)
      .maybeSingle();

    if (!request) return res.status(404).json({ message: "Request nahi mili" });
    if (request.receiver_id !== req.user.id)
      return res.status(403).json({ message: "Authorized nahi ho ❌" });

    await supabase
      .from("connection_requests")
      .update({ status })
      .eq("id", req.params.requestId);

    res.json({ message: status === "accepted" ? "Request accept ki ✅" : "Request reject ki ❌" });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// GET CONNECTION STATUS with a specific user
router.get("/status/:userId", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    let { data } = await supabase
      .from("connection_requests")
      .select("id, status, sender_id, receiver_id")
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
      .maybeSingle();

    if (!data) return res.json({ status: "none" });

    res.json({
      status: data.status,
      isSender: data.sender_id === myId,
      requestId: data.id
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

module.exports = router;