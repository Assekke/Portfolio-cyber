"use strict";

(() => {
  const storageKey = "esports-player-portfolios-v2";
  const legacyKey = "esports-player-portfolio-v1";
  const fields = ["nickname", "discipline", "role", "statistics", "achievements", "contacts"];
  const form = document.getElementById("player-form");
  const editor = document.getElementById("editor");
  const portfolio = document.getElementById("portfolio");
  const nickname = document.getElementById("nickname");
  const nicknameError = document.getElementById("nickname-error");
  const status = document.getElementById("status");
  const select = document.getElementById("portfolio-select");
  const unsavedDialog = document.getElementById("unsaved-dialog");
  const createDialog = document.getElementById("create-dialog");
  const createForm = document.getElementById("create-form");
  const createError = document.getElementById("create-error");
  const newDiscipline = document.getElementById("new-discipline");
  const newNickname = document.getElementById("new-nickname");
  const writeError = "Не удалось сохранить данные в браузере. Проверьте разрешения или свободное место. Введённые данные остаются в форме.";
  let state = { version: 2, activeId: null, portfolios: [] };
  let baseline = "";
  let pendingAction = null;
  let saveBeforeCreate = false;

  function message(text, isError = false) {
    status.textContent = text;
    status.dataset.error = String(isError);
  }

  function readForm() {
    return Object.fromEntries(fields.map((field) => [field, document.getElementById(field).value]));
  }

  function isDirty() {
    return !editor.hidden && JSON.stringify(readForm()) !== baseline;
  }

  function makePlayer(values) {
    return { id: crypto.randomUUID(), ...Object.fromEntries(fields.map((field) => [field, values[field] ?? ""])) };
  }

  function validPlayer(player) {
    return player && fields.every((field) => typeof player[field] === "string") && player.nickname.trim();
  }

  function validState(value) {
    if (!value || value.version !== 2 || !Array.isArray(value.portfolios)) return false;
    const ids = new Set();
    for (const player of value.portfolios) {
      if (!validPlayer(player) || typeof player.id !== "string" || !player.id || ids.has(player.id)) return false;
      ids.add(player.id);
    }
    return value.portfolios.length ? ids.has(value.activeId) : value.activeId === null;
  }

  // Change the working state only after the entire storage write succeeds.
  function persist(next, errorTarget = null) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      state = next;
      return true;
    } catch {
      if (errorTarget) errorTarget.textContent = writeError;
      else message(writeError, true);
      return false;
    }
  }

  function showPortfolio(player, focus = false) {
    document.getElementById("portfolio-title").textContent = player.nickname;
    for (const field of fields.slice(1)) {
      const target = document.getElementById(`view-${field}`);
      const empty = !player[field].trim();
      target.textContent = empty ? "Не указано" : player[field];
      target.classList.toggle("empty", empty);
    }
    editor.hidden = true;
    portfolio.hidden = false;
    if (focus) document.getElementById("portfolio-title").focus();
  }

  function updateSelector() {
    select.replaceChildren();
    if (!state.portfolios.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Пока нет сохранённых портфолио";
      select.append(option);
    }
    for (const player of state.portfolios) {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = `${player.discipline.trim() ? player.discipline : "Без игры"} — ${player.nickname}`;
      select.append(option);
    }
    select.value = state.activeId ?? "";
  }

  function loadActive(edit = false, focus = false) {
    const player = state.portfolios.find((item) => item.id === state.activeId);
    for (const field of fields) document.getElementById(field).value = player ? player[field] : "";
    baseline = JSON.stringify(readForm());
    nickname.removeAttribute("aria-invalid");
    nicknameError.hidden = true;
    updateSelector();
    if (player && !edit) showPortfolio(player, focus);
    else {
      portfolio.hidden = true;
      editor.hidden = false;
      if (focus) nickname.focus();
    }
  }

  function validateNickname() {
    if (nickname.value.trim()) return true;
    nickname.setAttribute("aria-invalid", "true");
    nicknameError.hidden = false;
    nickname.focus();
    return false;
  }

  function withDraft() {
    const next = { ...state, portfolios: state.portfolios.map((player) => ({ ...player })) };
    const current = next.portfolios.find((player) => player.id === next.activeId);
    if (current) Object.assign(current, readForm());
    else {
      const player = makePlayer(readForm());
      next.portfolios.push(player);
      next.activeId = player.id;
    }
    return next;
  }

  function continueAction(action, saveDraft) {
    if (saveDraft && !validateNickname()) return;
    if (action.type === "new") {
      saveBeforeCreate = saveDraft;
      createForm.reset();
      createError.textContent = "";
      newDiscipline.removeAttribute("aria-invalid");
      newNickname.removeAttribute("aria-invalid");
      createDialog.showModal();
      newDiscipline.focus();
      return;
    }
    const next = saveDraft ? withDraft() : { ...state };
    next.activeId = action.id;
    if (!persist(next)) return;
    loadActive(false, true);
    message("");
  }

  function requestAction(action) {
    if (isDirty()) {
      pendingAction = action;
      unsavedDialog.showModal();
      document.getElementById("cancel-transition").focus();
    } else continueAction(action, false);
  }

  nickname.addEventListener("input", () => {
    nickname.removeAttribute("aria-invalid");
    nicknameError.hidden = true;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message("");
    if (!validateNickname()) return;
    if (!persist(withDraft())) return;
    loadActive(false, true);
    message("Портфолио сохранено в этом браузере.");
  });

  select.addEventListener("change", () => {
    const id = select.value;
    select.value = state.activeId ?? "";
    if (id !== state.activeId) requestAction({ type: "switch", id });
  });

  document.getElementById("new-button").addEventListener("click", () => requestAction({ type: "new" }));
  document.getElementById("cancel-transition").addEventListener("click", () => {
    pendingAction = null;
    unsavedDialog.close();
  });
  unsavedDialog.addEventListener("cancel", () => { pendingAction = null; });
  for (const [id, saveDraft] of [["save-and-continue", true], ["discard-and-continue", false]]) {
    document.getElementById(id).addEventListener("click", () => {
      const action = pendingAction;
      pendingAction = null;
      unsavedDialog.close();
      if (action) continueAction(action, saveDraft);
    });
  }

  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createError.textContent = "";
    for (const [input, text] of [[newDiscipline, "Введите название игры."], [newNickname, "Введите никнейм."]]) {
      input.removeAttribute("aria-invalid");
      if (!input.value.trim()) {
        input.setAttribute("aria-invalid", "true");
        createError.textContent = text;
        input.focus();
        return;
      }
    }
    const next = saveBeforeCreate ? withDraft() : { ...state, portfolios: [...state.portfolios] };
    const player = makePlayer({ nickname: newNickname.value, discipline: newDiscipline.value });
    next.portfolios.push(player);
    next.activeId = player.id;
    if (!persist(next, createError)) return;
    createDialog.close();
    loadActive(true, true);
    message("Портфолио создано и сохранено. Заполните остальные поля по желанию.");
  });

  document.getElementById("cancel-create").addEventListener("click", () => createDialog.close());
  document.getElementById("edit-button").addEventListener("click", () => {
    portfolio.hidden = true;
    editor.hidden = false;
    message("");
    nickname.focus();
  });

  window.addEventListener("beforeunload", (event) => {
    if (isDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!validState(parsed)) throw new Error("Invalid saved portfolios");
      state = parsed;
    } else {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy !== null) {
        const parsed = JSON.parse(legacy);
        if (!validPlayer(parsed)) throw new Error("Invalid legacy portfolio");
        const player = makePlayer(parsed);
        state = { version: 2, activeId: player.id, portfolios: [player] };
        if (!persist(state)) {
          message("Не удалось сохранить перенесённое портфолио. Исходная запись сохранена; данные доступны на экране. Проверьте доступ или свободное место и нажмите «Сохранить» в редакторе.", true);
        }
        // Keep the original record intact even after successful migration.
      }
    }
  } catch {
    message("Не удалось прочитать сохранённые портфолио. Проверьте доступ к хранилищу браузера. Сохранённые записи не удалены; можно заполнить форму заново.", true);
  }
  loadActive();
})();
