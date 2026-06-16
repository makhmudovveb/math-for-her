const MOKKY_URL = "https://d9d7ebd7cf0cd0bb.mokky.dev/questions";
const PROGRESS_URL = getSiblingResourceUrl(MOKKY_URL, "progress");
const USERS_URL = getSiblingResourceUrl(MOKKY_URL, "users");
const PROFILE_STORAGE_KEY = "math-quiz-profile-name";
const ADMIN_PASSWORD = "dinozavrik";
const QUEEN_PASSWORD = "я обязательно поступлю";

const defaultUsers = {
  dinozavrik: {
    username: "dinozavrik",
    label: "dinozavrik",
    password: ADMIN_PASSWORD,
    isAdmin: true,
  },
  "мендальноглазая": {
    username: "мендальноглазая",
    label: "Мендальноглазая",
    password: QUEEN_PASSWORD,
    isAdmin: false,
  },
};

const demoQuestions = [
  {
    id: "demo-1",
    question: "Сколько будет 12 x 8?",
    topic: "30 день",
    imageUrl: "",
    options: ["86", "96", "108", "92"],
    correctIndex: 1,
  },
  {
    id: "demo-2",
    question: "Реши: 45 + 27",
    topic: "30 день",
    imageUrl: "",
    options: ["62", "72", "74", "82"],
    correctIndex: 1,
  },
];

const state = {
  questions: [],
  users: [],
  activeTopic: "",
  manageTopic: "",
  manageTopicOpen: false,
  profile: null,
  profileLabel: "",
  isAdmin: false,
  adminUnlocked: false,
  progressId: null,
  solved: {},
  answers: {},
  checked: {},
  revealed: {},
  pendingImageData: "",
  pendingExplanationImageData: "",
  editingQuestionId: null,
  timerSeconds: 0,
  timerId: null,
  authMode: "login",
};

const els = {
  status: document.querySelector("#status"),
  profileBadge: document.querySelector("#profileBadge"),
  profileName: document.querySelector("#profileName"),
  resetProfileBtn: document.querySelector("#resetProfileBtn"),
  profilePanel: document.querySelector("#profilePanel"),
  profileForm: document.querySelector("#profileForm"),
  nicknameInput: document.querySelector("#nicknameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  passwordToggle: document.querySelector("#passwordToggle"),
  usernameStatus: document.querySelector("#usernameStatus"),
  authModeBtns: document.querySelectorAll("[data-auth-mode]"),
  profileNote: document.querySelector("#profileNote"),
  quickNameBtns: document.querySelectorAll("[data-name]"),
  tabs: document.querySelectorAll(".tab"),
  quizView: document.querySelector("#quizView"),
  manageView: document.querySelector("#manageView"),
  usersView: document.querySelector("#usersView"),
  questionCount: document.querySelector("#questionCount"),
  topicList: document.querySelector("#topicList"),
  totalProgress: document.querySelector("#totalProgress"),
  encourageText: document.querySelector("#encourageText"),
  resetProgressBtn: document.querySelector("#resetProgressBtn"),
  questionButtons: document.querySelector("#questionButtons"),
  variantTitle: document.querySelector("#variantTitle"),
  variantSummary: document.querySelector("#variantSummary"),
  topicQuestions: document.querySelector("#topicQuestions"),
  checkVariantBtn: document.querySelector("#checkVariantBtn"),
  timerValue: document.querySelector("#timerValue"),
  timerBtn: document.querySelector("#timerBtn"),
  resetTimerBtn: document.querySelector("#resetTimerBtn"),
  form: document.querySelector("#questionForm"),
  formTitle: document.querySelector("#formTitle"),
  saveQuestionBtn: document.querySelector("#saveQuestionBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  questionInput: document.querySelector("#questionInput"),
  topicInput: document.querySelector("#topicInput"),
  explanationInput: document.querySelector("#explanationInput"),
  imageUrlInput: document.querySelector("#imageUrlInput"),
  imageFileInput: document.querySelector("#imageFileInput"),
  imagePreviewWrap: document.querySelector("#imagePreviewWrap"),
  imagePreview: document.querySelector("#imagePreview"),
  clearImageBtn: document.querySelector("#clearImageBtn"),
  explanationImageUrlInput: document.querySelector("#explanationImageUrlInput"),
  explanationImageFileInput: document.querySelector("#explanationImageFileInput"),
  explanationImagePreviewWrap: document.querySelector("#explanationImagePreviewWrap"),
  explanationImagePreview: document.querySelector("#explanationImagePreview"),
  clearExplanationImageBtn: document.querySelector("#clearExplanationImageBtn"),
  optionInputs: document.querySelectorAll(".option-input"),
  correctInput: document.querySelector("#correctInput"),
  refreshBtn: document.querySelector("#refreshBtn"),
  refreshUsersBtn: document.querySelector("#refreshUsersBtn"),
  usersList: document.querySelector("#usersList"),
  manageTopicList: document.querySelector("#manageTopicList"),
  libraryList: document.querySelector("#libraryList"),
  solutionModal: document.querySelector("#solutionModal"),
  closeSolutionBtn: document.querySelector("#closeSolutionBtn"),
  solutionTitle: document.querySelector("#solutionTitle"),
  solutionContent: document.querySelector("#solutionContent"),
};

const letters = ["A", "B", "C", "D"];
const apiEnabled = MOKKY_URL.trim().length > 0;
let solutionCloseTimer = null;

init();

function init() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  els.profileForm.addEventListener("submit", handleProfile);
  els.passwordToggle.addEventListener("click", togglePasswordVisibility);
  els.resetProfileBtn.addEventListener("click", resetProfile);
  els.resetProgressBtn.addEventListener("click", resetProgress);
  els.authModeBtns.forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });
  els.nicknameInput.addEventListener("input", debounce(checkUsernameAvailability, 350));
  els.quickNameBtns.forEach((button) => {
    button.addEventListener("click", () => {
      els.nicknameInput.value = button.dataset.name;
      els.passwordInput.focus();
      checkUsernameAvailability();
    });
  });
  els.checkVariantBtn.addEventListener("click", checkVariant);
  els.timerBtn.addEventListener("click", toggleTimer);
  els.resetTimerBtn.addEventListener("click", resetTimer);
  els.refreshBtn.addEventListener("click", loadQuestions);
  els.refreshUsersBtn.addEventListener("click", loadUsers);
  els.form.addEventListener("submit", handleCreate);
  els.cancelEditBtn.addEventListener("click", cancelEdit);
  if (els.closeSolutionBtn && els.solutionModal) {
    els.closeSolutionBtn.addEventListener("click", closeSolutionModal);
    els.solutionModal.querySelectorAll("[data-close-modal]").forEach((node) => {
      node.addEventListener("click", closeSolutionModal);
    });
  }
  els.imageUrlInput.addEventListener("input", updateImagePreviewFromUrl);
  els.imageFileInput.addEventListener("change", handleImageFile);
  els.clearImageBtn.addEventListener("click", clearImage);
  els.explanationImageUrlInput.addEventListener("input", updateExplanationImagePreviewFromUrl);
  els.explanationImageFileInput.addEventListener("change", handleExplanationImageFile);
  els.clearExplanationImageBtn.addEventListener("click", clearExplanationImage);

  loadQuestions();
  loadSavedProfile();
}

