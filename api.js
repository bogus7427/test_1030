// LocalStorage Key
const STORAGE_KEY = "globallog_camping_places";

// State
let places = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let selectedCategoryFilter = "ALL";

// Weather Code Decoder
function decodeWeatherCode(code) {
  const weatherMap = {
    0: { desc: "맑음 (Clear sky)", icon: "fa-sun" },
    1: { desc: "대체로 맑음", icon: "fa-cloud-sun" },
    2: { desc: "구름 조금", icon: "fa-cloud-sun" },
    3: { desc: "흐림", icon: "fa-cloud" },
    45: { desc: "안개", icon: "fa-smog" },
    61: { desc: "비", icon: "fa-cloud-rain" },
    71: { desc: "눈", icon: "fa-snowflake" },
    95: { desc: "뇌우", icon: "fa-bolt" },
  };
  return weatherMap[code] || { desc: "구름 많음", icon: "fa-cloud-sun" };
}

// Initial Load Handler
document.addEventListener("DOMContentLoaded", () => {
  const todayStr = new Date().toISOString().split("T")[0];

  if (document.getElementById("targetDate")) {
    document.getElementById("targetDate").value = todayStr;
    renderPlaces();
  }

  if (document.getElementById("apiDateInput")) {
    document.getElementById("apiDateInput").value = todayStr;
    fetchCustomApiWeather();
    searchGoCampingApi();
  }
});

// ================= index.html: LocalStorage CRUD ================= //

function handleFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById("editId").value;
  const country = document.getElementById("countryInput").value.trim();
  const city = document.getElementById("cityInput").value.trim();
  const category = document.getElementById("categorySelect").value;
  const targetDate = document.getElementById("targetDate").value;
  const placeName = document.getElementById("placeName").value.trim();
  const memo = document.getElementById("memoContent").value.trim();

  if (editId) {
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
      id: Date.now().toString(),
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

  saveToLocalStorage();
  renderPlaces();
  resetForm();
}

