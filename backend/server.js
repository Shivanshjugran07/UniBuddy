const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// Root redirect — STATIC SE PEHLE
app.get("/", (req, res) => {
  res.sendfile(path.join(__dirname, "frontend", "login.html"));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "frontend")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/books", require("./routes/books"));
app.use("/api/mentors", require("./routes/mentors"));
app.use("/api/quiz", require("./routes/quiz"));
app.use("/api/partners", require("./routes/partners"));

// Explicit route for auth-callback
app.get("/auth-callback.html", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "auth-callback.html"));
});

// Any other route → login
app.use((req, res) => {
  if (req.path.endsWith(".html")) {
    return res.status(404).send("Page not found");
  }
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`UniBuddy server running on port ${PORT} 🚀`));