const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const trackingLinks = {};

require("dotenv").config();
const IPINFO_TOKEN = process.env.IPINFO_TOKEN;

app.use(cors());
app.use(express.json());

app.post("/api/generate", (req, res) => {
  const { url, description } = req.body;
  const id = uuidv4().slice(0, 8);
  trackingLinks[id] = {
    originalUrl: url,
    description,
    createdAt: new Date(),
    clicks: [],
  };
  res.json({ trackingUrl: `${req.protocol}://${req.get("host")}/track/${id}` });
});

app.get("/track/:id", async (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) return res.status(404).send("Not found");

  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  try {
    const geo = await axios.get(
      `https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`
    );
    link.clicks.push({
      ip,
      city: geo.data.city,
      region: geo.data.region,
      country: geo.data.country,
      loc: geo.data.loc, // Tambahkan ini
      org: geo.data.org,
      time: new Date(),
    });
  } catch (error) {
    console.error("Error fetching geolocation:", error.message);
  }

  res.redirect(link.originalUrl);
});

app.get("/api/clicks/:id", (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) return res.status(404).send("Tracking ID not found");
  res.json(link.clicks);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