function renderPlaces() {
  const container = document.getElementById("placeList");
  if (!container) return;

  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();

  const filtered = places.filter((item) => {
    const matchesSearch =
      item.country.toLowerCase().includes(searchInput) ||
      item.city.toLowerCase().includes(searchInput) ||
      item.placeName.toLowerCase().includes(searchInput) ||
      item.memo.toLowerCase().includes(searchInput);

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
        <i class="fa-solid fa-campground" style="font-size:2.5rem; margin-bottom:10px;"></i>
        <p>등록된 장소가 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const isCamping = item.category === "캠핑장";
      const thankyouUrl = `https://m.mism.co.kr/search?keyword=${encodeURIComponent(item.placeName)}`;

      return `
      <div class="log-item">
        <div class="log-item-header">
          <span class="log-item-title">${escapeHtml(item.placeName)}</span>
          <span class="cat-tag">${item.category}</span>
        </div>
        
        <div class="log-item-location">
          <span><i class="fa-solid fa-earth-americas"></i> ${escapeHtml(item.country)}</span>
          <span>·</span>
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.city)}</span>
        </div>

        <div class="log-item-body">${escapeHtml(item.memo || "작성된 메모가 없습니다.")}</div>

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
          <span><i class="fa-regular fa-calendar"></i> 예정일: ${item.targetDate}</span>
          <div class="log-item-actions">
            <button class="btn-icon" onclick="editPlace('${item.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon delete" onclick="deletePlace('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function filterByCategory(category) {
  selectedCategoryFilter = category;
  document
    .querySelectorAll(".cat-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");
  renderPlaces();
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
  document.getElementById("cancelBtn").style.display = "inline-block";
}

function deletePlace(id) {
  if (confirm("삭제하시겠습니까?")) {
    places = places.filter((item) => item.id !== id);
    saveToLocalStorage();
    renderPlaces();
  }
}

function resetForm() {
  document.getElementById("editId").value = "";
  document.getElementById("placeForm").reset();
  document.getElementById("targetDate").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("formModeTitle").textContent = "여행 장소 등록";
  document.getElementById("saveBtn").innerHTML =
    `<i class="fa-solid fa-floppy-disk"></i> 장소 저장하기`;
  document.getElementById("cancelBtn").style.display = "none";
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ================= api.html: Open-Meteo & GoCamping API ================= //

async function fetchCustomApiWeather() {
  const cityQuery =
    document.getElementById("apiCityInput").value.trim() || "Daegu";
  const targetDate = document.getElementById("apiDateInput").value;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      alert("입력한 도시를 찾을 수 없습니다.");
      return;
    }

    const loc = geoData.results[0];
    const lat = loc.latitude;
    const lon = loc.longitude;
    const locationName = `${loc.name}, ${loc.country || ""}`;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,relativehumidity_2m,weathercode,windspeed_10m&timezone=auto`;

    document.getElementById("apiEndpointUrl").textContent = weatherUrl;

    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    updateApiPageUI(locationName, targetDate, lat, lon, weatherData);
  } catch (err) {
    console.error("API Error:", err);
  }
}

function updateApiPageUI(locationName, dateStr, lat, lon, data) {
  const hourly = data.hourly;
  if (!hourly || !hourly.temperature_2m) return;

  const midIndex = 12;
  const currentTemp =
    hourly.temperature_2m[midIndex] ?? hourly.temperature_2m[0];
  const currentCode = hourly.weathercode[midIndex] ?? hourly.weathercode[0];
  const wind = hourly.windspeed_10m[midIndex] ?? "--";
  const humidity = hourly.relativehumidity_2m[midIndex] ?? "--";

  const decoded = decodeWeatherCode(currentCode);

  document.getElementById("apiLocationText").textContent = locationName;
  document.getElementById("apiDateText").textContent =
    `${dateStr} (12:00 기준)`;
  document.getElementById("apiTempText").textContent = `${currentTemp}°C`;
  document.getElementById("apiDescText").textContent = decoded.desc;
  document.getElementById("apiWeatherIcon").innerHTML =
    `<i class="fa-solid ${decoded.icon}"></i>`;

  document.getElementById("apiWindText").textContent = `${wind} km/h`;
  document.getElementById("apiHumidityText").textContent = `${humidity} %`;
  document.getElementById("apiCoordsText").textContent =
    `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const hourlyContainer = document.getElementById("hourlyContainer");
  let hourlyCardsHtml = "";

  for (let i = 0; i < hourly.time.length; i += 2) {
    const timeStr = hourly.time[i].split("T")[1];
    const temp = hourly.temperature_2m[i];
    const code = hourly.weathercode[i];
    const info = decodeWeatherCode(code);

    hourlyCardsHtml += `
      <div class="hourly-card">
        <span class="time">${timeStr}</span>
        <i class="fa-solid ${info.icon}"></i>
        <span class="temp">${temp}°C</span>
      </div>
    `;
  }

  hourlyContainer.innerHTML = hourlyCardsHtml;
}

// 한국관광공사 고캠핑 (GoCamping) API 연동 함수
async function searchGoCampingApi() {
  const query =
    document.getElementById("campingSearchInput").value.trim() || "대가야";
  const container = document.getElementById("campingApiList");
  if (!container) return;

  // 샘플 공공 API 데이터 구성 및 연동 구조
  const sampleCampings = [
    {
      name: `${query} 오토캠핑장`,
      addr: "경상북도 고령군 대가야읍 고령공원길",
      sbrs: "전기, 온수, 와이파이, 산책로",
    },
    {
      name: `${query} 자연휴양림 캠핑장`,
      addr: "경상북도 고령군 운수면 봉평리",
      sbrs: "전기, 화장실, 놀이터, 매점",
    },
    {
      name: `${query} 힐링 캠핑파크`,
      addr: "경상북도 고령군 다산면 다산길",
      sbrs: "전기, 샤워실, 물놀이장",
    },
  ];

  container.innerHTML = sampleCampings
    .map(
      (c) => `
    <div class="camp-card">
      <div class="camp-title">⛺ ${escapeHtml(c.name)}</div>
      <div class="camp-addr"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.addr)}</div>
      <div class="camp-facility"><i class="fa-solid fa-plug"></i> 부대시설: ${escapeHtml(c.sbrs)}</div>
      <a href="https://m.mism.co.kr/search?keyword=${encodeURIComponent(c.name)}" target="_blank" class="thankyou-btn">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> 땡큐캠핑에서 실시간 예약
      </a>
    </div>
  `,
    )
    .join("");
}
