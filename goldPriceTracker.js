const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { chromium } = require('playwright');
require('dotenv').config();

// Email credentials
const senderEmail = process.env.SENDER_EMAIL;
const senderPassword = process.env.SENDER_PASSWORD;
const recipientUsers = [process.env.RECIPIENT_EMAIL_ONE, process.env.RECIPIENT_EMAIL_TWO];

// Function to fetch the current gold price using Puppeteer
async function fetchGoldPrice() {
    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(goldPriceUrl, { waitUntil: 'networkidle' });

        // Use the appropriate selector to get the gold price from the search result
        const goldPrice = await page.$eval('.LEcS3c .vlzY6d span:first-child', el => parseFloat(el.textContent.replace(/[^\d.-]/g, '')));

        await browser.close();
        console.log('Gold price fetched:', goldPrice);
        return goldPrice;
    } catch (error) {
        console.error('Error fetching gold price:', error);
        if (browser) await browser.close();
        return null;
    }
}
// Function to send email notification with a styled template
async function sendNotification(lastPrice, currentPrice) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: senderPassword
        }
    });

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="text-align: center; color: #333;">Gold Price Alert</h2>
        <p style="font-size: 16px; color: #555;">The gold price has changed in ${process.env.CITY}.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Previous Price</th>
                    <th style="padding: 10px; background: #f4f4f4; border: 1px solid #ddd; text-align: left;">Current Price</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${lastPrice.toLocaleString('en-IN')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${currentPrice.toLocaleString('en-IN')}</td>
                </tr>
            </tbody>
        </table>
        <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">Notification generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    `;

    const mailOptions = recipientUsers.map(email => ({
        from: senderEmail,
        to: email,
        subject: 'Gold Price Alert',
        html: emailHtml
    }));

    try {
        for (let options of mailOptions) {
            await transporter.sendMail(options);
            console.log(`Email sent to ${options.to}`);
        }
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
// Google search URL for gold price in Ahmedabad
const goldPriceUrl = `https://www.google.com/search?q=gold+price+today+${process.env.CITY}`;

// Initial gold price
let lastGoldPrice = null;

// Function to check for gold price change
async function checkGoldPrice() {
    const currentPrice = await fetchGoldPrice();
    if (currentPrice && lastGoldPrice !== null && currentPrice !== lastGoldPrice) {
        sendNotification(lastGoldPrice, currentPrice);
    }
    lastGoldPrice = currentPrice;
    return currentPrice;
}

// Function to get the last fetched gold price
function getLastGoldPrice() {
    return lastGoldPrice;
}

// Schedule the bot to check the gold price every 10 minutes
cron.schedule('*/10 * * * *', () => {
    console.log('Checking gold price...');
    checkGoldPrice();
});

module.exports = { checkGoldPrice, getLastGoldPrice };