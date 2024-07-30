import express from "express";
import { createServer } from "http";
import { checkGoldPrice, getLastGoldPrice, getGoldPriceData } from "./goldPriceTracker.js";
import { Parser } from 'json2csv';
import path from "path";
import Pusher from "pusher";
import cors from "cors";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
app.use(cors());

const port = process.env.PORT || 3000;
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const viewsPath = path.resolve(dirname);

app.set('views', viewsPath);
app.set('view engine', 'ejs');

// Route to render the home page
app.get("/", (req, res) => {
  res.render("index.ejs");
});

// Route to get the current gold price
app.get("/api/goldprice", async (req, res) => {
  try {
    const currentPrice = await getLastGoldPrice();
    console.log('Sending current price:', currentPrice);
    res.json({ price: currentPrice });
  } catch (error) {
    console.error("Error fetching gold price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to export gold price data as CSV
app.get("/api/goldpricedata/csv", (req, res) => {
  try {
    const data = getGoldPriceData();
    const fields = ['price', 'timestamp'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gold_price_data.csv');
    res.status(200).end(csv);
  } catch (error) {
    console.error("Error generating CSV:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to list files in the directory (for debugging purposes)
app.get('/debug-files', (req, res) => {
  try {
    const files = fs.readdirSync(dirname);
    res.json({ files, dirname });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server and initialize the gold price tracker
const httpServer = createServer(app);

httpServer.listen(port, async () => {
  try {
    console.log(`Server running on http://localhost:${port}`);
    await checkGoldPrice();

    // Set up interval to check gold price and emit updates
    setInterval(async () => {
      try {
        const currentPrice = await checkGoldPrice();
        console.log('Sending price update via Pusher:', currentPrice);

        await pusher.trigger("gold-price-channel", "price-update", {
          price: currentPrice
        });
        console.log('Pusher event sent successfully');
      } catch (error) {
        console.error('Error sending Pusher event:', error);
      }
    }, 10000); // Check every minute
  } catch (error) {
    console.error("Error initializing server:", error);
  }
});
