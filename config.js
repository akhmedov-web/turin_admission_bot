require('dotenv').config();

module.exports = {
  token: process.env.BOT_TOKEN,
  defaultLang: 'uz',
  supportedLangs: ['uz', 'ru', 'en']
};