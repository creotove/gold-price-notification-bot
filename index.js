// // import express from "express";
// // import { checkGoldPrice, getLastGoldPrice } from "./goldPriceTracker.js";

// // const app = express();
// // const port = process.env.PORT || 3000;

// // app.set("view engine", "ejs");
// // app.use(express.static("public"));

// // // API route to get the current gold price
// // app.get("/api/goldprice", async (req, res) => {
// //   const currentPrice = await getLastGoldPrice();
// //   res.json({ price: currentPrice });
// // });

// // // Route to render the home page
// // app.get("/", async (req, res) => {
// //   const goldPrice = await checkGoldPrice();
// //   res.render("index", { goldPrice });
// // });

// // // Start the server and initialize the gold price tracker
// // app.listen(port, async () => {
// //   console.log(`Server running on http://localhost:${port}`);
// //   await checkGoldPrice();
// // });

// import express from "express";
// import { createServer } from "http";
// import { Server } from "socket.io";
// import { checkGoldPrice, getLastGoldPrice } from "./goldPriceTracker.js";

// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer);

// const port = process.env.PORT || 3000;

// app.set("view engine", "ejs");
// app.use(express.static("public"));

// // Socket.IO connection handling
// io.on("connection", (socket) => {
//   console.log("A user connected");

//   // Send the initial gold price
//   checkGoldPrice().then((price) => {
//     console.log("Sending initial gold price to user");
//     socket.emit("goldPriceUpdate", price);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected");
//   });
// });

// // Route to render the home page
// app.get("/", (req, res) => {
//   res.render("index");
// });

// // Start the server and initialize the gold price tracker
// httpServer.listen(port, async () => {
//   console.log(`Server running on http://localhost:${port}`);
//   await checkGoldPrice();

//   // Set up interval to check gold price and emit updates
//   setInterval(async () => {
//     const currentPrice = await checkGoldPrice();
//     io.emit("goldPriceUpdate", currentPrice);
//   }, 60000); // Check every 10 seconds
// });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { checkGoldPrice, getLastGoldPrice, getGoldPriceData } from "./goldPriceTracker.js";
import { Parser } from 'json2csv';
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Send the initial gold price
  checkGoldPrice().then((price) => {
    console.log("Sending initial gold price to user");
    socket.emit("goldPriceUpdate", price);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Route to render the home page
app.get("/", (req, res) => {
  res.render("index");
});

// Route to export gold price data as JSON
app.get("/api/goldpricedata", (req, res) => {
  const data = getGoldPriceData();
  res.json(data);
});

// Route to export gold price data as CSV
app.get("/api/goldpricedata/csv", (req, res) => {
  const data = getGoldPriceData();
  const fields = ['price', 'timestamp'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=gold_price_data.csv');
  res.status(200).end(csv);
});

app.get('/debug-files', (req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync(__dirname);
  res.json({ files, dirname: __dirname });
});

// Start the server and initialize the gold price tracker
httpServer.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  await checkGoldPrice();

  // Set up interval to check gold price and emit updates
  setInterval(async () => {
    const currentPrice = await checkGoldPrice();
    io.emit("goldPriceUpdate", currentPrice);
  }, 60000); // Check every minute
});