async function loadQuestions() {
  setStatus("Загружаю задания...");

  try {
    const questions = apiEnabled ? await request(MOKKY_URL) : [...demoQuestions];
    state.questions = normalizeCollection(questions);
    syncActiveTopic();
    syncManageTopic();
    setStatus(
      apiEnabled
        ? "Задания загружены из Mokky API."
        : "Демо-режим: вставь ссылку Mokky API в script.js, чтобы сохранять задания."
    );
  } catch (error) {
    state.questions = [...demoQuestions];
    syncActiveTopic();
    syncManageTopic();
    setStatus(`API пока недоступен, показываю демо-задания. ${error.message}`);
  }

  render();
}

async function loadUsers() {
  if (!state.isAdmin) {
    return;
  }

  const fallbackUsers = Object.values(defaultUsers);

  if (!apiEnabled) {
    state.users = fallbackUsers;
    renderUsers();
    return;
  }

  try {
    const users = normalizeCollection(await request(USERS_URL));
    const userMap = new Map();

    [...fallbackUsers, ...users].forEach((user) => {
      const username = normalizeNickname(user.username || "");

      if (!username) {
        return;
      }

      userMap.set(username, {
        ...user,
        username,
        label: user.label || getProfileLabel(username),
        isAdmin: Boolean(user.isAdmin || isAdminName(username)),
      });
    });

    state.users = [...userMap.values()].sort((a, b) => a.username.localeCompare(b.username));
    renderUsers();
    setStatus("Список пользователей обновлен.");
  } catch (error) {
    state.users = fallbackUsers;
    renderUsers();
    setStatus("Не удалось загрузить users из Mokky. Показываю встроенных пользователей.");
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Ошибка API: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function debounce(callback, delay = 300) {
  let timerId;

  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
}

function switchView(viewName) {
  if ((viewName === "manage" || viewName === "users") && !canOpenManage()) {
    return;
  }

  els.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });

  els.quizView.classList.toggle("is-visible", viewName === "quiz");
  els.manageView.classList.toggle("is-visible", viewName === "manage");
  els.usersView.classList.toggle("is-visible", viewName === "users");

  if (viewName === "users") {
    loadUsers();
  }
}

