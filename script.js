"use strict";

(() => {
  const storageKey = "esports-player-portfolio-v1";
  const fields = ["nickname", "discipline", "role", "statistics", "achievements", "contacts"];
  const form = document.getElementById("player-form");
  const editor = document.getElementById("editor");
  const portfolio = document.getElementById("portfolio");
  const nickname = document.getElementById("nickname");
  const nicknameError = document.getElementById("nickname-error");
  const status = document.getElementById("status");

  function message(text, isError = false) {
    status.textContent = text;
    status.dataset.error = String(isError);
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

  nickname.addEventListener("input", () => {
    nickname.removeAttribute("aria-invalid");
    nicknameError.hidden = true;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message("");
    if (!nickname.value.trim()) {
      nickname.setAttribute("aria-invalid", "true");
      nicknameError.hidden = false;
      nickname.focus();
      return;
    }
    const player = Object.fromEntries(fields.map((field) => [field, document.getElementById(field).value]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(player));
    } catch {
      message("Не удалось сохранить данные в браузере. Проверьте разрешения или свободное место и попробуйте снова. Введённые данные остаются в форме.", true);
      return;
    }
    showPortfolio(player, true);
    message("Портфолио сохранено в этом браузере.");
  });

  document.getElementById("edit-button").addEventListener("click", () => {
    portfolio.hidden = true;
    editor.hidden = false;
    message("");
    nickname.focus();
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const player = JSON.parse(saved);
      if (!player || !fields.every((field) => typeof player[field] === "string") || !player.nickname.trim()) {
        throw new Error("Invalid saved portfolio");
      }
      for (const field of fields) document.getElementById(field).value = player[field];
      showPortfolio(player);
    }
  } catch {
    message("Не удалось прочитать сохранённое портфолио. Проверьте доступ к хранилищу браузера или заполните форму заново.", true);
  }
})();
