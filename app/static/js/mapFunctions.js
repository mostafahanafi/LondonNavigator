var map = L.map('map').setView([51.505, -0.09], 13);
var polylines = [];
var journeys;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

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
    .then(response => {
        if (!response.ok) {
            throw response.json();
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            alert(data.message);
            return;
        }
        journeys = data;
        displayJourneys(journeys);
        if (journeys.length > 0) {
            toggleJourney(document.querySelector('.journey h3'), 0);
        }
    })
    .catch(error => {
        error.then(errorMsg => {
            console.log('Error:', errorMsg.message);
            alert(errorMsg.message);
        });
    });
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
    } else if (mode === 'dlr') {
        style.color = '#00afa9';
    } else if (mode === 'national-rail') {
        style.color = nationalRailColour(line);
    } else if (mode === 'river-bus') {
        style.color = riverBusColour(line);
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
        'Hammersmith & City': '#ec9bad',
        'Jubilee': '#7b868c',
        'Metropolitan': '#870f54',
        'Northern': '#000000',
        'Piccadilly': '#000f9f',
        'Victoria': '#00a0df',
        'Waterloo-City': '#6bcdb1'
    };

    return colours[line] || 'grey';
}

function nationalRailColour(line) {
    // Source: https://en.wikipedia.org/wiki/Template:National_Rail_colour
    var colours = {
        'Avanti West Coast': '#004354',
        'c2c': '#b7007c',
        'Chiltern Railways': '#00bfff',
        'Cross Country': '#660f21',
        'East Midlands Railway': '#ffa500',
        'First Hull Trains': '#de005c',
        'First TransPennine Express': '#010385',
        'Gatwick Express': '#eb1e2d',
        'Grand Central': '#1d1d1b',
        'Greater Anglia': '#d70428',
        'Great Northern': '#0099ff',
        'Great Western Railway': '#0a493e',
        'Heathrow Express': '#532e63',
        'Island Line': '#1e90ff',
        'London North Eastern Railway': '#d70e35',
        'Lumo': '#2b6ef5',
        'Merseyrail': '#fff200',
        'Northern Rail': '#262262',
        'ScotRail': '#1e467d',
        'Southeastern': '#389cff',
        'Southern': '#8cc63e',
        'South Western Railway': '#ee1c23',
        'Thameslink': '#ff5aa4',
        'Transport for Wales': '#ff0000',
        'West Midlands Trains': '#ff8300'
    };

    return colours[line] || 'grey';
}

function riverBusColour(line) {
    var colours = {
        'RB1': '#2d3039',
        'RB2': '#0072bc',
        'RB4': '#61c29d',
        'Thames River Services': '#f7f7f7',
        'Woolwich Ferry': '#f7931d'
    }

    return colours[line] || 'grey';
}

function foregroundColor(colour) {
    let r = parseInt(colour.substr(1, 2), 16);
    let g = parseInt(colour.substr(3, 2), 16);
    let b = parseInt(colour.substr(5, 2), 16);
    let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 128 ? 'black' : 'white';
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
                let bg = tubeLineColour(line);
                let fg = foregroundColor(bg);
                iconText += `<small style="background-color: ${bg}; color: ${fg}; padding: 0 3px">${line}</small>`;
            } else if (leg.mode === 'elizabeth-line') {
                iconText += `<small style="color: #773dbd;">Elizabeth</small>`;
            } else if (leg.mode === 'dlr') {
                iconText += `<small style="background-color: #00afa9; color: white; padding: 0 3px;">DLR</small>`;
            } else if (leg.mode === 'national-rail') {
                let line = journey.mapData[index].line;
                let bg = nationalRailColour(line);
                let fg = foregroundColor(bg);
                iconText += `<small style="background-color: ${bg}; color: ${fg}; padding: 0 3px;">${line}</small>`;
            } else if (leg.mode === 'river-bus') {
                let riverBusNumber = journey.mapData[index].line;
                let bg = riverBusColour(riverBusNumber);
                let fg = foregroundColor(bg);
                iconText += `<small style="background-color: ${bg}; color: ${fg}; padding: 0 3px;">${riverBusNumber}</small>`;
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
        // journeyDetails.innerHTML = journey.legs.map((leg, legIndex) => `
        //     <div class="leg">
        //         <p>${leg.instructions} (${leg.startTime} - ${leg.arrivalTime})</p>
        //     </div>
        // `).join('');
        journeyDetails.innerHTML = journey.legs.map((leg, legIndex) => {
            let disruptionInfo = '';
            if (leg.disruptions) {
                disruptionInfo = leg.disruptions.map(disruption => {
                    return `<p class="disruption"><b>${disruption.category}:</b> ${disruption.description}</p>`
                }).join('');
            }
            return `
            <div class="leg">
                <p>${leg.instructions} (${leg.startTime} - ${leg.arrivalTime})</p>
                ${disruptionInfo}
            </div>
            `;
        }).join('');

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