async function handleProfile(event) {
  event.preventDefault();

  const nickname = els.nicknameInput.value.trim();
  const password = els.passwordInput.value;

  if (!nickname) {
    setStatus("Введи логин.");
    return;
  }

  if (!password) {
    setStatus("Введи пароль.");
    return;
  }

  const user = state.authMode === "register"
    ? await registerUser(nickname, password)
    : await loginUser(nickname, password);

  if (!user) {
    return;
  }

  applyUser(user);
  localStorage.setItem(PROFILE_STORAGE_KEY, user.username);
  await loadProgress();
  render();
}

async function loadSavedProfile() {
  const savedName = localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!savedName) {
    return;
  }

  applyUser(getDefaultOrStoredUser(savedName));
  await loadProgress();
  render();
}

function applyUser(user) {
  state.profile = normalizeNickname(user.username);
  state.profileLabel = user.label || getProfileLabel(user.username);
  state.isAdmin = Boolean(user.isAdmin || isAdminName(user.username));
  state.adminUnlocked = false;
}

async function loginUser(name, password) {
  const username = normalizeNickname(name);
  const user = await findUser(username);

  if (!user) {
    setStatus("Такого логина нет. Можно зарегистрироваться.");
    return null;
  }

  if (user.password !== password) {
    setStatus("Пароль не подошел.");
    return null;
  }

  setStatus("Вход выполнен.");
  return user;
}

async function registerUser(name, password) {
  const username = normalizeNickname(name);

  if (!username) {
    setStatus("Введи логин.");
    return null;
  }

  if (password.length < 3) {
    setStatus("Пароль слишком короткий.");
    return null;
  }

  const existing = await findUser(username);

  if (existing) {
    setStatus("Такой логин уже занят.");
    return null;
  }

  const user = {
    username,
    label: getProfileLabel(username),
    password,
    isAdmin: isAdminName(username),
    createdAt: new Date().toISOString(),
  };

  if (!apiEnabled) {
    setStatus("Регистрация требует Mokky API.");
    return null;
  }

  try {
    const created = await request(USERS_URL, {
      method: "POST",
      body: JSON.stringify(user),
    });
    setStatus("Регистрация готова.");
    return created;
  } catch (error) {
    setStatus("Не удалось зарегистрировать пользователя. Создай ресурс users в Mokky.");
    return null;
  }
}

async function findUser(username) {
  const defaultUser = defaultUsers[username];

  if (!apiEnabled) {
    return defaultUser || null;
  }

  try {
    const users = await request(`${USERS_URL}?username=${encodeURIComponent(username)}`);
    return Array.isArray(users) && users[0] ? users[0] : defaultUser || null;
  } catch (error) {
    return defaultUser || null;
  }
}

function getDefaultOrStoredUser(name) {
  const username = normalizeNickname(name);
  return defaultUsers[username] || {
    username,
    label: getProfileLabel(username),
    password: "",
    isAdmin: isAdminName(username),
  };
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.authModeBtns.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === mode);
  });
  els.passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";
  els.usernameStatus.textContent = "";
  checkUsernameAvailability();
}

function togglePasswordVisibility() {
  const shouldShow = els.passwordInput.type === "password";
  els.passwordInput.type = shouldShow ? "text" : "password";
  els.passwordToggle.textContent = shouldShow ? "Скрыть" : "Показать";
  els.passwordToggle.setAttribute("aria-label", shouldShow ? "Скрыть пароль" : "Показать пароль");
  els.passwordToggle.setAttribute("aria-pressed", String(shouldShow));
}

async function checkUsernameAvailability() {
  const username = normalizeNickname(els.nicknameInput.value);

  if (!username || state.authMode !== "register") {
    els.usernameStatus.textContent = "";
    return;
  }

  const existing = await findUser(username);
  els.usernameStatus.textContent = existing ? "Такой логин уже существует." : "Логин свободен.";
}

async function loadProgress() {
  state.solved = {};
  state.progressId = null;

  if (!apiEnabled || !state.profile) {
    renderProfile();
    return;
  }

  try {
    const records = await request(`${PROGRESS_URL}?nickname=${encodeURIComponent(state.profile)}`);
    const record = Array.isArray(records) ? records[0] : null;

    if (record) {
      state.progressId = record.id;
      state.solved = record.solved || {};
    } else {
      const created = await request(PROGRESS_URL, {
        method: "POST",
        body: JSON.stringify({
          nickname: state.profile,
          solved: {},
          createdAt: new Date().toISOString(),
        }),
      });
      state.progressId = created.id;
    }

    renderProfile();
    setStatus("Прогресс загружен. Можно спокойно решать дальше.");
  } catch (error) {
    renderProfile();
    setStatus("Не удалось загрузить прогресс. Проверь, создан ли ресурс progress в Mokky.");
  }
}

function render() {
  renderProfile();
  renderProgress();
  renderQuestionButtons();
  renderVariant();
  renderLibrary();
  renderUsers();
  typesetMath();
}

