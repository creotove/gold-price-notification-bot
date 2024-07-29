const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Import the gold price tracker functionality
const {checkGoldPrice, getLastGoldPrice} = require("./goldPriceTracker.js");

// API route to get the current gold price
app.get("/api/goldprice", async (req, res) => {
  const currentPrice = await getLastGoldPrice();
  res.json({price: currentPrice});
});

// Route to render the home page
app.get("/", async (req, res) => {
  const lastPrice = await checkGoldPrice();
  res.render("index", {lastPrice});
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Initialize the gold price tracker
checkGoldPrice();
