const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

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

// Upload page
app.get("/", (req, res) => {
  res.send(`
    <h2>View Once MP4 Upload</h2>
    <form method="post" action="/upload" enctype="multipart/form-data">
      <input type="file" name="file" accept="video/mp4" required />
      <br><br>
      <button>Upload</button>
    </form>
  `);
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

// View once (player)
app.get("/view/:id", (req, res) => {
  const filePath = links.get(req.params.id);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send("Expired");
  }

  links.delete(req.params.id);

  res.send(`
<!DOCTYPE html>
<html>
<body style="margin:0;background:black" oncontextmenu="return false">
  <video autoplay controls controlsList="nodownload">
    <source src="/stream/${path.basename(filePath)}" type="video/mp4">
  </video>
</body>
</html>
  `);
});

// Stream + delete
app.get("/stream/:file", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.file);
  if (!fs.existsSync(filePath)) return res.end();

  res.setHeader("Content-Type", "video/mp4");
  fs.createReadStream(filePath)
    .on("close", () => fs.unlinkSync(filePath))
    .pipe(res);
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:3000");
});
