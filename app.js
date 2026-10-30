const STORAGE_KEY = "globallog_camping_places";
const SEARCH_QUERY_KEY = "globallog_place_search";
const TODO_STORAGE_KEY = "weath_way_todos";

let places = loadPlaces();
let todos = loadTodos();
let selectedCategoryFilter = "ALL";
let linkedTravelPlace = "";

function decodeWeatherCode(code) {
  const weatherMap = {
    0: { desc: "맑음", icon: "fa-sun" },
    1: { desc: "대체로 맑음", icon: "fa-cloud-sun" },
    2: { desc: "구름 조금", icon: "fa-cloud-sun" },
    3: { desc: "흐림", icon: "fa-cloud" },
    45: { desc: "안개", icon: "fa-smog" },
    48: { desc: "서리 안개", icon: "fa-smog" },
    51: { desc: "약한 이슬비", icon: "fa-cloud-rain" },
    53: { desc: "이슬비", icon: "fa-cloud-rain" },
    55: { desc: "강한 이슬비", icon: "fa-cloud-rain" },
    61: { desc: "비", icon: "fa-cloud-rain" },
    63: { desc: "비", icon: "fa-cloud-showers-heavy" },
    65: { desc: "강한 비", icon: "fa-cloud-showers-heavy" },
    71: { desc: "눈", icon: "fa-snowflake" },
    73: { desc: "눈", icon: "fa-snowflake" },
    75: { desc: "강한 눈", icon: "fa-snowflake" },
    80: { desc: "소나기", icon: "fa-cloud-rain" },
    81: { desc: "소나기", icon: "fa-cloud-showers-heavy" },
    82: { desc: "강한 소나기", icon: "fa-cloud-showers-heavy" },
    95: { desc: "뇌우", icon: "fa-bolt" },
    96: { desc: "우박을 동반한 뇌우", icon: "fa-cloud-bolt" },
    99: { desc: "강한 우박을 동반한 뇌우", icon: "fa-cloud-bolt" },
  };
  return weatherMap[code] || { desc: "날씨 정보 없음", icon: "fa-cloud" };
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadPlaces() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) {
      throw new Error("저장된 장소 데이터가 올바른 형식이 아닙니다.");
    }

    return stored.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.country === "string" &&
        typeof item.city === "string" &&
        typeof item.category === "string" &&
        typeof item.targetDate === "string" &&
        typeof item.placeName === "string" &&
        typeof item.memo === "string",
    );
  } catch (error) {
    console.error("저장된 여행 장소를 불러오지 못했습니다.", error);
    return [];
  }
}

function loadTodos() {
  try {
    const stored = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) {
      throw new Error("저장된 할 일 데이터가 올바른 형식이 아닙니다.");
    }

    return stored.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.priority === "string" &&
        typeof item.memo === "string" &&
        typeof item.completed === "boolean",
    );
  } catch (error) {
    console.error("할 일 목록을 불러오지 못했습니다.", error);
    return [];
  }
}

function loadSearchQuery() {
  try {
    return sessionStorage.getItem(SEARCH_QUERY_KEY) || "";
  } catch (error) {
    console.error("여행 리스트 검색어를 불러오지 못했습니다.", error);
    return "";
  }
}

