require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const validUrl = require("valid-url");

// Basic Configuration
const port = process.env.PORT || 3000;
const MDB_URI = process.env.MDB;

//db connection
mongoose
  .connect(MDB_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => console.log(err));

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true },
});
const UrlObj = mongoose.model("Url", urlSchema);

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.use(require("body-parser").urlencoded({ extended: false }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

async function parseurl(req, res, next) {
  if (!req.body.url) {
    return res.status(400).json({ error: "invalid url" });
  }
  const url = req.body.url;
  console.log("reading url: " + url);

  if (!validUrl.isUri(url)) {
    return res.status(400).json({ error: "invalid url" });
  } else {
    next();
  }
}

async function saveurl(req, res, next) {
  const url = req.body.url;
  const { nanoid } = await import("nanoid");
  const shortUrl = nanoid(6); //create short url
  const newUrl = new UrlObj({
    originalUrl: url,
    shortUrl: shortUrl,
  });
  //check if url exists, no need to save it again
  const urlExists = await UrlObj.findOne({ originalUrl: url });

  if (urlExists) {
    console.log("url already exists");
    return res.json({ original_url: url, short_url: urlExists.shortUrl });
  }

  newUrl
    .save()
    .then(() => {
      console.log("url saved");
      res.json({ original_url: url, short_url: shortUrl });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

app.post("/api/shorturl", [parseurl, saveurl], function (req, res) {});

app.get("/api/shorturl/:shortUrl", async function (req, res) {
  const shortUrl = req.params.shortUrl;
  const url = await UrlObj.findOne({ shortUrl: shortUrl });
  if (url) {
    res.redirect(url.originalUrl);
  } else {
    res.status(404).json({ error: "url not found" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
