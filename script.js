'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map;
// let mapEvent;
// let coords;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/hour
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
/// Проверка
// let run1 = new Running([39, 12], 5.2, 24, 178);
// let cycle1 = new Cycling([39, 12], 27, 95, 523);
// console.log(run1);
// console.log(cycle1);

/////////////////////
// APPLICATION ARCHITECTURE
/// Refactoring Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    /// Мгновенный запуск методов в конструкторе
    // 1. Получение позиции и загрузка карты + отклик на нажатие и открытие формы
    this._getPosition();
    /// 2. Get data from local storage
    this._getLocalStorage();

    /// 3. Замена таблички при изменении бега/велосипеда в форме
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    /// 4. При нажатии сабмита формы
    form.addEventListener('submit', this._newWorkout.bind(this));
    /// 5. При нажатии в таблице на event - перемещение карты на него
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position!`);
        }
      );
    }
  }
  _loadMap(position) {
    console.log(position);
    let { latitude } = position.coords;
    let { longitude } = position.coords;
    let coords = [latitude, longitude];
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords).addTo(this.#map).bindPopup('You are here!').openPopup();

    /// Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Rendering local data
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    ///  В отклике на нажатие - открытие формы
    console.log(mapE);
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Empty the inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // Hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    e.preventDefault();

    // Get data from form
    let type = inputType.value;
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;
    let { lat, lng } = this.#mapEvent.latlng;
    let workout;

    let validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    let allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // If Workout running, create running object
    if (type === 'running') {
      let cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      /// Создаем мероприятие через класс
      workout = new Running([lat, lng], distance, duration, cadence);
      console.log(workout);
      this.#workouts.push(workout);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      let elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }

      // Add new object to workout array
      /// Создаем мероприятие через класс
      workout = new Cycling([lat, lng], distance, duration, elevation);
      console.log(workout);
      this.#workouts.push(workout);
    }
    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();
    /// Set local storage to all workouts
    this._setLocalStorage();
  }

  /// Display marker
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords) // в квадратных скобках заносится согласно Documentation
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    //   console.log(mapEvent);
    //   console.log(lat, lng);
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === 'running') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🗻</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    let workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    /// Use the public interface
    workout.click();
    console.log(workout.clicks);
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    let data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
  }
}

let app = new App();
