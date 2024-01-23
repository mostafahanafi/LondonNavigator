from flask import Flask, render_template, request, jsonify
import requests

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
    else:
        data = response.json()
        return jsonify(data)

if __name__ == '__main__':
    app.run()
