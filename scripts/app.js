// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    visibleSymptoms: {},
    selectedInjuries: [],
    acceptedSymptoms: [],
    deniedSymptoms: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    symptomTemplate: document.querySelector('.symptomTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container')
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butAdd').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butFind').addEventListener('click', function() {
    // Open/show the add injuries and treatment
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddInjury').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectInjuryToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedInjuries) {
      app.selectedInjuries = [];
    }
    app.getInjury(key, label);
    app.selectedInjuries.push({key: key, label: label});
    app.saveselectedInjuries();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateInjuryCard = function(data) {
    var symptoms = data.symptoms;
    var treatment = data.treatment;

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.title').textContent = data.name;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    card.querySelector('.current .symptoms').innerHTML = symptoms
      .map(function(symptom) { return "<li><img src='/images/check.png' alt=''/>" + symptom.description + "</li>"; } ).join(' ');
    card.querySelector('.treatment .description').textContent = treatment;
    card.querySelector('.visual .icon').classList.add(data.name.toLowerCase());
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateSymptomCard = function(data) {
    var symptom = data.description;

    var card = app.visibleSymptoms[data.id];
    if (!card) {
      card = app.symptomTemplate.cloneNode(true);
      card.classList.remove('symptomTemplate');
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleSymptoms[data.key] = card;
    }
    
    card.querySelector('.symptom .description').textContent = symptom + ' ?';
    var image = symptom.toLowerCase().replace(' ', '_');
    card.querySelector('.visual .icon').classList.add(image);
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getInjury() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getInjury() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getInjury = function(key, label) {
    var url = 'https://muscleinjurydiagnoser.herokuapp.com/injury/all';
    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = json.filter(function(obj) { return obj.name == label });
            console.log('beluu cache');
            app.updateInjuryCard(results[0]);
          });
        }
      });
    }
    else {
      // Fetch the latest data.
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            var response = JSON.parse(request.response);
            var results = response.filter(function(obj) { return obj.name == label });
            console.log('belu NO cache', results[0]);
            app.updateInjuryCard(results[0]);
          }
        } else {
          // Return the initial weather forecast since no data is available.
          app.updateInjuryCard(initialInjury);
        }
      };
      request.open('GET', url, true);
      request.send();
    }
  };


  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getInjury() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getInjury() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getNextSymptom = function(key, label) {
    var url = 'https://muscleinjurydiagnoser.herokuapp.com/diagnose/nook';
    // TODO add cache logic here

    // Fetch the latest data.
    var request = new XMLHttpRequest();
    var params = {"acceptedSymptoms": "[" + JSON.stringify(app.acceptedSymptoms) + "]", 
      "deniedSymptoms" : "[" + JSON.stringify(app.deniedSymptoms) + "]"
    };
    request.setRequestHeader("Content-type", "application/json");

    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response.query.results;
          // results.key = key;
          // results.label = label;
          results.created = response.query.created;
          app.updateSymptomCard(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateSymptomCard(initialSymptom);
      }
    };
    request.open('POST', url, true);
    request.send(params);
  };

  // TODO add saveselectedInjuries function here
  // Save list of cities to localStorage.
  app.saveselectedInjuries = function() {
    var selectedInjuries = JSON.stringify(app.selectedInjuries);
    localStorage.selectedInjuries = selectedInjuries;
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialInjury = {
    key: 'contractura',
    label: 'Contractura lalala',
    symptoms: ["Síntomas Progresivos", "Inflamación", "Mucho endurecimiento muscular"],
    treatment: "Debe aplicar calor, hacer reposo deportivo y elongar suave sin dolor."
  };

  var initialSymptom = {
    id: 4,
    description: 'Sintomas agudos'
  }
  // TODO uncomment line below to test app with fake data
  // app.updateInjuryCard(initialInjury);
  // app.updateSymptomCard(initialSymptom);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
  app.selectedInjuries = localStorage.selectedInjuries;
  if (app.selectedInjuries) {
    app.selectedInjuries = JSON.parse(app.selectedInjuries);
    app.selectedInjuries.forEach(function(injury) {
      app.getInjury(injury.key, injury.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateInjuryCard(initialInjury);
    app.selectedInjuries = [
      {key: initialInjury.key, label: initialInjury.label}
    ];
    app.saveselectedInjuries();
  }

  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
