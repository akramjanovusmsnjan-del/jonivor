
const $ = id => document.getElementById(id);

const STORAGE_KEY = "mushukcham_save_v1";

const initialState = {
  name: "Momiq",
  coins: 30,
  hunger: 80,
  energy: 85,
  clean: 90,
  happy: 90,
  xp: 0,
  age: 1,
  totalActions: 0,
  sleeping: false,
  lastUpdate: Date.now(),
  lastSaved: Date.now(),
  journal: "Bugun yangi do‘st topdim! 💗",
  inventory: [],
  lastRewardDay: new Date().toDateString()
};

let state = loadState();
let toastTimer;
let lastRender = 0;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...initialState };

    const data = JSON.parse(saved);

    return {
      ...initialState,
      ...data,
      inventory: Array.isArray(data.inventory) ? data.inventory : []
    };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  state.lastSaved = Date.now();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("lastSaved").textContent =
      "Saqlandi: " + new Date(state.lastSaved).toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit"
      });
  } catch {
    showToast("Brauzer ma’lumotni saqlay olmadi.");
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function levelFromXP() {
  return Math.floor(state.xp / 100) + 1;
}

function progressToNextLevel() {
  return state.xp % 100;
}

function ageLabel() {
  if (state.age < 3) return "🐣 Kichkina mushukcha";
  if (state.age < 7) return "🐱 O‘sayotgan mushukcha";
  if (state.age < 14) return "😺 Yosh mushuk";
  return "👑 Voyaga yetgan mushuk";
}

function moodInfo() {
  if (state.sleeping) return { emoji: "😴", text: "Momiq uxlayapti" };
  if (state.hunger < 20) return { emoji: "🥺", text: "Momiq och qoldi" };
  if (state.energy < 15) return { emoji: "🥱", text: "Momiq charchadi" };
  if (state.clean < 20) return { emoji: "🫧", text: "Momiq yuvinishni xohlaydi" };
  if (state.happy < 20) return { emoji: "😿", text: "Momiqning ko‘nglini ko‘tar" };
  if (state.happy > 75 && state.hunger > 50) return { emoji: "🥰", text: "Momiq juda baxtli!" };
  if (state.happy > 45) return { emoji: "😸", text: "Momiqning kayfiyati yaxshi" };
  return { emoji: "🐱", text: "Momiq sen bilan bo‘lishni xohlaydi" };
}

function renderBar(name, value, hint) {
  const rounded = Math.round(clamp(value));
  $(name + "Text").textContent = rounded + "%";
  $(name + "Bar").style.width = rounded + "%";
  $(name + "Hint").textContent = hint;
}

function needHint(value, good, medium, low) {
  if (value > 70) return good;
  if (value > 35) return medium;
  return low;
}

function render() {
  $("coins").textContent = state.coins;
  $("shopCoins").textContent = state.coins;
  $("petName").textContent = state.name;
  $("petAge").textContent = `🐣 ${state.age}-kun · ${ageLabel()}`;
  $("level").textContent = levelFromXP();
  $("xp").textContent = state.xp;

  const progress = progressToNextLevel();
  $("xpBar").style.width = progress + "%";
  $("xpCaption").textContent =
    `${100 - progress} tajriba kerak — keyingi darajaga`;

  renderBar("hunger", state.hunger,
    needHint(state.hunger, "Qorni to‘q", "Biroz ochdi", "Ovqat kerak!"));

  renderBar("energy", state.energy,
    needHint(state.energy, "Quvvati yetarli", "Dam olishi kerak", "Juda charchagan"));

  renderBar("clean", state.clean,
    needHint(state.clean, "Juda toza", "Biroz kirlangan", "Yuvinish vaqti!"));

  renderBar("happy", state.happy,
    needHint(state.happy, "Juda baxtli", "O‘ynagisi kelyapti", "Mehr ber!"));

  const mood = moodInfo();
  $("moodEmoji").textContent = mood.emoji;
  $("moodText").textContent = mood.text;
  $("petEmoji").textContent = state.age >= 14 ? "😺" : "🐱";
  $("pet").setAttribute("aria-label", state.name + " mushukcha");
  $("sleepZ").classList.toggle("hidden", !state.sleeping);
  $("sleepLabel").textContent = state.sleeping ? "Uyg‘otish" : "Uxlatish";

  $("petEmotion").textContent = state.sleeping
    ? "💤"
    : state.happy > 70
      ? "♥"
      : state.happy < 25
        ? "…"
        : "♡";

  $("journalText").textContent = state.journal;

  document.querySelectorAll("[data-action]").forEach(button => {
    const action = button.dataset.action;

    if (state.sleeping && action !== "sleep") {
      button.classList.add("is-disabled");
      button.style.opacity = "0.55";
    } else {
      button.classList.remove("is-disabled");
      button.style.opacity = "1";
    }
  });

  document.querySelectorAll("[data-buy]").forEach(button => {
    const price = getItem(button.dataset.buy).price;
    button.disabled = state.coins < price;
    button.style.opacity = button.disabled ? "0.5" : "1";
  });
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function animatePet(animation, duration = 1800) {
  const pet = $("pet");

  pet.classList.remove(
    "happy", "playing", "eating", "bathing", "growing"
  );

  // Animatsiyani qayta boshlash.
  void pet.offsetWidth;
  pet.classList.add(animation);

  setTimeout(() => pet.classList.remove(animation), duration);
}

function speak(message) {
  $("speech").textContent = message;
}

function addXP(amount) {
  const oldLevel = levelFromXP();

  state.xp += amount;

  const newLevel = levelFromXP();

  if (newLevel > oldLevel) {
    state.age += 1;
    state.coins += 10;
    animatePet("growing", 1000);
    showToast("🎉 Momiq ulg‘aydi! +10 tanga");
    speak("Miyov! Men katta bo‘lyapman! 😻");
  }
}

function updateJournal(message) {
  state.journal = message;
}

function spendCoins(amount) {
  if (state.coins < amount) {
    showToast("Tangalaring yetarli emas! 🪙");
    return false;
  }

  state.coins -= amount;
  return true;
}

function performAction(action) {
  if (state.sleeping && action !== "sleep") {
    showToast("Momiq uxlayapti. Avval uyg‘ot! 😴");
    return;
  }

  switch (action) {
    case "feed":
      if (!spendCoins(5)) return;

      if (state.hunger >= 95) {
        state.coins += 5;
        showToast("Momiqning qorni to‘q-ku! 💗");
        return;
      }

      state.hunger = clamp(state.hunger + 30);
      state.happy = clamp(state.happy + 8);
      state.energy = clamp(state.energy + 5);
      addXP(10);
      state.totalActions++;

      animatePet("eating");
      speak("Miyov-miyov! Mazali ekan! 😋");
      updateJournal("Bugun Momiqqa mazali ovqat berding. 🍗");
      showToast("Momiq ovqatlandi! 🍗");
      break;

    case "play":
      if (state.energy < 15) {
        showToast("Momiq juda charchagan. Avval uxlat! 😴");
        return;
      }

      state.energy = clamp(state.energy - 18);
      state.hunger = clamp(state.hunger - 8);
      state.clean = clamp(state.clean - 5);
      state.happy = clamp(state.happy + 25);
      state.coins += 8;
      addXP(15);
      state.totalActions++;

      animatePet("playing", 2400);
      speak("To‘pni tut! Miyov! 🎾");
      updateJournal("Momiq bilan maza qilib o‘ynading! 🎾");
      showToast("Birga o‘ynadingiz! +8 tanga 🪙");
      break;

    case "bath":
      if (state.clean >= 95) {
        showToast("Momiq allaqachon toza! 🫧");
        return;
      }

      state.clean = clamp(state.clean + 40);
      state.happy = clamp(state.happy - 2);
      state.totalActions++;
      addXP(8);

      animatePet("bathing", 1800);
      speak("Miyov! Endi juda tozaman! 🫧");
      updateJournal("Bugun Momiqni yuvintirding. 🛁");
      showToast("Momiq tozalandi! 🫧");
      break;

    case "sleep":
      state.sleeping = !state.sleeping;

      if (state.sleeping) {
        speak("Xayrli tun... miyov... 💤");
        updateJournal("Momiq shirin tushlar ko‘ryapti. 🌙");
        showToast("Momiq uxlab qoldi. 🌙");
      } else {
        speak("Miyov! Uyg‘ondim! 💗");
        updateJournal("Momiq uyg‘ondi va yana o‘ynashga tayyor!");
        showToast("Momiq uyg‘ondi! ☀️");
      }

      break;
  }

  render();
  saveState();
}

const shopItems = {
  yarn: {
    name: "Ip koptok",
    price: 15,
    happiness: 15,
    emoji: "🧶"
  },
  teddy: {
    name: "Yumshoq ayiqcha",
    price: 30,
    happiness: 25,
    emoji: "🧸"
  },
  crown: {
    name: "Oltin toj",
    price: 50,
    happiness: 40,
    emoji: "👑"
  }
};

function getItem(key) {
  return shopItems[key];
}

function buyItem(key) {
  if (state.sleeping) {
    showToast("Momiq uxlayapti. Uyg‘ongach xarid qil! 😴");
    return;
  }

  const item = getItem(key);
  if (!item) return;

  if (!spendCoins(item.price)) return;

  state.happy = clamp(state.happy + item.happiness);
  state.inventory.push(key);
  addXP(10);
  state.totalActions++;

  animatePet("happy", 2000);
  speak(`${item.emoji} Voy, yangi ${item.name}! Rahmat! 💗`);
  updateJournal(`Momiqqa ${item.name} sovg‘a qilding! ${item.emoji}`);
  showToast(`${item.name} sotib olindi! 🎁`);

  render();
  saveState();
}

function renamePet() {
  const answer = prompt("Mushukchangga qanday ism qo‘yamiz?", state.name);

  if (answer === null) return;

  const name = answer.trim().slice(0, 20);

  if (!name) {
    showToast("Ism bo‘sh bo‘lmasin! 🐱");
    return;
  }

  state.name = name;
  speak(`Miyov! Endi mening ismim ${name}! 💗`);
  updateJournal(`Mening ismim ${name}. Yangi sarguzashtlar boshlanmoqda!`);
  render();
  saveState();
  showToast(`Yangi ism: ${name} 🐾`);
}

function tick() {
  const now = Date.now();
  const elapsedSeconds = Math.max(
    0,
    Math.min((now - state.lastUpdate) / 1000, 60 * 60 * 24 * 7)
  );

  state.lastUpdate = now;

  // Vaqt o‘tishi bilan ehtiyojlar asta-sekin o‘zgaradi.
  // Uxlayotganda quvvati tiklanadi.
  const minutes = elapsedSeconds / 60;

  if (state.sleeping) {
    state.energy = clamp(state.energy + minutes * 2.5);
    state.hunger = clamp(state.hunger - minutes * 0.25);
    state.clean = clamp(state.clean - minutes * 0.08);

    if (state.energy >= 100) {
      state.sleeping = false;
      speak("Miyov! Yaxshi uxladim, endi o‘ynaymiz! ☀️");
      showToast("Momiq dam olib bo‘ldi! ☀️");
    }
  } else {
    state.hunger = clamp(state.hunger - minutes * 0.18);
    state.energy = clamp(state.energy - minutes * 0.12);
    state.clean = clamp(state.clean - minutes * 0.10);

    if (state.hunger < 30 || state.energy < 20 || state.clean < 20) {
      state.happy = clamp(state.happy - minutes * 0.12);
    } else {
      state.happy = clamp(state.happy - minutes * 0.025);
    }
  }

  // Kunlik kichik mukofot: bir kunda faqat bir marta.
  const today = new Date().toDateString();

  if (state.lastRewardDay !== today) {
    state.lastRewardDay = today;
    state.coins += 10;
    showToast("🎁 Yangi kun! +10 tanga");
  }

  render();
  saveState();
}

function resetGame() {
  const confirmed = confirm(
    "Momiqning barcha ma’lumotlarini o‘chirib, yangidan boshlamoqchimisiz?"
  );

  if (!confirmed) return;

  state = { ...initialState, lastUpdate: Date.now(), lastSaved: Date.now() };

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keyingi saqlashda yana uriniladi.
  }

  speak("Miyov! Yangi hayotimiz boshlandi! 💗");
  render();
  saveState();
  showToast("Yangi sarguzasht boshlandi! 🐾");
}

// Tugmalar
document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    performAction(button.dataset.action);
  });
});

document.querySelectorAll("[data-buy]").forEach(button => {
  button.addEventListener("click", () => {
    buyItem(button.dataset.buy);
  });
});

$("renameBtn").addEventListener("click", renamePet);
$("resetBtn").addEventListener("click", resetGame);

// Sahifa yopilishidan oldin saqlash.
window.addEventListener("pagehide", saveState);

// Har soniyada holatni yangilash.
setInterval(() => {
  tick();
}, 1000);

// Brauzerda oldindan saqlangan holatni yuklash.
tick();
render();
