require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());

// Define allowed origins
const allowedOrigins = ["http://example1.com", "http://example2.com"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
})); // Allow frontend requests

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Create Schema & Model
const clickSchema = new mongoose.Schema({
  buttonName: String,
  clickCount: { type: Number, default: 1 },
});

const Click = mongoose.model("Click", clickSchema);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
})

// API to Track Clicks
app.post("/track-click", async (req, res, next) => {
  const { buttonName } = req.body;
  if (!buttonName) return res.status(400).json({ error: "Button name is required!" });

  try {
    const click = await Click.findOneAndUpdate(
      { buttonName },
      { $inc: { clickCount: 1 } },
      { new: true, upsert: true }
    );
    res.json({ success: true, click });
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/email-verification", (req, res) => {
  const { status, message } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 20px;
        }
        .message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 5px;
          background-color: ${status === 'error' ? '#f8d7da' : '#d4edda'};
          color: ${status === 'error' ? '#721c24' : '#155724'};
        }
        .redirect {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Email Verification Status</h1>
      <div class="message">${message}</div>
      <div class="redirect">
        <p>You will be redirected to the homepage shortly...</p>
      </div>

      <script>
        // Redirect to the homepage after 5 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
