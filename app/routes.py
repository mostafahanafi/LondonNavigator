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
        data = response.json()

        if response.status_code != 200:
            return jsonify({
                'error': True,
                'message': data.get('message', 'An error occurred while processing your request.')
            }), 400
        
        journeys = [Journey(journey).toJSON() for journey in data["journeys"]]
        return jsonify(journeys)
    
    @app.route('/getsuggestions', methods=['POST'])
    def getsuggestions():
        query = request.form['query']

        url = f"https://photon.komoot.io/api/?q={query}&bbox=-0.489,51.28,0.236,51.686"
        response = requests.get(url)
        if response.status_code != 200:
            return render_template('error.html')
        
        data = response.json()
        return jsonify(data)
    
    @app.route('/chat', methods=['GET'])
    def chat():
        return render_template('chat.html')
