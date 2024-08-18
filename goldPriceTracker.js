import nodemailer from "nodemailer";
import cron from "node-cron";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const { SENDER_EMAIL, SENDER_PASSWORD, RECIPIENT_EMAIL_ONE, RECIPIENT_EMAIL_TWO, CITY, URI } = process.env;
const recipientUsers = [RECIPIENT_EMAIL_ONE, RECIPIENT_EMAIL_TWO];

let goldPriceData = [];
let lastGoldPrice = { sellingPrice: null, purchasingPrice: null };

async function fetchGoldPrice(res) {
  try {
    // Fetch the data from Paytm's API
    const response = await fetch(URI, {
      mode: "no-cors",
    });
    
    // Ensure the response status is 200 OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse the JSON data from the response
    const json = await response.json();
    
    // Extract the necessary information from the JSON response
    const goldPriceData = json?.portfolio?.product_level?.[0];
    
    if (!goldPriceData) {
      throw new Error("Gold price data not found in the response");
    }    
    const data = {
      purchasingPrice: (goldPriceData.price_per_gm * 10).toFixed(2),
      sellingPrice: (goldPriceData.sell_price_per_gm * 10).toFixed(2),
    };
    return  data;

  } catch (error) {
    console.log("Error fetching gold price:", error.message);
    return res.status(500).json({ error: "Error fetching gold price", message: error.message, success: false });
  }
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {user: SENDER_EMAIL, pass: SENDER_PASSWORD},
  });
}

async function sendNotification(lastPrice, currentPrice) {
  const transporter = createTransporter();
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="text-align: center; color: #333;">Gold Price Alert</h2>
        <p style="font-size: 16px; color: #555;">The gold price has changed in ${CITY}.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Previous Selling Price</th>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Current Selling Price</th>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Previous Purchasing Price</th>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Current Purchasing Price</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${lastPrice.sellingPrice}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${currentPrice.sellingPrice}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${lastPrice.purchasingPrice}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${currentPrice.purchasingPrice}</td>
                </tr>
            </tbody>
        </table>
        <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">Notification generated at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
    </div>
  `;

  const mailOptions = recipientUsers.map(email => ({
    from: SENDER_EMAIL,
    to: email,
    subject: "Gold Price Alert",
    html: emailHtml,
  }));

  try {
    await Promise.all(mailOptions.map(options => transporter.sendMail(options)));
    console.log("Emails sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}


async function checkGoldPrice(res) {
  const currentPrice = await fetchGoldPrice(res);
  if (currentPrice) {
    const currentTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    if (lastGoldPrice === null || currentPrice.sellingPrice !== lastGoldPrice.sellingPrice || currentPrice.purchasingPrice !== lastGoldPrice.purchasingPrice) {
      goldPriceData.push({
        sellingPrice: parseFloat(currentPrice.sellingPrice),
        purchasingPrice: parseFloat(currentPrice.purchasingPrice),
        timestamp: currentTime,
      });

      // If price has changed and we have a previous price, send notification
      if (lastGoldPrice.sellingPrice !== null && lastGoldPrice.purchasingPrice !== null && (currentPrice.sellingPrice !== lastGoldPrice.sellingPrice || currentPrice.purchasingPrice !== lastGoldPrice.purchasingPrice)) {
        await sendNotification(lastGoldPrice, currentPrice);
      }

      lastGoldPrice = currentPrice;
    }
  }
  return currentPrice;
}

async function getLastGoldPrice(res) {
  return await checkGoldPrice(res);
}

function getGoldPriceData() {
  return goldPriceData;
}

cron.schedule(
  "*/10 * * * * *",
  async () => {
    console.log("[Cron] Checking gold price...");
    await checkGoldPrice();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

export { checkGoldPrice, getLastGoldPrice, getGoldPriceData };