function saveSearchQuery(query) {
  try {
    sessionStorage.setItem(SEARCH_QUERY_KEY, query);
  } catch (error) {
    console.error("여행 리스트 검색어를 저장하지 못했습니다.", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const todayStr = getLocalDateString();

  if (document.getElementById("targetDate")) {
    const searchInput = document.getElementById("searchInput");
    document.getElementById("targetDate").value = todayStr;
    document.getElementById("placeForm").addEventListener("submit", handleFormSubmit);
    document.getElementById("cancelBtn").addEventListener("click", resetForm);
    searchInput.value = loadSearchQuery();
    searchInput.addEventListener("input", () => {
      saveSearchQuery(searchInput.value);
      renderPlaces();
    });
    document.getElementById("placeList").addEventListener("click", handlePlaceAction);
    document.querySelectorAll(".cat-btn[data-category]").forEach((button) => {
      button.addEventListener("click", () => filterByCategory(button.dataset.category));
    });
    document.getElementById("todoForm").addEventListener("submit", handleTodoSubmit);
    document.getElementById("todoCancelButton").addEventListener("click", resetTodoForm);
    document.getElementById("todoList").addEventListener("click", handleTodoAction);
    document.getElementById("todoList").addEventListener("change", handleTodoToggle);
    renderPlaces();
    renderTodos();
  }

  if (document.getElementById("apiDateInput")) {
    const query = new URLSearchParams(window.location.search);
    const linkedCity = query.get("city");
    const linkedDate = query.get("date");
    linkedTravelPlace = query.get("place") || "";
    document.getElementById("apiCityInput").value = linkedCity || "Daegu";
    document.getElementById("apiDateInput").value =
      linkedDate && /^\d{4}-\d{2}-\d{2}$/.test(linkedDate) ? linkedDate : todayStr;
    if (linkedTravelPlace) {
      document.getElementById("mapWeatherSummary").textContent =
        `여행 기록: ${linkedTravelPlace} · 날씨 정보를 불러오는 중입니다.`;
    }
    document.getElementById("weatherSearchForm").addEventListener("submit", (event) => {
      event.preventDefault();
      fetchCustomApiWeather();
    });
    document.getElementById("campingSearchForm").addEventListener("submit", (event) => {
      event.preventDefault();
      searchGoCampingApi();
    });
    searchGoCampingApi();
    fetchCustomApiWeather();
  }
});

function handleFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById("editId").value;
  const country = document.getElementById("countryInput").value.trim();
  const city = document.getElementById("cityInput").value.trim();
  const category = document.getElementById("categorySelect").value;
  const targetDate = document.getElementById("targetDate").value;
  const placeName = document.getElementById("placeName").value.trim();
  const memo = document.getElementById("memoContent").value.trim();
  if (!country || !city || !targetDate || !placeName) {
    return;
  }

  const previousPlaces = places;
  if (editId) {
    if (!places.some((item) => item.id === editId)) {
      resetForm();
      return;
    }
    places = places.map((item) => {
      if (item.id === editId) {
        return {
          ...item,
          country,
          city,
          category,
          targetDate,
          placeName,
          memo,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
  } else {
    const newPlace = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      country,
      city,
      category,
      targetDate,
      placeName,
      memo,
      createdAt: new Date().toISOString(),
    };
    places.unshift(newPlace);
  }

  if (!saveToLocalStorage()) {
    places = previousPlaces;
    return;
  }
  renderPlaces();
  resetForm();
}

function renderPlaces() {
  const container = document.getElementById("placeList");
  if (!container) return;

  const searchInput = document.getElementById("searchInput").value.trim().toLocaleLowerCase();

  const filtered = places.filter((item) => {
    const matchesSearch = [
      item.country,
      item.city,
      item.placeName,
      item.category,
      item.targetDate,
      item.memo,
    ].some((value) => value.toLocaleLowerCase().includes(searchInput));

    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      item.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  document.getElementById("placeCountBadge").textContent =
    `${filtered.length}개 장소`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-campground" aria-hidden="true"></i>
        <p>${searchInput || selectedCategoryFilter !== "ALL" ? "조건에 맞는 장소가 없습니다." : "등록된 장소가 없습니다."}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const isCamping = item.category === "캠핑장";
      const thankyouUrl = `https://m.mism.co.kr/search?keyword=${encodeURIComponent(item.placeName)}`;
      const weatherUrl = new URL("api.html", window.location.href);
      weatherUrl.searchParams.set("city", `${item.city}, ${item.country}`);
      weatherUrl.searchParams.set("date", item.targetDate);
      weatherUrl.searchParams.set("place", item.placeName);
      const category = escapeHtml(item.category);

      return `
      <div class="log-item">
        <div class="log-item-header">
          <a class="log-item-title trip-weather-link" href="${escapeHtml(weatherUrl.toString())}">${escapeHtml(item.placeName)}</a>
          <span class="cat-tag">${category}</span>
        </div>
        
        <div class="log-item-location">
          <span><i class="fa-solid fa-earth-americas"></i> ${escapeHtml(item.country)}</span>
          <span>·</span>
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.city)}</span>
        </div>

        <div class="log-item-body">${escapeHtml(item.memo || "작성된 메모가 없습니다.")}</div>

        <a class="trip-weather-link" href="${escapeHtml(weatherUrl.toString())}">
          <i class="fa-solid fa-cloud-sun" aria-hidden="true"></i> 날씨 · 지도 보기
        </a>

        ${
          isCamping
            ? `
          <a href="${thankyouUrl}" target="_blank" rel="noopener noreferrer" class="thankyou-btn">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> 땡큐캠핑 바로 검색/예약
          </a>
        `
            : ""
        }

        <div class="log-item-footer">
          <span><i class="fa-regular fa-calendar"></i> 예정일: ${escapeHtml(item.targetDate)}</span>
          <div class="log-item-actions">
            <button class="btn-icon" type="button" data-action="edit" data-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.placeName)} 수정"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>
            <button class="btn-icon delete" type="button" data-action="delete" data-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.placeName)} 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function filterByCategory(category) {
  selectedCategoryFilter = category;
  document.querySelectorAll(".cat-btn[data-category]").forEach((button) => {
    const isActive = button.dataset.category === category;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderPlaces();
}

function handlePlaceAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  if (button.dataset.action === "edit") {
    editPlace(button.dataset.id);
  } else if (button.dataset.action === "delete") {
    deletePlace(button.dataset.id);
  }
}

function editPlace(id) {
  const item = places.find((p) => p.id === id);
  if (!item) return;

  document.getElementById("editId").value = item.id;
  document.getElementById("countryInput").value = item.country;
  document.getElementById("cityInput").value = item.city;
  document.getElementById("categorySelect").value = item.category;
  document.getElementById("targetDate").value = item.targetDate;
  document.getElementById("placeName").value = item.placeName;
  document.getElementById("memoContent").value = item.memo;

  document.getElementById("formModeTitle").textContent = "장소 정보 수정";
  document.getElementById("saveBtn").innerHTML =
    `<i class="fa-solid fa-pen"></i> 수정 완료`;
  document.getElementById("cancelBtn").hidden = false;
}

function deletePlace(id) {
  if (!window.confirm("이 여행 장소를 삭제하시겠습니까?")) {
    return;
  }

  const previousPlaces = places;
  places = places.filter((item) => item.id !== id);
  if (!saveToLocalStorage()) {
    places = previousPlaces;
    return;
  }
  if (document.getElementById("editId").value === id) {
    resetForm();
  }
  renderPlaces();
}

function resetForm() {
  document.getElementById("editId").value = "";
  document.getElementById("placeForm").reset();
  document.getElementById("targetDate").value = getLocalDateString();
  document.getElementById("formModeTitle").textContent = "여행 장소 등록";
  document.getElementById("saveBtn").innerHTML =
    `<i class="fa-solid fa-floppy-disk"></i> 장소 저장하기`;
  document.getElementById("cancelBtn").hidden = true;
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    return true;
  } catch (error) {
    console.error("여행 장소를 저장하지 못했습니다.", error);
    window.alert("장소를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    return false;
  }
}

function handleTodoSubmit(event) {
  event.preventDefault();
  const title = document.getElementById("todoTitle").value.trim();
  const priority = document.getElementById("todoPriority").value;
  const memo = document.getElementById("todoMemo").value.trim();
  const editId = document.getElementById("todoEditId").value;
  if (!title) return;

  const previousTodos = todos;
  if (editId) {
    todos = todos.map((todo) =>
      todo.id === editId
        ? { ...todo, title, priority, memo, updatedAt: new Date().toISOString() }
        : todo,
    );
  } else {
    todos = [
      {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        priority,
        memo,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...todos,
    ];
  }

  if (!saveTodos()) {
    todos = previousTodos;
    return;
  }
  resetTodoForm();
  renderTodos();
}

function handleTodoAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const todo = todos.find((item) => item.id === button.dataset.id);
  if (!todo) return;
  if (button.dataset.action === "edit") {
    document.getElementById("todoEditId").value = todo.id;
    document.getElementById("todoTitle").value = todo.title;
    document.getElementById("todoPriority").value = todo.priority;
    document.getElementById("todoMemo").value = todo.memo;
    document.getElementById("todoSaveButton").innerHTML =
      '<i class="fa-solid fa-pen" aria-hidden="true"></i> 수정 완료';
    document.getElementById("todoCancelButton").hidden = false;
    document.getElementById("todoTitle").focus();
    return;
  }
  if (button.dataset.action === "delete") {
    if (!window.confirm(`"${todo.title}" 할 일을 삭제할까요?`)) return;
    const previousTodos = todos;
    todos = todos.filter((item) => item.id !== todo.id);
    if (!saveTodos()) todos = previousTodos;
    if (document.getElementById("todoEditId").value === todo.id) resetTodoForm();
    renderTodos();
  }
}

function handleTodoToggle(event) {
  const checkbox = event.target;
  if (!checkbox.matches('input[data-action="toggle"]')) return;

  const previousTodos = todos;
  todos = todos.map((todo) =>
    todo.id === checkbox.dataset.id
      ? { ...todo, completed: checkbox.checked, updatedAt: new Date().toISOString() }
      : todo,
  );
  if (!saveTodos()) todos = previousTodos;
  renderTodos();
}

function renderTodos() {
  const container = document.getElementById("todoList");
  if (!container) return;

  const remaining = todos.filter((todo) => !todo.completed).length;
  document.getElementById("todoCountBadge").textContent = `${remaining}개 남음`;
  if (todos.length === 0) {
    container.innerHTML = '<li class="todo-empty">등록된 할 일이 없습니다.</li>';
    return;
  }

  const priorityClass = { 높음: "high", 보통: "normal", 낮음: "low" };
  container.innerHTML = [...todos]
    .sort((a, b) => Number(a.completed) - Number(b.completed))
    .map(
      (todo) => `
        <li class="todo-item${todo.completed ? " is-complete" : ""}">
          <label class="todo-check">
            <input type="checkbox" data-action="toggle" data-id="${escapeHtml(todo.id)}" ${todo.completed ? "checked" : ""} />
            <span class="sr-only">${escapeHtml(todo.title)} 완료</span>
          </label>
          <div class="todo-item-content">
            <div class="todo-item-heading">
              <span class="todo-item-title">${escapeHtml(todo.title)}</span>
              <span class="todo-priority ${priorityClass[todo.priority] || "normal"}">${escapeHtml(todo.priority)}</span>
            </div>
            ${todo.memo ? `<p class="todo-item-memo">${escapeHtml(todo.memo)}</p>` : ""}
          </div>
          <div class="todo-item-actions">
            <button type="button" class="btn-icon" data-action="edit" data-id="${escapeHtml(todo.id)}" aria-label="${escapeHtml(todo.title)} 수정"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>
            <button type="button" class="btn-icon delete" data-action="delete" data-id="${escapeHtml(todo.id)}" aria-label="${escapeHtml(todo.title)} 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
          </div>
        </li>
      `,
    )
    .join("");
}

function resetTodoForm() {
  document.getElementById("todoForm").reset();
  document.getElementById("todoEditId").value = "";
  document.getElementById("todoSaveButton").innerHTML =
    '<i class="fa-solid fa-plus" aria-hidden="true"></i> 할 일 추가';
  document.getElementById("todoCancelButton").hidden = true;
}

function saveTodos() {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch (error) {
    console.error("할 일 목록을 저장하지 못했습니다.", error);
    window.alert("할 일을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    return false;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchCustomApiWeather() {
  const cityQuery = document.getElementById("apiCityInput").value.trim();
  const targetDate = document.getElementById("apiDateInput").value;
  const status = document.getElementById("weatherStatus");
  const searchButton = document.getElementById("weatherSearchButton");
  if (!cityQuery || !targetDate) {
    status.textContent = "도시와 날짜를 입력해 주세요.";
    return;
  }

  searchButton.disabled = true;
  status.textContent = "도시와 날씨 정보를 불러오는 중입니다...";

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`도시 검색에 실패했습니다: ${geoRes.status}`);
    }
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      status.textContent = "도시를 찾을 수 없습니다. 영문 도시 이름으로 다시 검색해 주세요.";
      return;
    }

    const loc = geoData.results[0];
    const lat = loc.latitude;
    const lon = loc.longitude;
    const locationName = [loc.name, loc.admin1, loc.country]
      .filter((name, index, names) => name && names.indexOf(name) === index)
      .join(", ");
    const isHistorical = targetDate < getLocalDateString();
    const endpoint = isHistorical
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      start_date: targetDate,
      end_date: targetDate,
      hourly: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      timezone: "auto",
    });
    if (!isHistorical) {
      params.set(
        "current",
        "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      );
    }
    const weatherUrl = `${endpoint}?${params}`;

    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      throw new Error(`날씨 요청에 실패했습니다: ${weatherRes.status}`);
    }
    const weatherData = await weatherRes.json();

    updateApiPageUI(locationName, targetDate, lat, lon, weatherData);
    status.textContent = `${locationName} 날씨 정보를 불러왔습니다.`;

    try {
      const forecastParams = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        forecast_days: "7",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
      });
      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?${forecastParams}`,
      );
      if (!forecastRes.ok) {
        throw new Error(`주간 예보 요청에 실패했습니다: ${forecastRes.status}`);
      }
      updateWeeklyForecast(await forecastRes.json());
    } catch (forecastError) {
      console.error("주간 예보를 불러오지 못했습니다.", forecastError);
      document.getElementById("weeklyForecastContainer").textContent =
        "주간 예보를 불러오지 못했습니다. 잠시 후 다시 조회해 주세요.";
      status.textContent = `${locationName}의 선택 날짜 날씨는 표시했지만, 주간 예보를 불러오지 못했습니다.`;
    }
  } catch (err) {
    console.error("날씨 정보를 불러오지 못했습니다.", err);
    status.textContent = "날씨 정보를 불러오지 못했습니다. 날짜와 인터넷 연결을 확인해 주세요.";
    document.getElementById("hourlyContainer").replaceChildren();
    document.getElementById("weeklyForecastContainer").replaceChildren();
  } finally {
    searchButton.disabled = false;
  }
}

function updateApiPageUI(locationName, dateStr, lat, lon, data) {
  const hourly = data.hourly;
  if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.temperature_2m) || hourly.temperature_2m.length === 0) {
    throw new Error("시간별 날씨 정보가 응답에 없습니다.");
  }

  const weatherCodes = hourly.weather_code || hourly.weathercode || [];
  const windSpeeds = hourly.wind_speed_10m || hourly.windspeed_10m || [];
  const humidities = hourly.relative_humidity_2m || hourly.relativehumidity_2m || [];
  const midIndex = Math.min(12, hourly.temperature_2m.length - 1);
  const current = dateStr === getLocalDateString() ? data.current : null;
  const currentTemp = current?.temperature_2m ?? hourly.temperature_2m[midIndex];
  const currentCode =
    current?.weather_code ?? current?.weathercode ?? weatherCodes[midIndex] ?? weatherCodes[0];
  const wind = current?.wind_speed_10m ?? current?.windspeed_10m ?? windSpeeds[midIndex];
  const humidity =
    current?.relative_humidity_2m ??
    current?.relativehumidity_2m ??
    humidities[midIndex];

  const decoded = decodeWeatherCode(currentCode);

  document.getElementById("apiLocationText").textContent = locationName;
  document.getElementById("apiDateText").textContent =
    `${dateStr} (${current ? "현재" : "12:00 기준"})`;
  document.getElementById("apiTempText").textContent =
    currentTemp === null || currentTemp === undefined ? "--°C" : `${currentTemp}°C`;
  document.getElementById("apiDescText").textContent = decoded.desc;
  document.getElementById("apiWeatherIcon").innerHTML =
    `<i class="fa-solid ${decoded.icon}"></i>`;

  document.getElementById("apiWindText").textContent =
    wind === null || wind === undefined ? "-- km/h" : `${wind} km/h`;
  document.getElementById("apiHumidityText").textContent =
    humidity === null || humidity === undefined ? "-- %" : `${humidity} %`;
  document.getElementById("apiCoordsText").textContent =
    `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  updateWeatherMap(
    locationName,
    dateStr,
    lat,
    lon,
    currentTemp,
    decoded,
    linkedTravelPlace,
  );

  const hourlyContainer = document.getElementById("hourlyContainer");
  hourlyContainer.replaceChildren();
  for (let i = 0; i < hourly.time.length; i += 2) {
    const timeStr = hourly.time[i].split("T")[1] || "--:--";
    const temp = hourly.temperature_2m[i];
    const code = weatherCodes[i];
    const info = decodeWeatherCode(code);
    const card = document.createElement("div");
    card.className = "hourly-card";
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = timeStr;
    const icon = document.createElement("i");
    icon.className = `fa-solid ${info.icon}`;
    icon.setAttribute("aria-label", info.desc);
    const temperature = document.createElement("span");
    temperature.className = "temp";
    temperature.textContent =
      temp === null || temp === undefined ? "--°C" : `${temp}°C`;
    card.append(time, icon, temperature);
    hourlyContainer.append(card);
  }
}

function updateWeeklyForecast(data) {
  const daily = data.daily;
  const container = document.getElementById("weeklyForecastContainer");
  if (
    !Array.isArray(daily?.time) ||
    !Array.isArray(daily?.temperature_2m_max) ||
    !Array.isArray(daily?.temperature_2m_min) ||
    daily.time.length === 0
  ) {
    throw new Error("주간 예보 정보가 응답에 없습니다.");
  }

  const codes = daily.weather_code || daily.weathercode || [];
  const precipitation = daily.precipitation_probability_max || [];
  container.replaceChildren();
  daily.time.forEach((date, index) => {
    const info = decodeWeatherCode(codes[index]);
    const card = document.createElement("article");
    card.className = "weekly-day-card";
    const dateLabel = document.createElement("strong");
    dateLabel.textContent = new Date(`${date}T12:00:00`).toLocaleDateString(
      "ko-KR",
      { month: "numeric", day: "numeric", weekday: "short" },
    );
    const icon = document.createElement("i");
    icon.className = `fa-solid ${info.icon}`;
    icon.setAttribute("aria-label", info.desc);
    const description = document.createElement("span");
    description.className = "weekly-condition";
    description.textContent = info.desc;
    const temperatures = document.createElement("span");
    temperatures.className = "weekly-temperatures";
    temperatures.textContent =
      `${daily.temperature_2m_min[index] ?? "--"}° / ${daily.temperature_2m_max[index] ?? "--"}°`;
    const rain = document.createElement("small");
    rain.textContent = `강수 확률 ${precipitation[index] ?? "--"}%`;
    card.append(dateLabel, icon, description, temperatures, rain);
    container.append(card);
  });
}

function updateWeatherMap(
  locationName,
  date,
  lat,
  lon,
  temperature,
  weather,
  travelPlace = "",
) {
  const map = document.getElementById("weatherMap");
  const mapLink = document.getElementById("weatherMapLink");
  const mapIcon = document.getElementById("mapWeatherIcon");
  const mapSummary = document.getElementById("mapWeatherSummary");
  if (!map || !mapLink || !mapIcon || !mapSummary) {
    return;
  }

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("지도 좌표가 올바르지 않습니다.");
  }

  const latitudeDelta = 0.08;
  const longitudeDelta = 0.12;
  const bounds = [
    Math.max(-180, longitude - longitudeDelta),
    Math.max(-85, latitude - latitudeDelta),
    Math.min(180, longitude + longitudeDelta),
    Math.min(85, latitude + latitudeDelta),
  ];
  const embedUrl = new URL("https://www.openstreetmap.org/export/embed.html");
  embedUrl.searchParams.set("bbox", bounds.join(","));
  embedUrl.searchParams.set("layer", "mapnik");
  embedUrl.searchParams.set("marker", `${latitude},${longitude}`);

  const fullMapUrl = new URL("https://www.openstreetmap.org/");
  fullMapUrl.searchParams.set("mlat", String(latitude));
  fullMapUrl.searchParams.set("mlon", String(longitude));
  fullMapUrl.hash = `map=11/${latitude}/${longitude}`;

  map.src = embedUrl.toString();
  mapLink.href = fullMapUrl.toString();
  const icon = document.createElement("i");
  icon.className = `fa-solid ${weather.icon}`;
  icon.setAttribute("aria-hidden", "true");
  mapIcon.replaceChildren(icon);
  mapSummary.textContent =
    `${travelPlace ? `${travelPlace} · ` : ""}${locationName} · ${date} · ${temperature ?? "--"}°C · ${weather.desc}`;
}

function searchGoCampingApi() {
  const query = document.getElementById("campingSearchInput").value.trim();
  const container = document.getElementById("campingApiList");
  const status = document.getElementById("campingStatus");
  if (!container || !status || !query) {
    return;
  }

  status.textContent = "캠핑장 미리보기 예시입니다. 실제 캠핑장 정보와 예약 가능 여부는 제휴 사이트에서 확인해 주세요.";
  const sampleCampings = [
    {
      name: `${query} 캠핑장 검색`,
      addr: "검색 지역 예시 · 방문 전 실제 주소 확인",
      sbrs: "캠핑 사이트에서 운영 정보 확인",
    },
    {
      name: `${query} 오토캠핑`,
      addr: "검색어 기반 추천 카테고리",
      sbrs: "전기 · 온수 · 편의시설 여부 확인",
    },
    {
      name: `${query} 자연 캠핑`,
      addr: "주변 자연 캠핑 장소 검색",
      sbrs: "운영 일정과 이용 조건 확인",
    },
  ];

  container.replaceChildren();
  sampleCampings.forEach((camp, index) => {
    const card = document.createElement("article");
    card.className = "camp-card";
    const title = document.createElement("h4");
    title.className = "camp-title";
    title.textContent = `⛺ ${camp.name}`;
    const address = document.createElement("p");
    address.className = "camp-addr";
    address.textContent = camp.addr;
    const facilities = document.createElement("p");
    facilities.className = "camp-facility";
    facilities.textContent = `확인 항목: ${camp.sbrs}`;
    const link = document.createElement("a");
    link.className = "thankyou-btn";
    link.href = `https://m.mism.co.kr/search?keyword=${encodeURIComponent(query)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = index === 0 ? "예약 사이트에서 검색 ↗" : "검색어로 캠핑장 찾기 ↗";
    card.append(title, address, facilities, link);
    container.append(card);
  });
}
