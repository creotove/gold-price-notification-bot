# Gold Price Notification Bot

This project is a Node.js bot that checks the gold price in City provided in the env file using Puppeteer and sends email notifications if the price changes. The notifications are sent to multiple recipients via email using Nodemailer.

## Features

- Fetches the current gold price in City provided in the env file using Puppeteer.
- Compares the fetched price with the last known price.
- Sends email notifications to multiple recipients when the price changes.
- Uses Cron to schedule price checks every hour.

## Prerequisites

- Node.js installed on your machine.
- A Gmail account for sending emails.
- Environment variables set up for email credentials and recipient email addresses.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/creotove/gold-price-notification-bot.git
   cd gold-price-notification-bot
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following variables:

   ```plaintext
   SENDER_EMAIL=your_sender_email@gmail.com
   SENDER_EMAIL_PASSWORD=your_sender_email_password
   RECIPIENT_EMAIL_ONE=recipient_one@gmail.com
   RECIPIENT_EMAIL_TWO=recipient_two@gmail.com
   ```

4. Update the `goldPriceUrl` in the `bot.js` file if you need to check the gold price for a different location.

## Usage

1. Run the bot:

   ```bash
   npm run start
   ```

   The bot will check the gold price every hour and send email notifications to the specified recipients if the price changes.

## Project Structure

- `index.js`: Main script file containing the logic for fetching gold prices and sending email notifications.
- `package.json`: Project configuration and dependencies.
- `.env`: Environment variables for email credentials and recipient email addresses (not included in the repository, create it manually).

## Dependencies

- `puppeteer`: Used for web scraping to fetch gold prices.
- `nodemailer`: Used for sending email notifications.
- `node-cron`: Used for scheduling periodic checks of the gold price.

## Acknowledgements

- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [Nodemailer](https://nodemailer.com/about/)
- [Node-Cron](https://github.com/node-cron/node-cron)

---

Feel free to customize this README file further according to your specific project details.
