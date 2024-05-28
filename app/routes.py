from flask import render_template, request, jsonify
import requests
from .models import Journey
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

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
    
    @app.route('/chat', methods=['POST'])
    def chat_post():
        openai = OpenAI()
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        response = openai.chat.completions.create(
            model="gpt-4-turbo-2024-04-09",
            messages=[{
                "role": "system",
                "content": """You are an assistant part of an intelligent AI
system designed to help users navigate public transportation in London. Your job 
is to understand user questions about routes and disruptions, and to extract
relevant data that will be used to provide accurate and helpful responses.
When a user asks a question, identify the type of query, and then extract the 
relevant information. 

Here are the types of queries you should be able to handle:
- "ROUTE": Queries about how to get from one location to another
- "DISRUPTION": Queries about disruptions on specific lines or services
- "BOTH": Queries that combine both route and disruption information

Here are the variables you should extract for each type of query:
- "ROUTE": start_location, end_location
- "DISRUPTION": line_name OR mode_name
If the queried line is an underground line, you should use the appropriate
line ID ("bakerloo", "central", "circle", "district", "hammersmith-city",
"jubilee", "metropolitan", "northern", "piccadilly", "victoria", "waterloo-city").

You should return a response in JSON format that includes the extracted variables
e.g. {"type": "ROUTE", "start_location": "A", "end_location": "B"}
If you are unable to extract the variables, or believe that the query is not a
recognized type, you should return the following response:
e.g. {"type": "UNKNOWN", "message": "I'm sorry, I don't understand that question."}"""
            }, {
                "role": "assistant",
                "content": """Hi! I'm your AI-powered navigation assistant! 
Ask me questions about routes (e.g. 'How can I get from X to Y?'), 
disruptions (e.g. 'Is the Circle Line fine right now?'), or both (e.g. 
'I want to get from A to B, are there any disruptions I should be aware of?'),
and I'll do my best to help!"""
            },{
                "role": "user",
                "content": request.form["message"]
            }]
        )
        
        chat_response = json.loads(response.choices[0].message.content)
        if chat_response["type"] == "UNKNOWN":
            return jsonify("I'm sorry, I don't understand that question.")
        
        elif chat_response["type"] == "ROUTE":
            start_location = chat_response["start_location"]
            end_location = chat_response["end_location"]

            # Use Photon API to get coordinates
            start_url = f"https://photon.komoot.io/api/?q={start_location}&bbox=-0.489,51.28,0.236,51.686"
            photon_start_response = requests.get(start_url)
            photon_start_data = photon_start_response.json()
            start_lon = photon_start_data["features"][0]["geometry"]["coordinates"][0]
            start_lat = photon_start_data["features"][0]["geometry"]["coordinates"][1]
            start = f"{start_lat},{start_lon}"
            end_url = f"https://photon.komoot.io/api/?q={end_location}&bbox=-0.489,51.28,0.236,51.686"
            photon_end_response = requests.get(end_url)
            photon_end_data = photon_end_response.json()
            end_lon = photon_end_data["features"][0]["geometry"]["coordinates"][0]
            end_lat = photon_end_data["features"][0]["geometry"]["coordinates"][1]
            end = f"{end_lat},{end_lon}"

            # Use TFL API to get journey data
            tfl_url = f"https://api.tfl.gov.uk/journey/journeyresults/{start}/to/{end}"
            journey_response = requests.get(tfl_url)
            journey_data = journey_response.json()
            journeys = [Journey(journey).toJSON() for journey in journey_data["journeys"]]

            print(journeys)

            # Use OpenAI to get response
            final_response = openai.chat.completions.create(
                model="gpt-4-turbo-2024-04-09",
                messages=[{
                    "role": "system",
                    "content": """You are an assistant part of an intelligent AI
system designed to help users navigate public transportation in London. Your job 
is to read in an internal JSON object containing a list of journeys, each of which 
contains properties such as startTime, arrivalTime, duration, modes, and legs. Then,
you should summarize the relevant information and provide a response that recommends
the best route to the user in a user-friendly message. The response should not
include any JSON formatting or direct information from the JSON, but should be a 
clear and concise summary of the best journey to take. The original user query
will be shared with you as context, and you should use this to tailor your response
to the user's needs.

Here is an example JSON object:
{
    "journeys": [
        {
            "startTime": "08:00",
            "arrivalTime": "08:30",
            "duration": "30 minutes",
            "modes": ["bus", "tube"],
            "legs": [
                {
                    "mode": "bus",
                    "from": "A",
                    "to": "B",
                    "startTime": "08:00",
                    "arrivalTime": "08:15",
                    "duration": "15 minutes",
                    "instructions": "Take bus 123 from A to B."
                },
                {
                    "mode": "tube",
                    "from": "B",
                    "to": "C",
                    "startTime": "08:15",
                    "arrivalTime": "08:30",
                    "duration": "15 minutes",
                    "instructions": "Take the Northern Line from B to C."
                }
            ]
        }
    ]
    """
                }, {
                    "role": "user",
                    "content": f"{request.form['message']}\n{json.dumps(journeys)}"
                }]
            )

            return jsonify(final_response.choices[0].message.content)
        
        elif chat_response["type"] == "DISRUPTION":
            # Extract line_name or mode_name
            line_name = chat_response.get("line_name", None)
            mode_name = chat_response.get("mode_name", None)

            # Use TFL API to get disruption data
            if mode_name:
                url = f"https://api.tfl.gov.uk/Line/Mode/{mode_name}/Disruption"
            elif line_name:
                url = f"https://api.tfl.gov.uk/Line/{line_name}/Disruption"
            else:
                return jsonify("I'm sorry, I don't understand that question.")
            disruption_response = requests.get(url)
            disruption_data = disruption_response.json()
            
            # Use OpenAI to get response
            final_response = openai.chat.completions.create(
                model="gpt-4-turbo-2024-04-09",
                messages=[{
                    "role": "system",
                    "content": """You are an assistant part of an intelligent AI
system designed to help users navigate public transportation in London. Your job 
is to read in an internal JSON object containing a list of disruptions either to a
specific line or to a specific mode of transport. Your role is to summarize the
disruption information and provide a response that is clear and concise, and that
helps the user understand the current status of the line or mode of transport. The
original user query will be shared with you as context, and you should use this to
tailor your response to the user's needs and answer their question. If you receive
an empty JSON object, you should respond with a message indicating that there are
no disruptions on the specified line or mode of transport.
    """
                }, {
                    "role": "user",
                    "content": f"{request.form['message']}\n{json.dumps(disruption_data)}"
                }]
            )

            return jsonify(final_response.choices[0].message.content)



        # return jsonify(response.choices[0].message.content)
