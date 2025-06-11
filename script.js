function toggleMenu(hamburger) {
  hamburger.classList.toggle('active');
  const menu = document.querySelector('.menu');
  menu.classList.toggle('active');
}

function toggleMenu(x) {
  x.classList.toggle("active");
  const menu = document.querySelector(".menu");
  menu.classList.toggle("active");

  const header = document.querySelector("header");
  if (menu.classList.contains("active")) {
    header.classList.add("menu-active");
  } else {
    header.classList.remove("menu-active");
  }
}

function stc(s) {
  let result = '';
  if (s.indexOf(' ') != -1) {
    strings = s.split(' ');
    for (let i = 0; i < strings.length; i++) {
      result += strings[i].toLowerCase();
    }
    // return strings[0].toLowerCase() + strings[1].toLowerCase();
  } else {
    result = s;
  }
  return result;
  // return s.join("").toLowerCase();
}
console.log(stc('without'))
// console.log(stc("Something funny"));
document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("history-dropdown");
  renderDropdown();
  const apiKey = "FJRSbuYqibtsaSqx8ey2rB4kjsGMUL3R";
  const baseUrl = "https://dataservice.accuweather.com";

  const searchBtn = document.getElementById("search-btn");
  const cityInput = document.getElementById("search-city");
  const cardsContainer = document.getElementById("weather-cards");
  const REQUEST_INTERVAL_MS = 5000;


  const MAX_HISTORY = 5;

  function saveToHistory(city) {
    let history = JSON.parse(localStorage.getItem("cityHistory")) || [];
    city = city.trim();

    history = history.filter(c => c.toLowerCase() !== city.toLowerCase());

    history.unshift(city);
    if (history.length > MAX_HISTORY) history.pop(); // Keep latest 5

    localStorage.setItem("cityHistory", JSON.stringify(history));
    renderDropdown();
  }

  function renderDropdown() {
    const history = JSON.parse(localStorage.getItem("cityHistory")) || [];
    dropdown.innerHTML = "";

    history.forEach(city => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = city;
      item.onclick = () => {
        cityInput.value = city;
        searchBtn.click();
      };
      dropdown.appendChild(item);
    });

    dropdown.style.display = history.length ? "block" : "none";
  }

  function canMakeRequest() {
    const lastRequest = localStorage.getItem("lastWeatherRequest");
    const now = Date.now();

    if (!lastRequest || now - parseInt(lastRequest) > REQUEST_INTERVAL_MS) {
      localStorage.setItem("lastWeatherRequest", now);
      return true;
    }

    return false;
  }

  searchBtn.addEventListener("click", () => {
    const city = stc(cityInput.value);
    if (!city) return alert("Please enter a city");

    if (!canMakeRequest()) {
      alert("You're searching too quickly. Please wait a few seconds.");
      return;
    }
    saveToHistory(city);
    getLocationKey(city);
  });

  async function getLocationKey(city) {
    try {
      const res = await fetch(`https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${city}`);
      const data = await res.json();
      if (!data.length) return alert("City not found");
      const locationKey = data[0].Key;
      getWeatherData(locationKey, data[0].LocalizedName);
    } catch (err) {
      alert("Error fetching city.");
      console.error(err);
    }
  }

  async function getWeatherData(key, cityName) {
    try {
      const [currentRes, hourlyRes, dailyRes] = await Promise.all([
        fetch(`${baseUrl}/currentconditions/v1/${key}?apikey=${apiKey}`),
        fetch(`${baseUrl}/forecasts/v1/hourly/12hour/${key}?apikey=${apiKey}&metric=true`),
        fetch(`${baseUrl}/forecasts/v1/daily/1day/${key}?apikey=${apiKey}&metric=true`)
      ]);
      const current = await currentRes.json();
      const hourly = await hourlyRes.json();
      const daily = await dailyRes.json();

      renderCards(current[0], hourly, daily.DailyForecasts[0], cityName);
    } catch (err) {
      alert("Weather data fetch error.");
      console.error(err);
    }
  }

  function createCard(title, content, expandedContent = "") {
    const card = document.createElement("div");
    card.className = "weather-card";
    card.innerHTML = `
    <h2>${title}</h2>
    <div class="weather-info">${content}</div>
    <div class="expanded-section">${expandedContent}</div>
  `;

    card.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });

    return card;
  }

  function generateHourlyDetails(hourly) {
    return hourly.map(h => {
      const time = new Date(h.DateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
      <div style="margin-bottom: 10px;">
        <strong>${time}</strong>: ${h.Temperature.Value}°C - ${h.IconPhrase}
      </div>
    `;
    }).join("");
  }

  function renderCards(current, hourly, daily, city) {
    cardsContainer.innerHTML = "";

    const currentCard = createCard("Current Weather", `
    <img src="https://img.icons8.com/ios-filled/50/ffffff/partly-cloudy-day--v1.png" />
    <div>
      <p class="temp">${current.Temperature.Metric.Value}°C</p>
      <p>${current.WeatherText}</p>
      <p>Humidity: ${current.RelativeHumidity}%</p>
    </div>`,
      `<p>Feels Like: ${current.RealFeelTemperature && current.RealFeelTemperature.Metric ? current.RealFeelTemperature.Metric.Value : "N/A"}°C</p>
    <p>Visibility: ${current.Visibility && current.Visibility.Metric ? current.Visibility.Metric.Value : "N/A"} km</p>
    <p>UV Index: ${typeof current.UVIndex !== "undefined" ? current.UVIndex : "N/A"} ${current.UVIndexText ? "(" + current.UVIndexText + ")" : ""}</p>
    `);

    const hourlyCard = createCard("12-Hour Forecast",
      `<img src="https://img.icons8.com/ios-filled/50/ffffff/rain.png" />
    <div>
      <p class="temp">${hourly[0].Temperature.Value}°C - ${hourly[hourly.length - 1].Temperature.Value}°C</p>
      <p>${hourly[0].IconPhrase} → ${hourly[hourly.length - 1].IconPhrase}</p>
    </div>`, generateHourlyDetails(hourly));

    const dailyCard = createCard("Tomorrow", `
    <img src="https://img.icons8.com/ios-filled/50/ffffff/storm.png" />
    <div>
      <p class="temp">${daily.Temperature.Minimum.Value}°C - ${daily.Temperature.Maximum.Value}°C</p>
      <p>${daily.Day.IconPhrase}</p>
      <p>${daily.Day.HasPrecipitation ? "Rain: " + daily.Day.PrecipitationType : "No rain expected"}</p>
    </div>`,
      `<p>Sunrise: ${daily.Sun && daily.Sun.Rise ? daily.Sun.Rise.split("T")[1] : "N/A"}</p>
    <p>Sunset: ${daily.Sun && daily.Sun.Set ? daily.Sun.Set.split("T")[1] : "N/A"}</p>
    <p>Rain Prob: ${daily.Day.PrecipitationProbability}%</p>`);

    cardsContainer.appendChild(currentCard);
    cardsContainer.appendChild(hourlyCard);
    cardsContainer.appendChild(dailyCard);
  }


});