function renderProfile() {
  const ready = Boolean(state.profile);
  els.profilePanel.classList.toggle("is-ready", ready);
  els.profileBadge.classList.toggle("is-hidden", !ready);
  document.body.classList.toggle("has-profile", ready);

  if (ready) {
    els.profileName.textContent = state.isAdmin
      ? `${state.profileLabel} | админ`
      : state.profileLabel;
  }

  document.body.classList.toggle("is-admin", state.isAdmin);

  if (!state.isAdmin && (els.manageView.classList.contains("is-visible") || els.usersView.classList.contains("is-visible"))) {
    switchView("quiz");
  }
}

function resetProfile() {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  state.profile = null;
  state.profileLabel = "";
  state.isAdmin = false;
  state.adminUnlocked = false;
  state.progressId = null;
  state.solved = {};
  els.nicknameInput.value = "";
  els.passwordInput.value = "";
  render();
}

async function resetProgress() {
  if (!state.profile) {
    setStatus("Сначала выбери профиль.");
    return;
  }

  const confirmed = window.confirm("Сбросить результат для текущего профиля?");

  if (!confirmed) {
    return;
  }

  state.solved = {};
  state.answers = {};
  state.checked = {};
  state.revealed = {};

  if (apiEnabled && state.progressId) {
    try {
      await request(`${PROGRESS_URL}/${state.progressId}`, {
        method: "PATCH",
        body: JSON.stringify({
          solved: {},
          updatedAt: new Date().toISOString(),
        }),
      });
      setStatus("Результат сброшен.");
    } catch (error) {
      setStatus("Не удалось сбросить результат. Проверь ресурс progress.");
    }
  } else {
    setStatus("Результат сброшен на этом экране.");
  }

  render();
}

function renderProgress() {
  const topics = getTopicProgress();
  const solvedTotal = state.questions.filter((question) => isQuestionSolved(question.id)).length;

  els.totalProgress.textContent = `${solvedTotal}/${state.questions.length}`;
  els.encourageText.textContent = getEncourageText(topics, solvedTotal);
  els.topicList.innerHTML = "";

  topics.forEach((topic) => {
    const percent = topic.total === 0 ? 0 : Math.round((topic.solved / topic.total) * 100);
    const card = document.createElement("button");
    card.type = "button";
    card.className = [
      "topic-card",
      topic.name === state.activeTopic ? "is-active" : "",
      topic.solved === topic.total ? "is-done" : "",
    ].filter(Boolean).join(" ");
    card.innerHTML = `
      <div class="topic-row">
        <span class="topic-title">${escapeHtml(topic.name)}</span>
        <span class="topic-badge">${topic.solved === topic.total ? "✓" : `${topic.solved}/${topic.total}`}</span>
      </div>
      <div class="topic-meter" aria-hidden="true"><span style="width: ${percent}%"></span></div>
    `;
    card.addEventListener("click", () => selectTopic(topic.name));
    els.topicList.append(card);
  });
}

