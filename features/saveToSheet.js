const { google } = require("googleapis");
const credentials = process.env.GOOGLE_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : require('../credentials/your-file.json');

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });

const SHEET_ID = "1UP891j2nLhNKV1NduUlP1qWPfofwzwt3rr7QcKOX6AU"; // Replace with your real Google Sheet ID

async function saveUserToSheet({ name, phone, telegramId, lang }) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const today = new Date().toLocaleString();

  // 🧠 Normalize phone number
  let localPhone = phone;
  if (phone.startsWith('+998')) {
    localPhone = phone.slice(4);
  } else if (phone.startsWith('998')) {
    localPhone = phone.slice(3);
  }

  const values = [[name, localPhone, telegramId, lang, today]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'A1',
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });
}


module.exports = { saveUserToSheet };
