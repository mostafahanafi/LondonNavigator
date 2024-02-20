from flask import render_template, request, jsonify
import requests
from .models import Journey

def init_routes(app):
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
        journeys = [Journey(journey).toJSON() for journey in data["journeys"]]
        # for now, we will only return the first journey
        # FIXME: We should return all the journeys
        return jsonify(journeys)
