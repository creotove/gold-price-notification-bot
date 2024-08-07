import nodemailer from "nodemailer";
import cron from "node-cron";
import fetch from "node-fetch";
import {JSDOM} from "jsdom";
import dotenv from "dotenv";

dotenv.config();

const {SENDER_EMAIL, SENDER_PASSWORD, RECIPIENT_EMAIL_ONE, RECIPIENT_EMAIL_TWO, CITY} = process.env;
const recipientUsers = [RECIPIENT_EMAIL_ONE, RECIPIENT_EMAIL_TWO];

let goldPriceData = [];

async function fetchGoldPrice() {
  const goldPriceUrl = `https://www.google.com/search?q=gold+price+today+${CITY}&rlz=1C1RXQR_enIN1117IN1117&oq=g&gs_lcrp=EgZjaHJvbWUqBggCEEUYOzIGCAAQRRg8MgYIARBFGDwyBggCEEUYOzIGCAMQRRg8MgYIBBBFGDMyBggFEEUYPDIGCAYQRRg8MgYIBxBFGDzSAQg0Mzc5ajBqN6gCALACAA&sourceid=chrome&ie=UTF-8`;
  try {
    const response = await fetch(goldPriceUrl);
    const html = await response.text();
    const dom = new JSDOM(html);
    const goldPriceElement = dom.window.document.querySelector("a .BNeawe.deIvCb.AP7Wnd");
    const goldPrice = goldPriceElement?.textContent ?? null;
    const priceMatch = goldPrice?.match(/(\d{1,3}(,\d{3})*)\s*INR/);
    return priceMatch?.[1] ?? null;
  } catch (error) {
    return res.status(500).json({error: "Error fetching gold price", message: error.message, succes: false});
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
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Previous Price</th>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Current Price</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${lastPrice.toLocaleString("en-IN")}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${currentPrice.toLocaleString("en-IN")}</td>
                </tr>
            </tbody>
        </table>
        <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">Notification generated at ${new Date().toLocaleString("en-IN", {timeZone: "Asia/Kolkata"})}</p>
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

let lastGoldPrice = null;

async function checkGoldPrice(res) {
  const currentPrice = await fetchGoldPrice(res);
  if (currentPrice) {
    const currentTime = new Date().toLocaleString("en-IN", {timeZone: "Asia/Kolkata"});

    if (lastGoldPrice === null || currentPrice !== lastGoldPrice) {
      // Add new data point
      goldPriceData.push({
        price: parseFloat(currentPrice.replace(/,/g, "")),
        timestamp: currentTime,
      });

      // If price has changed and we have a previous price, send notification
      if (lastGoldPrice !== null && currentPrice !== lastGoldPrice) {
        await sendNotification(lastGoldPrice, currentPrice);
      }

      lastGoldPrice = currentPrice;
      console.log(`Gold price updated: ₹${currentPrice} at ${currentTime}`);
    }
  }
  return currentPrice;
}

async function getLastGoldPrice(res) {
  return await checkGoldPrice(res);
}

// New function to get all gold price data
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

export {checkGoldPrice, getLastGoldPrice, getGoldPriceData};
