"use strict";

(() => {
  const storageKey = "esports-player-portfolios-v2";
  const legacyKey = "esports-player-portfolio-v1";
  const fields = ["nickname", "discipline", "role", "statistics", "achievements", "contacts"];
  const dotaRoles = ["Кэрри", "Мидер", "Оффлейнер", "Саппорт", "Полная поддержка"];
  const discipline = document.getElementById("discipline");
  const dotabuff = document.getElementById("dotabuff");
  const dotabuffField = document.getElementById("dotabuff-field");
  const dotabuffError = document.getElementById("dotabuff-error");
  const additionalRoles = document.getElementById("additional-roles");
  const roleCheckboxes = [...additionalRoles.querySelectorAll('input[type="checkbox"]')];
  const form = document.getElementById("player-form");
  const editor = document.getElementById("editor");
  const portfolio = document.getElementById("portfolio");
  const portfolioSummary = document.getElementById("portfolio-summary");
  const editButton = document.getElementById("edit-button");
  const nickname = document.getElementById("nickname");
  const nicknameError = document.getElementById("nickname-error");
  const status = document.getElementById("status");
  const select = document.getElementById("portfolio-select");
  const roleFilter = document.getElementById("role-filter");
  const roleResults = document.getElementById("role-search-results");
  const roleSearchEmpty = document.getElementById("role-search-empty");
  const unsavedDialog = document.getElementById("unsaved-dialog");
  const createDialog = document.getElementById("create-dialog");
  const createForm = document.getElementById("create-form");
  const createError = document.getElementById("create-error");
  const newDiscipline = document.getElementById("new-discipline");
  const newNickname = document.getElementById("new-nickname");
  const accentColor = document.getElementById("accent-color");
  const theme = document.getElementById("theme");
  const defaultAccent = "#c1f66b";
  const exportButton = document.getElementById("export-pdf");
  const exportDialog = document.getElementById("export-dialog");
  const teamDialog = document.getElementById("team-dialog");
  const teamForm = document.getElementById("team-form");
  const teamName = document.getElementById("team-name");
  const teamRole = document.getElementById("team-role");
  const teamStart = document.getElementById("team-start");
  const teamEnd = document.getElementById("team-end");
  const teamError = document.getElementById("team-error");
  const addTeam = document.getElementById("add-team");
  const teamsFeedback = document.getElementById("teams-feedback");
  const deleteTeamDialog = document.getElementById("delete-team-dialog");
  const achievementDialog = document.getElementById("achievement-dialog");
  const achievementForm = document.getElementById("achievement-form");
  const achievementName = document.getElementById("achievement-name");
  const achievementPlace = document.getElementById("achievement-place");
  const achievementDate = document.getElementById("achievement-date");
  const achievementError = document.getElementById("achievement-error");
  const addAchievement = document.getElementById("add-achievement");
  const achievementsFeedback = document.getElementById("achievements-feedback");
  const deleteAchievementDialog = document.getElementById("delete-achievement-dialog");
  const avatarFile = document.getElementById("avatar-file");
  const avatarError = document.getElementById("avatar-error");
  const avatarProgress = document.getElementById("avatar-progress");
  const removeAvatar = document.getElementById("remove-avatar");
  const maxAvatarSize = 2 * 1024 * 1024;
  const avatarTypes = ["image/jpeg", "image/png", "image/webp"];
  const writeError = "Не удалось сохранить данные в браузере. Проверьте разрешения или свободное место. Введённые данные остаются в форме.";
  const readError = "Не удалось прочитать сохранённые портфолио. Запись заблокирована, чтобы не затереть прежние данные. Скопируйте введённый текст перед перезагрузкой, восстановите доступ к хранилищу или исправьте повреждённую запись и обновите страницу.";
  let state = { version: 2, activeId: null, portfolios: [] };
  let storageReadFailed = false;
  let storedSnapshot = null;
  let legacySnapshot = null;
  let baseline = "";
  let pendingAction = null;
  let draftAvatar = "";
  let avatarRequest = 0;
  let avatarLoading = false;
  let draftTeams = [];
  let editingTeamId = null;
  let deletingTeamId = null;
  let teamFormBaseline = "";
  let draftAchievementCards = [];
  let editingAchievementId = null;
  let deletingAchievementId = null;
  let achievementFormBaseline = "";
  let printing = false;

  function message(text, isError = false) {
    status.textContent = text;
    status.dataset.error = String(isError);
  }

  function readForm() {
    return { ...Object.fromEntries(fields.map((field) => [field, document.getElementById(field).value])), avatar: draftAvatar,
      accentColor: accentColor.value, theme: theme.value, teams: draftTeams.map((team) => ({ ...team })),
      achievementCards: draftAchievementCards.map((card) => ({ ...card })),
      additionalRoles: roleCheckboxes.filter((input) => input.checked).map((input) => input.value), dotabuff: dotabuff.value.trim() };
  }

  function validDotabuff(value) {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "dotabuff.com" || url.hostname === "www.dotabuff.com" || url.hostname === "ru.dotabuff.com") && !url.username && !url.password && !url.port;
    } catch {
      return false;
    }
  }

  function isDota(game) {
    return /^(?:dota|дота)\s*2$/i.test(game.trim());
  }

  function updateAdditionalRoles() {
    const game = discipline.value.trim();
    const useList = !game || isDota(game);
    additionalRoles.hidden = !useList;
    dotabuffField.hidden = !useList;
    const primary = document.getElementById("role").value;
    for (const input of roleCheckboxes) {
      input.disabled = useList && input.value === primary;
      if (input.disabled) input.checked = false;
    }
  }

  function updateRoleField(value = document.getElementById("role").value) {
    const previous = document.getElementById("role");
    const game = discipline.value.trim();
    const useList = !game || /^(?:dota|дота)\s*2$/i.test(game);
    const control = document.createElement(useList ? "select" : "input");
    control.id = "role";
    control.name = "role";
    if (useList) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Не указана";
      control.append(empty);
      dotaRoles.forEach((role, index) => {
        const option = document.createElement("option");
        option.value = role;
        option.textContent = `${role} — позиция ${index + 1}`;
        control.append(option);
      });
      if (value && !dotaRoles.includes(value)) {
        const saved = document.createElement("option");
        saved.value = value;
        saved.textContent = `Сохранённая роль: ${value}`;
        saved.disabled = true;
        control.append(saved);
      }
    } else control.placeholder = "Ваша игровая роль";
    control.value = value;
    previous.replaceWith(control);
    updateAdditionalRoles();
  }

  discipline.addEventListener("input", () => updateRoleField());
  form.addEventListener("change", (event) => {
    if (event.target.id === "role") updateAdditionalRoles();
  });

  function dateValue(value) {
    if (typeof value !== "string") return null;
    const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
    if (!parts) return null;
    const [day, month, year] = parts.slice(1).map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? year * 10000 + month * 100 + day : null;
  }

  function validTeams(teams) {
    if (!Array.isArray(teams)) return false;
    const ids = new Set();
    return teams.every((team) => {
      if (!team || typeof team.id !== "string" || !team.id || ids.has(team.id) ||
        typeof team.name !== "string" || !team.name.trim() || typeof team.role !== "string" ||
        dateValue(team.startDate) === null || (team.endDate !== "" &&
          (dateValue(team.endDate) === null || dateValue(team.endDate) < dateValue(team.startDate)))) return false;
      ids.add(team.id);
      return true;
    });
  }

  function teamFormValues() {
    return { name: teamName.value, role: teamRole.value, startDate: teamStart.value, endDate: teamEnd.value };
  }

  function openTeam(team = null) {
    editingTeamId = team?.id ?? null;
    teamForm.reset();
    teamName.value = team?.name ?? "";
    teamRole.value = team?.role ?? "";
    teamStart.value = team?.startDate ?? "";
    teamEnd.value = team?.endDate ?? "";
    teamError.textContent = "";
    for (const input of [teamName, teamRole, teamStart, teamEnd]) input.removeAttribute("aria-invalid");
    document.getElementById("team-dialog-title").textContent = team ? "Редактировать команду" : "Добавить команду";
    document.getElementById("apply-team").textContent = team ? "Применить изменения" : "Добавить в список";
    teamFormBaseline = JSON.stringify(teamFormValues());
    teamDialog.showModal();
    teamName.focus();
  }

  function renderTeams(teams, editable = false) {
    const list = document.getElementById(editable ? "teams-list" : "view-teams-list");
    document.getElementById(editable ? "teams-empty" : "view-teams-empty").hidden = teams.length > 0;
    list.replaceChildren();
    for (const team of teams) {
      const item = document.createElement("li");
      item.className = "record-card";
      const name = document.createElement("h3");
      name.textContent = team.name;
      const role = document.createElement("p");
      role.textContent = `Роль: ${team.role.trim() ? team.role : "Не указана"}`;
      const dates = document.createElement("p");
      dates.className = "hint";
      dates.textContent = `${team.startDate} — ${team.endDate || "По настоящее время"}`;
      item.append(name, role, dates);
      if (editable) {
        const actions = document.createElement("div");
        actions.className = "record-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "secondary";
        edit.textContent = "Редактировать";
        edit.setAttribute("aria-label", `Редактировать команду ${team.name}`);
        edit.dataset.editTeam = team.id;
        edit.addEventListener("click", () => openTeam(team));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "secondary";
        remove.textContent = "Удалить";
        remove.setAttribute("aria-label", `Удалить команду ${team.name}`);
        remove.addEventListener("click", () => {
          deletingTeamId = team.id;
          document.getElementById("delete-team-description").textContent = `Запись «${team.name}» будет удалена из списка. Для сохранения изменения нажмите «Сохранить» в редакторе портфолио.`;
          deleteTeamDialog.showModal();
          document.getElementById("cancel-delete-team").focus();
        });
        actions.append(edit, remove);
        item.append(actions);
      }
      list.append(item);
    }
  }

  addTeam.addEventListener("click", () => openTeam());
  document.getElementById("cancel-team").addEventListener("click", () => teamDialog.close());
  teamForm.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    teamError.textContent = "";
  });
  teamForm.addEventListener("submit", (event) => {
    event.preventDefault();
    teamError.textContent = "";
    for (const input of [teamName, teamRole, teamStart, teamEnd]) input.removeAttribute("aria-invalid");
    const entry = { id: editingTeamId ?? crypto.randomUUID(), ...teamFormValues(),
      startDate: teamStart.value.trim(), endDate: teamEnd.value.trim() };
    const fail = (input, text) => {
      input.setAttribute("aria-invalid", "true");
      teamError.textContent = text;
      input.focus();
    };
    if (!entry.name.trim()) return fail(teamName, "Введите название команды.");
    if (!entry.startDate) return fail(teamStart, "Введите дату начала участия.");
    if (dateValue(entry.startDate) === null) return fail(teamStart, "Введите существующую дату начала в формате ДД.ММ.ГГГГ.");
    if (entry.endDate && dateValue(entry.endDate) === null) return fail(teamEnd, "Введите существующую дату окончания в формате ДД.ММ.ГГГГ.");
    if (entry.endDate && dateValue(entry.endDate) < dateValue(entry.startDate)) return fail(teamEnd, "Дата окончания не может быть раньше даты начала.");
    const editing = editingTeamId !== null;
    draftTeams = editing ? draftTeams.map((team) => team.id === editingTeamId ? entry : team) : [...draftTeams, entry];
    teamDialog.close();
    renderTeams(draftTeams, true);
    teamsFeedback.textContent = `${editing ? "Запись изменена." : "Команда добавлена."} Нажмите «Сохранить» для сохранения портфолио.`;
    Array.from(document.querySelectorAll("[data-edit-team]")).find((button) => button.dataset.editTeam === entry.id)?.focus();
  });
  document.getElementById("cancel-delete-team").addEventListener("click", () => {
    deletingTeamId = null;
    deleteTeamDialog.close();
  });
  deleteTeamDialog.addEventListener("cancel", () => { deletingTeamId = null; });
  document.getElementById("confirm-delete-team").addEventListener("click", () => {
    draftTeams = draftTeams.filter((team) => team.id !== deletingTeamId);
    deletingTeamId = null;
    deleteTeamDialog.close();
    renderTeams(draftTeams, true);
    teamsFeedback.textContent = "Команда удалена из списка. Нажмите «Сохранить» для сохранения портфолио.";
    addTeam.focus();
  });

  function validAchievementCards(cards) {
    if (!Array.isArray(cards)) return false;
    const ids = new Set();
    return cards.every((card) => {
      if (!card || typeof card.id !== "string" || !card.id || ids.has(card.id) ||
        typeof card.title !== "string" || !card.title.trim() || typeof card.place !== "string" ||
        !card.place.trim() || dateValue(card.date) === null) return false;
      ids.add(card.id);
      return true;
    });
  }

  function achievementFormValues() {
    return { title: achievementName.value, place: achievementPlace.value, date: achievementDate.value };
  }

  function openAchievement(card = null) {
    editingAchievementId = card?.id ?? null;
    achievementForm.reset();
    achievementName.value = card?.title ?? "";
    achievementPlace.value = card?.place ?? "";
    achievementDate.value = card?.date ?? "";
    achievementError.textContent = "";
    for (const input of [achievementName, achievementPlace, achievementDate]) input.removeAttribute("aria-invalid");
    document.getElementById("achievement-dialog-title").textContent = card ? "Редактировать достижение" : "Добавить достижение";
    document.getElementById("apply-achievement").textContent = card ? "Применить изменения" : "Добавить в список";
    achievementFormBaseline = JSON.stringify(achievementFormValues());
    achievementDialog.showModal();
    achievementName.focus();
  }

  function renderAchievementCards(cards, editable = false) {
    const list = document.getElementById(editable ? "achievements-list" : "view-achievements-list");
    document.getElementById(editable ? "achievements-empty" : "view-achievements-empty").hidden = cards.length > 0;
    list.replaceChildren();
    for (const card of cards) {
      const item = document.createElement("li");
      item.className = "record-card";
      const title = document.createElement("h3");
      title.textContent = card.title;
      const place = document.createElement("p");
      place.textContent = `Место: ${card.place}`;
      const date = document.createElement("p");
      date.className = "hint";
      date.textContent = card.date;
      item.append(title, place, date);
      if (editable) {
        const actions = document.createElement("div");
        actions.className = "record-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "secondary";
        edit.textContent = "Редактировать";
        edit.setAttribute("aria-label", `Редактировать достижение ${card.title}`);
        edit.dataset.editAchievement = card.id;
        edit.addEventListener("click", () => openAchievement(card));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "secondary";
        remove.textContent = "Удалить";
        remove.setAttribute("aria-label", `Удалить достижение ${card.title}`);
        remove.addEventListener("click", () => {
          deletingAchievementId = card.id;
          document.getElementById("delete-achievement-description").textContent = `Карточка «${card.title}» будет удалена из списка. Для сохранения изменения нажмите «Сохранить» в редакторе портфолио.`;
          deleteAchievementDialog.showModal();
          document.getElementById("cancel-delete-achievement").focus();
        });
        actions.append(edit, remove);
        item.append(actions);
      }
      list.append(item);
    }
  }

  addAchievement.addEventListener("click", () => openAchievement());
  document.getElementById("cancel-achievement").addEventListener("click", () => achievementDialog.close());
  achievementForm.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    achievementError.textContent = "";
  });
  achievementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    achievementError.textContent = "";
    for (const input of [achievementName, achievementPlace, achievementDate]) input.removeAttribute("aria-invalid");
    const entry = { id: editingAchievementId ?? crypto.randomUUID(), ...achievementFormValues(), date: achievementDate.value.trim() };
    const fail = (input, text) => {
      input.setAttribute("aria-invalid", "true");
      achievementError.textContent = text;
      input.focus();
    };
    if (!entry.title.trim()) return fail(achievementName, "Введите название турнира.");
    if (!entry.place.trim()) return fail(achievementPlace, "Введите занятое место.");
    if (!entry.date) return fail(achievementDate, "Введите дату достижения.");
    if (dateValue(entry.date) === null) return fail(achievementDate, "Введите существующую дату в формате ДД.ММ.ГГГГ.");
    const editing = editingAchievementId !== null;
    draftAchievementCards = editing ? draftAchievementCards.map((card) => card.id === editingAchievementId ? entry : card) : [...draftAchievementCards, entry];
    achievementDialog.close();
    renderAchievementCards(draftAchievementCards, true);
    achievementsFeedback.textContent = `${editing ? "Карточка изменена." : "Достижение добавлено."} Нажмите «Сохранить» для сохранения портфолио.`;
    Array.from(document.querySelectorAll("[data-edit-achievement]")).find((button) => button.dataset.editAchievement === entry.id)?.focus();
  });
  document.getElementById("cancel-delete-achievement").addEventListener("click", () => {
    deletingAchievementId = null;
    deleteAchievementDialog.close();
  });
  deleteAchievementDialog.addEventListener("cancel", () => { deletingAchievementId = null; });
  document.getElementById("confirm-delete-achievement").addEventListener("click", () => {
    draftAchievementCards = draftAchievementCards.filter((card) => card.id !== deletingAchievementId);
    deletingAchievementId = null;
    deleteAchievementDialog.close();
    renderAchievementCards(draftAchievementCards, true);
    achievementsFeedback.textContent = "Карточка удалена из списка. Нажмите «Сохранить» для сохранения портфолио.";
    addAchievement.focus();
  });

  function luminance(color) {
    const channels = color.match(/[a-f\d]{2}/gi).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  }

  function readableAccent(color, backgrounds, target) {
    const channels = color.match(/[a-f\d]{2}/gi).map((channel) => parseInt(channel, 16));
    for (let step = 0; step <= 100; step += 1) {
      const ink = "#" + channels.map((channel) => Math.round(channel + (target - channel) * step / 100).toString(16).padStart(2, "0")).join("");
      const light = luminance(ink);
      if (backgrounds.every((background) => (Math.max(light, background) + .05) / (Math.min(light, background) + .05) >= 4.5)) {
        return ink;
      }
    }
    return target === 0 ? "#000000" : "#ffffff";
  }

  function applyAppearance() {
    const root = document.documentElement;
    root.dataset.theme = theme.value;
    root.style.setProperty("--accent", accentColor.value);
    const accentLuminance = luminance(accentColor.value);
    root.style.setProperty("--on-accent", (accentLuminance + .05) / .05 >= 1.05 / (accentLuminance + .05) ? "#000000" : "#ffffff");
    const styles = getComputedStyle(root);
    const backgrounds = ["--page-bg", "--surface", "--input-bg", "--hover-bg"].map((name) => luminance(styles.getPropertyValue(name).trim()));
    // Preserve the selected button color; adjust text and focus accents for contrast.
    root.style.setProperty("--accent-ink", readableAccent(accentColor.value, backgrounds, theme.value === "light" ? 0 : 255));
  }

  accentColor.addEventListener("input", applyAppearance);
  accentColor.addEventListener("change", applyAppearance);
  theme.addEventListener("change", applyAppearance);

  function isDirty() {
    return !editor.hidden && JSON.stringify(readForm()) !== baseline;
  }

  function makePlayer(values) {
    return { id: crypto.randomUUID(), ...Object.fromEntries(fields.map((field) => [field, values[field] ?? ""])),
      avatar: values.avatar ?? "", accentColor: values.accentColor ?? defaultAccent, theme: values.theme ?? "dark",
      teams: (values.teams ?? []).map((team) => ({ ...team })),
      achievementCards: (values.achievementCards ?? []).map((card) => ({ ...card })),
      additionalRoles: [...(values.additionalRoles ?? [])], dotabuff: values.dotabuff ?? "" };
  }

  function validAvatar(value) {
    return typeof value === "string" && (value === "" ||
      (value.length <= Math.ceil(maxAvatarSize / 3) * 4 + 32 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)));
  }

  function validPlayer(player) {
    return player && fields.every((field) => typeof player[field] === "string") && player.nickname.trim() &&
      (player.avatar === undefined || validAvatar(player.avatar)) &&
      (player.accentColor === undefined || (typeof player.accentColor === "string" && /^#[a-f\d]{6}$/i.test(player.accentColor))) &&
      (player.theme === undefined || player.theme === "dark" || player.theme === "light") &&
      (player.dotabuff === undefined || (typeof player.dotabuff === "string" && validDotabuff(player.dotabuff))) &&
      (player.additionalRoles === undefined || (Array.isArray(player.additionalRoles) && player.additionalRoles.every((role) => dotaRoles.includes(role)) && new Set(player.additionalRoles).size === player.additionalRoles.length)) &&
      (player.teams === undefined || validTeams(player.teams)) &&
      (player.achievementCards === undefined || validAchievementCards(player.achievementCards));
  }

  function displayAvatar(imageId, placeholderId, value) {
    const image = document.getElementById(imageId);
    const placeholder = document.getElementById(placeholderId);
    image.hidden = !value;
    placeholder.hidden = Boolean(value);
    // A damaged stored image falls back to the same neutral placeholder.
    image.onerror = () => {
      image.hidden = true;
      placeholder.hidden = false;
    };
    if (value) image.src = value;
    else image.removeAttribute("src");
  }

  function refreshAvatar() {
    displayAvatar("avatar-preview", "avatar-placeholder", draftAvatar);
    removeAvatar.disabled = !draftAvatar && !avatarLoading;
    document.getElementById("avatar-controls").setAttribute("aria-busy", String(avatarLoading));
  }

  function waitForAvatar() {
    if (!avatarLoading) return false;
    message("Дождитесь проверки аватара или отмените загрузку кнопкой «Удалить аватар».", true);
    return true;
  }

  function readAvatar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Не удалось прочитать файл. Выберите его ещё раз."));
      reader.onabort = () => reject(new Error("Чтение файла прервано. Выберите его ещё раз."));
      reader.readAsDataURL(file);
    });
  }

  async function checkedAvatar(file) {
    if (!avatarTypes.includes(file.type)) throw new Error("Выберите изображение JPEG, PNG или WebP.");
    if (file.size > maxAvatarSize) throw new Error("Файл больше 2 МБ. Выберите изображение меньшего размера.");
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const matches = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte) :
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!matches) throw new Error("Файл повреждён или его содержимое не соответствует формату изображения.");
    const value = await readAvatar(file);
    const image = new Image();
    image.src = value;
    try {
      await image.decode();
    } catch {
      throw new Error("Не удалось открыть изображение. Возможно, файл повреждён. Выберите другое.");
    }
    return value;
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
    const fail = (text) => {
      if (errorTarget) errorTarget.textContent = text;
      else message(text, true);
      return false;
    };
    if (storageReadFailed) {
      return fail(readError);
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== storedSnapshot || (saved === null && localStorage.getItem(legacyKey) !== legacySnapshot)) {
        return fail("Портфолио изменены в другой вкладке. Данные не записаны, введённые значения остаются в форме. Скопируйте свой черновик, обновите страницу и внесите изменения в актуальные данные.");
      }
    } catch {
      storageReadFailed = true;
      return fail(readError);
    }
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(storageKey, serialized);
      storedSnapshot = serialized;
      state = next;
      return true;
    } catch {
      return fail(writeError);
    }
  }

  function renderPortfolio(player) {
    renderAchievementCards(player.achievementCards ?? []);
    renderTeams(player.teams ?? []);
    displayAvatar("view-avatar", "view-avatar-placeholder", player.avatar ?? "");
    document.getElementById("portfolio-title").textContent = player.nickname;
    const roleCard = document.getElementById("view-additional-roles-card");
    const extra = document.getElementById("view-additional-roles");
    roleCard.hidden = !isDota(player.discipline);
    extra.textContent = (player.additionalRoles ?? []).join(", ") || "Не указаны";
    extra.classList.toggle("empty", !(player.additionalRoles ?? []).length);
    document.getElementById("view-dotabuff-card").hidden = !isDota(player.discipline);
    const link = document.getElementById("view-dotabuff");
    const url = player.dotabuff ?? "";
    link.hidden = !url;
    link.textContent = url;
    if (url) link.href = url;
    else link.removeAttribute("href");
    document.getElementById("view-dotabuff-empty").hidden = Boolean(url);
    for (const field of fields.slice(1)) {
      const target = document.getElementById(`view-${field}`);
      const empty = !player[field].trim();
      target.textContent = empty ? "Не указано" : player[field];
      target.classList.toggle("empty", empty);
    }
  }

  function showPortfolio(player, focus = false) {
    renderPortfolio(player);
    portfolioSummary.hidden = false;
    editButton.hidden = false;
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
      option.textContent = player.nickname;
      select.append(option);
    }
    select.value = state.activeId ?? "";
    renderRoleResults();
  }

  function renderRoleResults() {
    const role = roleFilter.value;
    const matches = state.portfolios.filter((player) => !role ||
      (isDota(player.discipline) && (player.role === role || (player.additionalRoles ?? []).includes(role))));
    roleResults.replaceChildren();
    for (const player of matches) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.textContent = player.nickname;
      if (player.id === state.activeId) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => {
        if (player.id !== state.activeId) requestAction({ type: "switch", id: player.id });
      });
      item.append(button);
      roleResults.append(item);
    }
    roleSearchEmpty.hidden = matches.length > 0;
    roleSearchEmpty.textContent = role ? "Игроков с этой ролью пока нет." : "Пока нет сохранённых портфолио.";
  }

  roleFilter.addEventListener("change", renderRoleResults);

  function loadActive(edit = false, focus = false) {
    avatarRequest += 1;
    avatarLoading = false;
    avatarFile.value = "";
    avatarFile.removeAttribute("aria-invalid");
    avatarError.textContent = "";
    avatarProgress.textContent = "";
    const player = state.portfolios.find((item) => item.id === state.activeId);
    portfolioSummary.hidden = !player;
    editButton.hidden = edit || !player;
    if (player && edit) renderPortfolio(player);
    exportButton.disabled = !player;
    draftAchievementCards = (player?.achievementCards ?? []).map((card) => ({ ...card }));
    achievementsFeedback.textContent = "";
    renderAchievementCards(draftAchievementCards, true);
    draftTeams = (player?.teams ?? []).map((team) => ({ ...team }));
    teamsFeedback.textContent = "";
    renderTeams(draftTeams, true);
    accentColor.value = player?.accentColor ?? defaultAccent;
    theme.value = player?.theme ?? "dark";
    applyAppearance();
    draftAvatar = player?.avatar ?? "";
    refreshAvatar();
    discipline.value = player?.discipline ?? "";
    dotabuff.value = player?.dotabuff ?? "";
    dotabuff.removeAttribute("aria-invalid");
    dotabuffError.hidden = true;
    for (const input of roleCheckboxes) input.checked = (player?.additionalRoles ?? []).includes(input.value);
    updateRoleField(player?.role ?? "");
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

  function validateForm() {
    if (!validateNickname()) return false;
    if (validDotabuff(dotabuff.value.trim())) return true;
    dotabuffField.hidden = false;
    dotabuff.setAttribute("aria-invalid", "true");
    dotabuffError.hidden = false;
    dotabuff.focus();
    return false;
  }

  dotabuff.addEventListener("input", () => {
    dotabuff.removeAttribute("aria-invalid");
    dotabuffError.hidden = true;
  });

  function preparePrint() {
    const player = state.portfolios.find((item) => item.id === state.activeId);
    document.documentElement.dataset.printReady = String(Boolean(player));
    if (!player) return;
    renderPortfolio(player);
    document.documentElement.style.setProperty("--print-accent-ink", readableAccent(player.accentColor ?? defaultAccent, [1], 0));
  }

  async function printSaved() {
    if (printing || waitForAvatar()) return;
    const activeId = state.activeId;
    if (!activeId) return;
    printing = true;
    exportButton.disabled = true;
    try {
      preparePrint();
      await document.fonts.ready;
      const image = document.getElementById("view-avatar");
      if (image.getAttribute("src")) await image.decode().catch(() => {});
      if (state.activeId !== activeId || isDirty() || avatarLoading || document.querySelector("dialog[open]")) {
        message("Данные изменились во время подготовки. Нажмите «Скачать PDF» ещё раз.", true);
        return;
      }
      window.print();
    } catch {
      message("Не удалось открыть окно печати. Проверьте настройки браузера и повторите экспорт.", true);
    } finally {
      printing = false;
      exportButton.disabled = !state.activeId;
    }
  }

  exportButton.addEventListener("click", () => {
    if (printing || waitForAvatar()) return;
    if (isDirty()) {
      exportDialog.showModal();
      document.getElementById("cancel-export").focus();
    } else void printSaved();
  });
  document.getElementById("cancel-export").addEventListener("click", () => exportDialog.close());
  document.getElementById("save-and-print").addEventListener("click", () => {
    exportDialog.close();
    message("");
    if (!validateForm()) return;
    if (!persist(withDraft())) return;
    loadActive(false, true);
    void printSaved();
  });
  window.addEventListener("beforeprint", preparePrint);

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
    if (saveDraft && !validateForm()) return;
    if (action.type === "new") {
      if (saveDraft) {
        if (!persist(withDraft())) return;
        loadActive(true);
        message("Портфолио сохранено в этом браузере.");
      }
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
    if (waitForAvatar()) return;
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
    if (waitForAvatar()) return;
    message("");
    if (!validateForm()) return;
    if (!persist(withDraft())) return;
    loadActive(false, true);
    message("Портфолио сохранено в этом браузере.");
  });

  avatarFile.addEventListener("change", async () => {
    const file = avatarFile.files[0];
    if (!file) return;
    const request = ++avatarRequest;
    avatarFile.value = "";
    avatarError.textContent = "";
    avatarFile.removeAttribute("aria-invalid");
    avatarProgress.textContent = "Проверяем изображение…";
    avatarLoading = true;
    refreshAvatar();
    try {
      const value = await checkedAvatar(file);
      if (request !== avatarRequest) return;
      draftAvatar = value;
      avatarProgress.textContent = "Аватар выбран. Нажмите «Сохранить».";
      message("");
    } catch (error) {
      if (request !== avatarRequest) return;
      avatarError.textContent = error.message || "Не удалось прочитать изображение. Выберите другое.";
      avatarFile.setAttribute("aria-invalid", "true");
      avatarProgress.textContent = "";
    } finally {
      if (request === avatarRequest) {
        avatarLoading = false;
        refreshAvatar();
      }
    }
  });

  removeAvatar.addEventListener("click", () => {
    avatarRequest += 1;
    avatarLoading = false;
    draftAvatar = "";
    avatarFile.value = "";
    avatarFile.removeAttribute("aria-invalid");
    avatarError.textContent = "";
    avatarProgress.textContent = "Аватар удалён из формы. Нажмите «Сохранить».";
    message("");
    refreshAvatar();
    avatarFile.focus();
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
    const next = { ...state, portfolios: [...state.portfolios] };
    const player = makePlayer({ nickname: newNickname.value, discipline: newDiscipline.value });
    next.portfolios.push(player);
    next.activeId = player.id;
    if (!persist(next, createError)) return;
    createDialog.close();
    loadActive(true, true);
    message("Портфолио создано и сохранено. Заполните остальные поля по желанию.");
  });

  document.getElementById("cancel-create").addEventListener("click", () => createDialog.close());
  editButton.addEventListener("click", () => {
    editButton.hidden = true;
    portfolio.hidden = true;
    editor.hidden = false;
    message("");
    nickname.focus();
  });

  window.addEventListener("beforeunload", (event) => {
    if (isDirty() || avatarLoading || (createDialog.open && (newDiscipline.value !== "" || newNickname.value !== "")) ||
      (teamDialog.open && JSON.stringify(teamFormValues()) !== teamFormBaseline) ||
      (achievementDialog.open && JSON.stringify(achievementFormValues()) !== achievementFormBaseline)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  try {
    const saved = localStorage.getItem(storageKey);
    storedSnapshot = saved;
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!validState(parsed)) throw new Error("Invalid saved portfolios");
      state = parsed;
    } else {
      const legacy = localStorage.getItem(legacyKey);
      legacySnapshot = legacy;
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
    storageReadFailed = true;
    message(readError, true);
  }
  loadActive();
})();
