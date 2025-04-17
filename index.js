const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { token } = require("./config");
const { languageKeyboard } = require("./utils/keyboard");
const { askGPT } = require("./features/aiConsultation");
const { saveUserToSheet } = require("./features/saveToSheet");
const fs = require("fs");

require("dotenv").config();

const bot = new TelegramBot(token, { polling: true });
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory user data
const userLang = new Map();
const userState = new Map();
const userData = new Map();

// Language helper
function getText(lang, key) {
  try {
    const texts = JSON.parse(fs.readFileSync(`./i18n/${lang}.json`));
    return texts[key] || "";
  } catch {
    return "";
  }
}

// Show main menu
function sendMainMenu(chatId, lang) {
  const keyboard = {
    keyboard: [
      [
        {
          text: getText(lang, "register_admission"),
          web_app: { url: "https://apply.turin.uz/auth/check-user" },
        },
      ],
      [{ text: getText(lang, "ai_consultation") }],
      [{ text: getText(lang, "faq_btn") }],
    ],
    resize_keyboard: true,
  };

  bot.sendMessage(chatId, getText(lang, "main_menu"), {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
}

// Reset all on /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userLang.delete(chatId);
  userState.delete(chatId);
  userData.delete(chatId);

  bot.sendMessage(
    chatId,
    "🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык / 🇺🇸 Choose your language:",
    { reply_markup: languageKeyboard() }
  );
});

// Main bot logic
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const contact = msg.contact;

  // Language selection
  if (text === "🇺🇿 Uzbek") userLang.set(chatId, "uz");
  if (text === "🇷🇺 Russian") userLang.set(chatId, "ru");
  if (text === "🇺🇸 English") userLang.set(chatId, "en");

  const lang = userLang.get(chatId); // ← now this works after setting

  if (lang && !userState.get(chatId)) {
    bot.sendMessage(chatId, getText(lang, "ask_full_name"), {
      reply_markup: { remove_keyboard: true },
    });
    userState.set(chatId, "awaiting_name");
    return;
  }

  if (userState.get(chatId) === "awaiting_name") {
    userData.set(chatId, { name: text });
    bot.sendMessage(chatId, getText(lang, "ask_phone_number"), {
      reply_markup: {
        keyboard: [[{ text: "📱 Share Phone Number", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    userState.set(chatId, "awaiting_phone");
    return;
  }

  if (userState.get(chatId) === "awaiting_phone") {
    if (contact && contact.phone_number) {
      const data = userData.get(chatId);
      data.phone = contact.phone_number;
      userData.set(chatId, data);
      userState.set(chatId, "main_menu");
      await saveUserToSheet({
        name: data.name,
        phone: data.phone,
        telegramId: chatId,
        lang,
      });
      sendMainMenu(chatId, lang);
    } else {
      bot.sendMessage(chatId, getText(lang, "ask_phone_number"));
    }
    return;
  }

  // AI consultation
  if (
    userState.get(chatId) === "main_menu" &&
    text === getText(lang, "ai_consultation")
  ) {
    const aiKeyboard = {
      keyboard: [[{ text: getText(lang, "faq_back") }]],
      resize_keyboard: true,
    };
    bot.sendMessage(chatId, getText(lang, "ask_question"), {
      reply_markup: aiKeyboard,
    });
    userState.set(chatId, "awaiting_ai_question");
    return;
  }

  if (userState.get(chatId) === "awaiting_ai_question") {
    if (text === getText(lang, "faq_back")) {
      sendMainMenu(chatId, lang);
      userState.set(chatId, "main_menu");
      return;
    }

    bot.sendChatAction(chatId, "typing");
    try {
      const answer = await askGPT(text);
      bot.sendMessage(chatId, answer);
    } catch (err) {
      console.error(err);
      bot.sendMessage(
        chatId,
        "❌ Sorry, something went wrong. Please try again later."
      );
    }
    return;
  }

  // FAQ button logic
  if (text === getText(lang, "faq_btn") && userState.get(chatId) !== "faq") {
    const faqKeyboard = {
      keyboard: [
        [{ text: getText(lang, "faq_faculties") }],
        [{ text: getText(lang, "faq_tuition") }],
        [{ text: getText(lang, "faq_exams") }],
        [{ text: getText(lang, "faq_scholarship") }],
        [{ text: getText(lang, "faq_location") }],
        [{ text: getText(lang, "faq_back") }],
      ],
      resize_keyboard: true,
    };

    bot.sendMessage(chatId, getText(lang, "faq"), {
      reply_markup: faqKeyboard,
    });

    userState.set(chatId, "faq");
    return;
  }

  // Handle FAQ responses
  if (userState.get(chatId) === "faq") {
    switch (text) {
      case getText(lang, "faq_faculties"):
        return bot.sendMessage(chatId, getText(lang, "faq_faculties_text"));
      case getText(lang, "faq_tuition"):
        return bot.sendMessage(chatId, getText(lang, "faq_tuition_text"));
      case getText(lang, "faq_exams"):
        return bot.sendMessage(chatId, getText(lang, "faq_exams_text"));
      case getText(lang, "faq_scholarship"):
        return bot.sendMessage(chatId, getText(lang, "faq_scholarship_text"));
      case getText(lang, "faq_location"):
        return bot.sendMessage(chatId, getText(lang, "faq_location_text"));
      case getText(lang, "faq_back"):
        sendMainMenu(chatId, lang);
        userState.set(chatId, "main_menu");
        return;
      default:
        return bot.sendMessage(chatId, getText(lang, "invalid_option"));
    }
  }
});

// Express health check
app.get("/", (req, res) => {
  res.send("Bot is alive and working! 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});
