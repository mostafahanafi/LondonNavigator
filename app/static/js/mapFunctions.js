var map = L.map('map').setView([51.505, -0.09], 13);
var polylines = [];
var journeys;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function setupAddressInput(inputId, suggestionsId) {
    var input = document.getElementById(inputId);
    var suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', function() {
        var query = input.value;
        if (query.length < 3) {
            suggestions.innerHTML = '';
            return;
        }

        fetch('/getsuggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `query=${encodeURIComponent(query)}`
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            suggestions.innerHTML = '';
            data.features.forEach(feature => {
                var suggestion = document.createElement('div');
                suggestion.className = 'suggestion';
                suggestion.innerHTML = feature.properties.name;
                suggestion.addEventListener('click', function() {
                    input.value = feature.properties.name;
                    var lon = feature.geometry.coordinates[0];
                    var lat = feature.geometry.coordinates[1];
                    input.setAttribute('data-lon', lon);
                    input.setAttribute('data-lat', lat);
                    suggestions.innerHTML = '';
                });
                suggestions.appendChild(suggestion);
            });
        })
        .catch(error => console.error('Error:', error));
    });
}

setupAddressInput('start', 'startSuggestions');
setupAddressInput('end', 'endSuggestions');

function findRoute() {
    var startLon = document.getElementById('start').getAttribute('data-lon');
    var startLat = document.getElementById('start').getAttribute('data-lat');
    var endLon = document.getElementById('end').getAttribute('data-lon');
    var endLat = document.getElementById('end').getAttribute('data-lat');
    var start = `${startLat},${startLon}`;
    var end = `${endLat},${endLon}`;

    fetch('/getroute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    })
    .then(response => response.json())
    .then(data => {
        journeys = data;
        displayJourneys(journeys);
        if (journeys.length > 0) {
            toggleJourney(document.querySelector('.journey h3'), 0);
        }
    })
    .catch(error => console.error('Error:', error));
}

function drawRoute(legs) {
    // remove previous route
    clearRoute();
    // draw new route
    legs.forEach(leg => {
        var coordinates = leg.coordinates;
        var { color, dashArray } = getPolylineStyle(leg.mode, leg.line);
        var polyline = L.polyline(coordinates, {color: color, dashArray: dashArray}).addTo(map);
        polylines.push(polyline);
    });
    // bounds of entire route
    var bounds = L.featureGroup(polylines).getBounds();
    map.fitBounds(bounds);
    map.invalidateSize();
}

function clearRoute() {
    polylines.forEach(polyline => {
        map.removeLayer(polyline);
    });
    polylines = [];
}

function getPolylineStyle(mode, line) {
    var style = {
        color: 'grey',
        dashArray: ''
    };
    
    if (mode === 'walking') {
        style.dashArray = '5, 5';
    } else if (mode === 'bus') {
        style.color = 'red';
    } else if (mode === 'tube') {
        style.color = tubeLineColour(line);
    } else if (mode === 'elizabeth-line') {
        style.color = '#773dbd';
    }

    return style;
}

function tubeLineColour(line) {
    // Source: https://content.tfl.gov.uk/tfl-colour-standard-issue-08.pdf
    var colours = {
        'Bakerloo': '#a65a2a',
        'Central': '#e1251b',
        'Circle': '#ffcc00',
        'District': '#007934',
        'Hammersmith-City': '#ec9bad',
        'Jubilee': '#7b868c',
        'Metropolitan': '#870f54',
        'Northern': '#000000',
        'Piccadilly': '#000f9f',
        'Victoria': '#00a0df',
        'Waterloo-City': '#6bcdb1'
    };

    return colours[line] || 'grey';
}

function displayJourneys(journeys) {
    var detailsContainer = document.getElementById('journeyDetails');
    var mapContainer = document.getElementById('map-container');
    detailsContainer.innerHTML = '';

    journeys.forEach((journey, index) => {
        var journeyDiv = document.createElement('div');
        journeyDiv.className = 'journey';

        var journeySummary = journey.legs.map((leg, index) => {
            let iconText = `<span class="icon ${leg.mode}"></span>`;
            if (leg.mode === 'walking') {
                iconText += `<small>${leg.duration}</small>`;
            } else if (leg.mode === 'bus') {
                var busNumber = leg.instructions.split(' ')[0];
                iconText += `<small style="background-color: #e1251b; color: white; padding: 0 3px;">${busNumber}</small>`;
            } else if (leg.mode === 'tube') {
                let line = journey.mapData[index].line;
                iconText += `<small style="color: ${tubeLineColour(line)};">${line}</small>`;
            } else if (leg.mode === 'elizabeth-line') {
                iconText += `<small style="color: #773dbd;">Elizabeth</small>`;
            }

            return `<span class="icon-text">${iconText}</span>`
        }).join('');

        var journeyHeader = document.createElement('h3');
        journeyHeader.innerHTML = `
        <div class="journey-header-top">
            <span class="journey-summary">${journeySummary}</span>
            <span class="journey-duration">${journey.duration} minutes</span>
        </div>
        <div class="journey-header-bottom">
            <p>${journey.startTime} - ${journey.arrivalTime}</p>
        </div>
        `;
        var journeyDetails = document.createElement('div');
        journeyDetails.innerHTML = journey.legs.map((leg, legIndex) => `
            <div class="leg">
                <p>${leg.instructions} (${leg.startTime} - ${leg.arrivalTime})</p>
            </div>
        `).join('');

        journeyDiv.appendChild(journeyHeader);
        journeyDiv.appendChild(journeyDetails);

        detailsContainer.appendChild(journeyDiv);
    });
}

document.getElementById('journeyDetails').addEventListener('click', function(event) {
    let targetElement = event.target;
    // traverse up the DOM to find if the click was on a journey header
    while (targetElement && targetElement.tagName !== 'H3') {
        targetElement = targetElement.parentElement;
    }
    if (targetElement && targetElement.tagName === 'H3') {
        var index = Array.from(this.children).indexOf(targetElement.parentElement);
        toggleJourney(targetElement, index);
    }
});

function toggleJourney(headerElement, index) {
    // toggle visibility of journey details
    var nextElement = headerElement.nextElementSibling;
    nextElement.style.display = nextElement.style.display === "none" ? "block" : "none";
    // hide other journeys
    Array.from(headerElement.parentElement.parentElement.children).forEach((journey, i) => {
        if (i !== index) {
            journey.children[1].style.display = "none";
        }
    });

    clearRoute();
    if (journeys && journeys.length > index) {
        drawRoute(journeys[index].mapData);
    }
}