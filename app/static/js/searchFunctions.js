function setupAddressInput(inputId, suggestionsId) {
    var input = document.getElementById(inputId);
    var suggestions = document.getElementById(suggestionsId);
    var delayTimer;

    input.addEventListener('input', function() {
        clearTimeout(delayTimer); // Clear the previous timer

        var query = input.value;
        if (query.length < 3) {
            suggestions.innerHTML = '';
            return;
        }

        // Set a new timer to delay the fetch request
        delayTimer = setTimeout(function() {
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
        }, 1000); // Delay of 2 seconds (2000 milliseconds)
    });
}

setupAddressInput('start', 'startSuggestions');
setupAddressInput('end', 'endSuggestions');