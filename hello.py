from flask import Flask, render_template, request, jsonify
import requests
from Journey import Journey

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
    journeys = [Journey(journey) for journey in data["journeys"]]
    map_info = [journey.getMapData() for journey in journeys]
    # for now, we will only return the first journey
    # FIXME: We should return all the journeys
    return jsonify(map_info[0])

if __name__ == '__main__':
    app.run(port=8000, debug=True)
