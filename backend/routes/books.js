const express = require("express");
const router = express.Router();
const supabase = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// GET ALL BOOKS
router.get("/", async (req, res) => {
  try {
    let { search, course, condition } = req.query;
    let query = supabase.from("books").select("*").eq("sold", false).order("created_at", { ascending: false });

    if (course) query = query.eq("course", course);
    if (condition) query = query.eq("condition", condition);
    if (search) query = query.ilike("title", `%${search}%`);

    let { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// GET MY BOOKS
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("seller_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// ADD BOOK
router.post("/add", authMiddleware, async (req, res) => {
  try {
    let { title, author, price, original_price, condition, subject, course, year, description, image, seller_phone } = req.body;

    if (!title || !price || !condition)
      return res.status(400).json({ message: "Title, price & condition required" });

    let { data, error } = await supabase
      .from("books")
      .insert([{
        title, author, price: Number(price),
        original_price: Number(original_price) || 0,
        condition, subject, course, year, description,
        image: image || "",
        seller: req.user.name,
        seller_id: req.user.id,
        seller_phone: seller_phone || "",
        sold: false
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ message: "Book listed ✅", book: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// MARK AS SOLD
router.put("/:id/sold", authMiddleware, async (req, res) => {
  try {
    let { data: book } = await supabase.from("books").select("seller_id").eq("id", req.params.id).single();
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.seller_id !== req.user.id) return res.status(403).json({ message: "Not authorized ❌" });

    await supabase.from("books").update({ sold: true }).eq("id", req.params.id);
    res.json({ message: "Marked as sold ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

// DELETE BOOK
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    let { data: book } = await supabase.from("books").select("seller_id").eq("id", req.params.id).single();
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.seller_id !== req.user.id) return res.status(403).json({ message: "Not authorized ❌" });

    await supabase.from("books").delete().eq("id", req.params.id);
    res.json({ message: "Book deleted ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error ❌" });
  }
});

module.exports = router;