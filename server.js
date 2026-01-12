const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// Create uploads folder
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Multer config – MP4 only
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, uuidv4() + ".mp4");
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "video/mp4") cb(null, true);
    else cb(new Error("Only MP4 allowed"));
  }
});

// One-time links
const links = new Map();

// ✅ Serve home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upload
app.post("/upload", upload.single("file"), (req, res) => {
  const id = uuidv4();
  links.set(id, req.file.path);

  res.send(`
    <h3>ONE-TIME VIDEO LINK</h3>
    <a href="/view/${id}" target="_blank">Open Video</a>
  `);
});

// ✅ View once (serve view.html)
app.get("/view/:id", (req, res) => {
  const id = req.params.id;
  const filePath = links.get(id);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.sendFile(path.join(__dirname, "public", "expired.html"));
  }

  // Delete link immediately after viewing
  links.delete(id);

  res.sendFile(path.join(__dirname, "public", "view.html"));
});

// ✅ Stream video
app.get("/stream/:id", (req, res) => {
  const id = req.params.id;
  const filePath = links.get(id);

  if (!filePath || !fs.existsSync(filePath)) return res.end();

  res.setHeader("Content-Type", "video/mp4");
  fs.createReadStream(filePath)
    .on("close", () => fs.unlinkSync(filePath))
    .pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
