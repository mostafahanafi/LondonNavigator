from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime

app = Flask(__name__)

@app.route('/', methods=['GET'])
def hello():
    return render_template('index.html')

@app.route('/getroute', methods=['POST'])
def getroute():
    start = request.form['start']
    end = request.form['end']

    url = f"https://api.tfl.gov.uk/journey/journeyresults/{start}/to/{end}"
    response = requests.get(url)

    if response.status_code != 200:
        return render_template('error.html')
    
    data = response.json()

    # Extract the time from the date time string
    for journey in data["journeys"]:
        journey["startDateTime"] = extract_time(journey["startDateTime"])
        journey["arrivalDateTime"] = extract_time(journey["arrivalDateTime"])
        journey["modes"] = []
        for leg in journey["legs"]:
            leg["departureTime"] = extract_time(leg["departureTime"])
            leg["arrivalTime"] = extract_time(leg["arrivalTime"])
        
            # Add journey modes
            journey["modes"].append(leg["mode"]["name"])

    return render_template('route.html', metadata=data["journeyVector"], journeys=data["journeys"])

def extract_time(date_time):
    date_time_obj = datetime.strptime(date_time, '%Y-%m-%dT%H:%M:%S')
    return date_time_obj.strftime("%H:%M")


if __name__ == '__main__':
    app.run(port=8000, debug=True)