function renderQuestionButtons() {
  const questions = getActiveTopicQuestions();
  els.questionCount.textContent = String(questions.length);
  els.questionButtons.innerHTML = "";

  questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = [
      "question-chip",
      isQuestionSolved(question.id) ? "is-solved" : "",
    ].filter(Boolean).join(" ");
    button.type = "button";
    button.textContent = `${isQuestionSolved(question.id) ? "✓ " : ""}${index + 1}. Вопрос`;
    button.addEventListener("click", () => {
      document.querySelector(`#question-${cssEscape(question.id)}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    els.questionButtons.append(button);
  });
}

function renderVariant() {
  const questions = getActiveTopicQuestions();
  const solved = questions.filter((question) => isQuestionSolved(question.id)).length;

  els.variantTitle.textContent = state.activeTopic || "Выбери день";
  els.variantSummary.textContent = questions.length
    ? `В этом варианте ${questions.length} вопросов. Решено правильно: ${solved}/${questions.length}.`
    : "В этом дне пока нет вопросов.";
  els.checkVariantBtn.disabled = questions.length === 0;
  els.topicQuestions.innerHTML = "";

  questions.slice(0, 10).forEach((question, index) => {
    els.topicQuestions.append(renderQuestionCard(question, index));
  });

  typesetMath(els.topicQuestions);
}

function renderQuestionCard(question, index) {
  const card = document.createElement("section");
  card.className = [
    "question-card",
    isQuestionSolved(question.id) ? "is-solved" : "",
  ].filter(Boolean).join(" ");
  card.id = `question-${question.id}`;

  const imageMarkup = question.imageUrl
    ? `<figure class="question-image"><img src="${escapeAttribute(question.imageUrl)}" alt="Изображение к вопросу ${index + 1}" loading="lazy" /></figure>`
    : "";

  const optionsMarkup = question.options
    .map((option, optionIndex) => renderOption(question, option, optionIndex))
    .join("");

  const resultMarkup = renderQuestionResult(question);
  const helpMarkup = question.explanation
    ? `<div class="question-tools"><button class="help-btn" type="button" data-explain="${escapeAttribute(question.id)}" title="Показать объяснение">?</button></div>`
    : "";

  card.innerHTML = `
    <div class="question-meta">
      <span>Вопрос ${index + 1}</span>
      <span>${escapeHtml(question.topic || "Математика")}</span>
    </div>
    ${helpMarkup}
    <h3>${escapeHtml(question.question)}</h3>
    ${imageMarkup}
    <div class="options">${optionsMarkup}</div>
    ${resultMarkup}
  `;

  card.querySelectorAll(".option").forEach((button) => {
    button.addEventListener("click", () => selectAnswer(question.id, Number(button.dataset.option)));
  });

  const revealButton = card.querySelector("[data-reveal]");
  if (revealButton) {
    revealButton.addEventListener("click", () => revealAnswer(question.id));
  }

  const explainButton = card.querySelector("[data-explain]");
  if (explainButton) {
    explainButton.addEventListener("click", () => openSolutionModal(question));
  }

  return card;
}

function renderOption(question, option, optionIndex) {
  const selected = state.answers[question.id] === optionIndex;
  const correct = Number(question.correctIndex) === optionIndex;
  const checked = Boolean(state.checked[question.id]);
  const solved = isQuestionSolved(question.id);
  const revealed = Boolean(state.revealed[question.id]);
  const wrongSelected = checked && selected && !correct;
  const classes = [
    "option",
    selected ? "is-selected" : "",
    wrongSelected ? "is-wrong" : "",
    (solved || revealed) && correct ? "is-correct is-revealed" : "",
    solved ? "is-locked" : "",
  ].filter(Boolean).join(" ");

  return `
    <button class="${classes}" type="button" data-option="${optionIndex}" ${solved ? "disabled" : ""}>
      <span class="option-letter">${letters[optionIndex]}</span>
      <span>${escapeHtml(option)}</span>
    </button>
  `;
}

function renderQuestionResult(question) {
  const checked = Boolean(state.checked[question.id]);
  const selected = state.answers[question.id];
  const isCorrect = selected === Number(question.correctIndex);

  if (isQuestionSolved(question.id)) {
    return `<p class="result ok">Уже решено правильно.</p>`;
  }

  if (!checked) {
    return `<p class="result"></p>`;
  }

  if (isCorrect) {
    return `<p class="result ok">Правильно! Отличная работа.</p>`;
  }

  return `
    <div class="question-feedback">
      <p class="result bad">Пока неверно. Можно выбрать другой вариант или посмотреть ответ.</p>
      <button class="ghost" type="button" data-reveal="${escapeAttribute(question.id)}">
        Показать правильный ответ
      </button>
    </div>
  `;
}

function selectTopic(topicName) {
  state.activeTopic = topicName;
  render();
}

function selectAnswer(questionId, optionIndex) {
  if (isQuestionSolved(questionId)) {
    return;
  }

  state.answers[questionId] = optionIndex;
  state.checked[questionId] = false;
  state.revealed[questionId] = false;
  renderVariant();
  renderQuestionButtons();
}

async function checkVariant() {
  stopTimer();
  const questions = getActiveTopicQuestions();
  const unanswered = questions.filter(
    (question) => !isQuestionSolved(question.id) && state.answers[question.id] === undefined
  );

  if (unanswered.length > 0) {
    setStatus(`Осталось выбрать ответ: ${unanswered.length}.`);
  }

  for (const question of questions) {
    if (isQuestionSolved(question.id) || state.answers[question.id] === undefined) {
      continue;
    }

    state.checked[question.id] = true;

    if (state.answers[question.id] === Number(question.correctIndex)) {
      await markQuestionSolved(question);
    }
  }

  render();
}

function revealAnswer(questionId) {
  state.revealed[questionId] = true;
  renderVariant();
}

function openSolutionModal(question) {
  clearTimeout(solutionCloseTimer);
  els.solutionTitle.textContent = question.question || "Решение вопроса";
  els.solutionContent.innerHTML = "";

  const text = document.createElement("p");
  text.className = "solution-text";
  text.textContent = question.explanation || "Объяснение пока не добавлено.";
  els.solutionContent.append(text);

  if (question.explanationImageUrl) {
    const figure = document.createElement("figure");
    figure.className = "solution-image";

    const image = document.createElement("img");
    image.src = question.explanationImageUrl;
    image.alt = "Картинка к объяснению";

    figure.append(image);
    els.solutionContent.append(figure);
  }

  els.solutionModal.classList.remove("is-closing");
  els.solutionModal.classList.remove("is-hidden");
  els.solutionModal.setAttribute("aria-hidden", "false");
  typesetMath(els.solutionModal);
}

function closeSolutionModal() {
  if (els.solutionModal.classList.contains("is-hidden")) {
    return;
  }

  els.solutionModal.classList.add("is-closing");
  els.solutionModal.setAttribute("aria-hidden", "true");
  clearTimeout(solutionCloseTimer);
  solutionCloseTimer = setTimeout(() => {
    els.solutionModal.classList.add("is-hidden");
    els.solutionModal.classList.remove("is-closing");
  }, 220);
}

async function markQuestionSolved(question) {
  if (!question || !question.id) {
    return;
  }

  state.solved[question.id] = {
    correct: true,
    solvedAt: new Date().toISOString(),
    topic: question.topic || "Математика",
  };

  if (!apiEnabled || !state.profile || !state.progressId) {
    return;
  }

  try {
    await request(`${PROGRESS_URL}/${state.progressId}`, {
      method: "PATCH",
      body: JSON.stringify({
        solved: state.solved,
        updatedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    setStatus("Ответ правильный, но прогресс не сохранился. Проверь ресурс progress.");
  }
}

async function handleCreate(event) {
  event.preventDefault();

  const imageUrl = state.pendingImageData || els.imageUrlInput.value.trim();
  const explanationImageUrl = state.pendingExplanationImageData || els.explanationImageUrlInput.value.trim();
  const newQuestion = {
    question: els.questionInput.value.trim(),
    topic: els.topicInput.value.trim() || "30 день",
    imageUrl,
    explanation: els.explanationInput.value.trim(),
    explanationImageUrl,
    options: [...els.optionInputs].map((input) => input.value.trim()),
    correctIndex: Number(els.correctInput.value),
  };

  if (newQuestion.options.some((option) => option.length === 0)) {
    setStatus("Заполни все варианты ответа.");
    return;
  }

  if (!apiEnabled) {
    setStatus("Сейчас демо-режим. Для сохранения вставь ссылку Mokky API в script.js.");
    return;
  }

  try {
    const isEditing = Boolean(state.editingQuestionId);
    const url = isEditing ? `${MOKKY_URL}/${state.editingQuestionId}` : MOKKY_URL;
    await request(url, {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(newQuestion),
    });
    resetQuestionForm();
    state.activeTopic = newQuestion.topic;
    state.manageTopic = newQuestion.topic;
    state.manageTopicOpen = true;
    setStatus(isEditing ? "Задание изменено." : "Задание добавлено.");
    await loadQuestions();
    switchView("quiz");
  } catch (error) {
    setStatus("Не удалось добавить задание. Проверь ссылку Mokky API.");
  }
}

function renderLibrary() {
  renderManageTopics();
  els.libraryList.innerHTML = "";

  if (state.questions.length === 0) {
    els.libraryList.textContent = "Заданий пока нет.";
    return;
  }

  if (!state.manageTopicOpen) {
    els.libraryList.textContent = "Выбери день, чтобы раскрыть вопросы.";
    return;
  }

  const questions = getManageTopicQuestions();

  if (questions.length === 0) {
    els.libraryList.textContent = "В этом дне пока нет вопросов.";
    return;
  }

  questions.forEach((question, index) => {
    const item = document.createElement("article");
    item.className = "library-item";

    const correctAnswer = question.options[Number(question.correctIndex)] || "";
    const imageMarkup = question.imageUrl
      ? `<img class="library-thumb" src="${escapeAttribute(question.imageUrl)}" alt="Картинка задания" loading="lazy" />`
      : "";
    item.innerHTML = `
      <small>${escapeHtml(question.topic || "Математика")} | Вопрос ${index + 1}</small>
      <strong>${escapeHtml(question.question)}</strong>
      ${imageMarkup}
      <small>Ответ: ${escapeHtml(correctAnswer)}</small>
    `;

    const actions = document.createElement("div");
    actions.className = "library-actions";

    const editButton = document.createElement("button");
    editButton.className = "edit-btn";
    editButton.type = "button";
    editButton.textContent = "Изменить";
    editButton.addEventListener("click", () => startEditQuestion(question));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Удалить";
    deleteButton.addEventListener("click", () => deleteQuestion(question.id));

    actions.append(editButton, deleteButton);
    item.append(actions);
    els.libraryList.append(item);
  });

  typesetMath(els.libraryList);
}

function renderUsers() {
  if (!els.usersList || !state.isAdmin) {
    return;
  }

  els.usersList.innerHTML = "";

  if (state.users.length === 0) {
    els.usersList.textContent = "Пользователей пока не удалось загрузить.";
    return;
  }

  state.users.forEach((user) => {
    const item = document.createElement("article");
    item.className = "user-item";

    const createdAt = user.createdAt
      ? new Date(user.createdAt).toLocaleString("ru-RU")
      : "встроенный";

    item.innerHTML = `
      <div>
        <small>${user.isAdmin ? "Админ" : "Пользователь"} | ${escapeHtml(createdAt)}</small>
        <strong>${escapeHtml(user.label || user.username)}</strong>
      </div>
      <dl class="user-credentials">
        <div>
          <dt>Логин</dt>
          <dd>${escapeHtml(user.username || "")}</dd>
        </div>
        <div>
          <dt>Пароль</dt>
          <dd>${escapeHtml(user.password || "не задан")}</dd>
        </div>
      </dl>
    `;

    els.usersList.append(item);
  });
}

function renderManageTopics() {
  const topics = getTopics();
  els.manageTopicList.innerHTML = "";

  topics.forEach((topic) => {
    const count = state.questions.filter((question) => (question.topic || "Математика") === topic).length;
    const button = document.createElement("button");
    button.className = `manage-topic-btn${topic === state.manageTopic && state.manageTopicOpen ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = `${topic} (${count}) ${topic === state.manageTopic && state.manageTopicOpen ? "−" : "+"}`;
    button.addEventListener("click", () => {
      if (state.manageTopic === topic) {
        state.manageTopicOpen = !state.manageTopicOpen;
      } else {
        state.manageTopic = topic;
        state.manageTopicOpen = true;
      }
      renderLibrary();
    });
    els.manageTopicList.append(button);
  });
}

function startEditQuestion(question) {
  state.editingQuestionId = question.id;
  state.pendingImageData = "";
  state.pendingExplanationImageData = "";
  els.formTitle.textContent = "Изменить задание";
  els.saveQuestionBtn.textContent = "Сохранить изменения";
  els.cancelEditBtn.classList.remove("is-hidden");
  els.questionInput.value = question.question || "";
  els.topicInput.value = question.topic || "";
  els.explanationInput.value = question.explanation || "";
  els.imageUrlInput.value = question.imageUrl || "";
  els.imageFileInput.value = "";
  renderImagePreview(question.imageUrl || "");
  els.explanationImageUrlInput.value = question.explanationImageUrl || "";
  els.explanationImageFileInput.value = "";
  renderExplanationImagePreview(question.explanationImageUrl || "");

  [...els.optionInputs].forEach((input, index) => {
    input.value = question.options?.[index] || "";
  });

  els.correctInput.value = String(question.correctIndex ?? 0);
  switchView("manage");
  els.questionInput.focus();
}

function cancelEdit() {
  resetQuestionForm();
}

function resetQuestionForm() {
  state.editingQuestionId = null;
  els.form.reset();
  clearImage();
  clearExplanationImage();
  els.formTitle.textContent = "Новое задание";
  els.saveQuestionBtn.textContent = "Добавить задание";
  els.cancelEditBtn.classList.add("is-hidden");
}

async function deleteQuestion(id) {
  if (!apiEnabled) {
    setStatus("Удаление работает после подключения Mokky API.");
    return;
  }

  try {
    await request(`${MOKKY_URL}/${id}`, { method: "DELETE" });
    setStatus("Задание удалено.");
    await loadQuestions();
  } catch (error) {
    setStatus("Не удалось удалить задание. Проверь API.");
  }
}

function toggleTimer() {
  if (state.timerId) {
    stopTimer("Продолжить таймер");
    return;
  }

  state.timerId = setInterval(() => {
    state.timerSeconds += 1;
    renderTimer();
  }, 1000);
  els.timerBtn.textContent = "Пауза";
}

function stopTimer(buttonText = "Продолжить таймер") {
  if (!state.timerId) {
    return;
  }

  clearInterval(state.timerId);
  state.timerId = null;
  els.timerBtn.textContent = buttonText;
}

function resetTimer() {
  stopTimer("Запустить таймер");
  state.timerSeconds = 0;
  renderTimer();
}

function renderTimer() {
  const minutes = Math.floor(state.timerSeconds / 60);
  const seconds = state.timerSeconds % 60;
  els.timerValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTopics() {
  return [...new Set(state.questions.map((question) => question.topic || "Математика"))];
}

function syncActiveTopic() {
  const topics = getTopics();

  if (!topics.includes(state.activeTopic)) {
    state.activeTopic = topics[0] || "";
  }
}

function syncManageTopic() {
  const topics = getTopics();

  if (!topics.includes(state.manageTopic)) {
    state.manageTopic = topics[0] || "";
    state.manageTopicOpen = false;
  }
}

function getActiveTopicQuestions() {
  return state.questions
    .filter((question) => (question.topic || "Математика") === state.activeTopic)
    .slice(0, 10);
}

function getManageTopicQuestions() {
  return state.questions.filter((question) => (question.topic || "Математика") === state.manageTopic);
}

function getTopicProgress() {
  const map = new Map();

  state.questions.forEach((question) => {
    const name = question.topic || "Математика";

    if (!map.has(name)) {
      map.set(name, { name, total: 0, solved: 0 });
    }

    const topic = map.get(name);
    topic.total += 1;

    if (isQuestionSolved(question.id)) {
      topic.solved += 1;
    }
  });

  return [...map.values()];
}

function getEncourageText(topics, solvedTotal) {
  if (!state.profile) {
    return "Войди по никнейму, и я буду показывать прогресс по дням.";
  }

  if (state.questions.length === 0) {
    return "Пока нет заданий, но место для побед уже готово.";
  }

  if (solvedTotal === state.questions.length) {
    return "Все решено правильно. Королева математики сегодня сияет.";
  }

  const activeTopic = topics.find((topic) => topic.name === state.activeTopic) || topics[0];
  const left = activeTopic ? activeTopic.total - activeTopic.solved : state.questions.length - solvedTotal;

  if (solvedTotal === 0) {
    return "Начнем спокойно. Один правильный ответ, потом следующий.";
  }

  return `Давай, чутка осталось: в теме «${activeTopic.name}» еще ${left}. Я в тебя верю.`;
}

function isQuestionSolved(questionId) {
  return Boolean(state.solved[questionId]?.correct);
}

function normalizeNickname(value) {
  const nickname = value.trim().toLowerCase();

  if (isAdminName(nickname)) {
    return "dinozavrik";
  }

  if (isQueenName(nickname)) {
    return "мендальноглазая";
  }

  return nickname;
}

function getProfileLabel(value) {
  const nickname = value.trim().toLowerCase();

  if (isAdminName(nickname)) {
    return "dinozavrik";
  }

  if (isQueenName(nickname)) {
    return "Мендальноглазая";
  }

  return nickname || "гость";
}

function isAdminName(value) {
  const nickname = value.trim().toLowerCase();
  return nickname === "dinozavrik" || nickname === "динозаврик";
}

function isQueenName(value) {
  return value.trim().toLowerCase() === "мендальноглазая";
}

function canOpenManage() {
  if (!state.isAdmin) {
    setStatus("Раздел добавления доступен только администратору.");
    return false;
  }

  return true;
}

function setStatus(message) {
  els.status.textContent = message;
}

function updateImagePreviewFromUrl() {
  state.pendingImageData = "";
  renderImagePreview(els.imageUrlInput.value.trim());
}

async function handleImageFile(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Выбери файл картинки.");
    return;
  }

  try {
    state.pendingImageData = await compressImage(file);
    els.imageUrlInput.value = "";
    renderImagePreview(state.pendingImageData);
    setStatus("Картинка готова к сохранению вместе с заданием.");
  } catch (error) {
    setStatus("Не получилось обработать картинку. Попробуй другое фото.");
  }
}

function updateExplanationImagePreviewFromUrl() {
  state.pendingExplanationImageData = "";
  renderExplanationImagePreview(els.explanationImageUrlInput.value.trim());
}

async function handleExplanationImageFile(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Выбери файл картинки.");
    return;
  }

  try {
    state.pendingExplanationImageData = await compressImage(file);
    els.explanationImageUrlInput.value = "";
    renderExplanationImagePreview(state.pendingExplanationImageData);
    setStatus("Картинка объяснения готова к сохранению.");
  } catch (error) {
    setStatus("Не получилось обработать картинку объяснения. Попробуй другое фото.");
  }
}

function renderImagePreview(imageUrl) {
  if (!imageUrl) {
    els.imagePreview.removeAttribute("src");
    els.imagePreviewWrap.classList.add("is-hidden");
    return;
  }

  els.imagePreview.src = imageUrl;
  els.imagePreviewWrap.classList.remove("is-hidden");
}

function renderExplanationImagePreview(imageUrl) {
  if (!imageUrl) {
    els.explanationImagePreview.removeAttribute("src");
    els.explanationImagePreviewWrap.classList.add("is-hidden");
    return;
  }

  els.explanationImagePreview.src = imageUrl;
  els.explanationImagePreviewWrap.classList.remove("is-hidden");
}

function clearImage() {
  state.pendingImageData = "";
  els.imageUrlInput.value = "";
  els.imageFileInput.value = "";
  renderImagePreview("");
}

function clearExplanationImage() {
  state.pendingExplanationImageData = "";
  els.explanationImageUrlInput.value = "";
  els.explanationImageFileInput.value = "";
  renderExplanationImagePreview("");
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function getSiblingResourceUrl(url, resourceName) {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.replace(/\/[^/]+$/, `/${resourceName}`);
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function typesetMath(root = document.body) {
  if (!window.MathJax?.typesetPromise) {
    return;
  }

  window.MathJax.typesetPromise([root]).catch(() => {
    setStatus("Формула LaTeX не отрисовалась. Проверь скобки и команды.");
  });
}
