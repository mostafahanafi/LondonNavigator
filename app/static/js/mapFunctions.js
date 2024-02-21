var map = L.map('map').setView([51.505, -0.09], 13);
var polylines = [];
var journeys;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function findRoute() {
    var start = document.getElementById('start').value;
    var end = document.getElementById('end').value;

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
    detailsContainer.innerHTML = '';

    journeys.forEach((journey, index) => {
        var journeyDiv = document.createElement('div');
        journeyDiv.className = 'journey';
        var journeySummary = journey.legs.map((leg, index) => {
            if (leg.mode.name === 'walking') {
                return `<span class="icon walking">${leg.duration}</span>`;
            } else if (leg.mode.name === 'bus') {
                var busNumber = leg.instruction.summary.split(' ')[0];
                return `<span class="icon bus">${busNumber}</span>`;
            } else if (leg.mode.name === 'tube') {
                return `<span class="icon tube">${journey.mapData[index].line}</span>`;
            }
        }).join('');

        journeyDiv.innerHTML =  `
            <h3>
                Journey ${index + 1}
                <small>(${journey.startTime} - ${journey.arrivalTime})</small>
                ${journeySummary}
                <span class="journey-duration">${journey.duration} minutes</span>    
            </h3>
            <div>${journey.legs.map(leg => `
                <div class="leg">
                    <h4>Leg</h4>
                    <div>
                        <p><b>Mode:</b> ${leg.mode.name}</p>
                        <p><b>From:</b> ${leg.departurePoint.commonName}</p>
                        <p><b>To:</b> ${leg.arrivalPoint.commonName}</p>
                        <p><b>Departure Time:</b> ${leg.departureTime}</p>
                        <p><b>Arrival Time:</b> ${leg.arrivalTime}</p>
                        <p><b>Duration:</b> ${leg.duration} minutes</p>
                        ${leg.instruction.detailed ? `<p><b>Instructions:</b> ${leg.instruction.detailed}</p>` : ''}
                    </div>
                </div>
            `).join('')}</div>
        `;
        detailsContainer.appendChild(journeyDiv);
    });
}

document.getElementById('journeyDetails').addEventListener('click', function(event) {
    if (event.target.tagName === 'H3' && event.target.parentElement.className === 'journey') {
        var index = Array.from(this.children).indexOf(event.target.parentElement);
        toggleJourney(event.target, index);
    }
});

function toggleJourney(headerElement, index) {
    // toggle visibility of journey details
    var nextElement = headerElement.nextElementSibling;
    nextElement.style.display = "block";
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