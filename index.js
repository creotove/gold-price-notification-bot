import express from "express";
import {createServer} from "http";
import {checkGoldPrice, getLastGoldPrice, getGoldPriceData} from "./goldPriceTracker.js";
import {Parser} from "json2csv";
import path from "path";
import Pusher from "pusher";
import cors from "cors";
import {fileURLToPath} from "url";
import fs from "fs";

const app = express();
const port = process.env.PORT || 3000;
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Middleware
app.use(cors());

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gold Price</title>
        <style>
      body {
        font-family: Georgia, serif;
        color: hsl(18 56.8% 43.5%);
        background-color: #ded8c4;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        padding: 0;
      }
      .price-container {
        text-align: center;
      }
      .price {
        font-size: 5rem;
        font-weight: 600;
        margin: 0;
        display: inline-block;
      }
      .price span {
        display: inline-block;
        border-bottom: 2px solid currentColor;
        padding-bottom: 5px;
        margin: 0 2px;
      }
    </style>
    <script src="https://js.pusher.com/7.0/pusher.min.js"></script>
  </head>
  <body>
    <div class="price-container">
      <p class="price" id="price-display">Loading...</p>
    </div>
    <script>
    try {
      const pusher = new Pusher(process.env.PUSHER_KEY, {
        cluster: process.env.PUSHER_CLUSTER
      });

      const channel = pusher.subscribe("gold-price-channel");

      const priceDisplay = document.getElementById("price-display");

      channel.bind("pusher:subscription_succeeded", () => {
        console.log("Successfully subscribed to channel");
      });

      channel.bind("price-update", function (data) {
        if (data.sellingPrice && data.purchasingPrice) {
          const sellingPrice = \`₹\${data.sellingPrice}\`;
          const purchasingPrice = \`₹\${data.purchasingPrice}\`;
          const formattedPrice = \`\${sellingPrice} / \${purchasingPrice}\`;
          priceDisplay.textContent = formattedPrice;
          wrapLetters();
        }
      });
    
      function wrapLetters() {
        const text = priceDisplay.textContent;
        priceDisplay.innerHTML = text
          .split("")
          .map(char => (char === " " ? " " : \`<span>\${char}</span>\`))
          .join("");
      }

      // Fetch initial price
      fetch("/api/goldprice")
        .then(response => response.json())
        .then(data => {
          if (data.sellingPrice && data.purchasingPrice) {
            const sellingPrice = \`₹\${data.sellingPrice}\`;
            const purchasingPrice = \`₹\${data.purchasingPrice}\`;
            const formattedPrice = \`\${sellingPrice} / \${purchasingPrice}\`;
            priceDisplay.textContent = formattedPrice;
            wrapLetters();
          }
        })
        .catch(error => console.error("Error fetching initial price:", error));

      // Initial wrapping
      wrapLetters();
    } catch (error) {
      console.error("Error initializing Pusher:", error);
    }
    </script>
  </body>
</html>
`;

// Routes
app.get("/", (_, res) => {
  const injectedHtml = htmlContent.replace(/process\.env\.PUSHER_KEY/g, JSON.stringify(process.env.PUSHER_KEY)).replace(/process\.env\.PUSHER_CLUSTER/g, JSON.stringify(process.env.PUSHER_CLUSTER));
  res.send(injectedHtml);
});

app.get("/api/goldprice", async (_, res) => {
  try {
    const {sellingPrice, purchasingPrice} = await getLastGoldPrice();
    res.json({sellingPrice, purchasingPrice});
  } catch (error) {
    console.error("Error fetching gold price:", error);
    res.status(500).json({error: "Internal server error", message: error.message});
  }
});

app.get("/api/goldpricedata/csv", (_, res) => {
  try {
    const data = getGoldPriceData();
    const fields = ["price", "timestamp"];
    const json2csvParser = new Parser({fields});
    const csv = json2csvParser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=gold_price_data.csv");
    res.status(200).end(csv);
  } catch (error) {
    console.error("Error generating CSV:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
// Route to list files in the directory (for debugging purposes)
app.get("/debug-files", (_, res) => {
  try {
    const files = fs.readdirSync(dirname);
    res.json({files, dirname});
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
// Server initialization
const httpServer = createServer(app);

const startServer = async () => {
  try {
    console.log(`Server running on http://localhost:${port}`);
    await checkGoldPrice();

    setInterval(async () => {
      try {
        const {purchasingPrice, sellingPrice} = await checkGoldPrice();
        console.log("Sending price update via Pusher:", sellingPrice);
        await pusher.trigger("gold-price-channel", "price-update", {purchasingPrice, sellingPrice});
        console.log("Pusher event sent successfully");
      } catch (error) {
        console.error("Error sending Pusher event:", error);
      }
    }, 10000);
  } catch (error) {
    console.error("Error initializing server:", error);
  }
};

httpServer.listen(port, startServer);
