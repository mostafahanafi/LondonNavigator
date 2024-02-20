import json
from datetime import datetime

class Journey():
    def __init__(self, journey_json) -> None:
        self.journey_data = journey_json
        self.legs = journey_json["legs"]
        self.modes = [leg["mode"]["name"] for leg in self.legs]
        self.startTime = self.extract_time(journey_json["startDateTime"])
        self.arrivalTime = self.extract_time(journey_json["arrivalDateTime"])
        self.duration = journey_json["duration"]
        self.fare = journey_json["fare"] if "fare" in journey_json else None
    
    def extract_time(self, date_time):
        date_time_obj = datetime.strptime(date_time, '%Y-%m-%dT%H:%M:%S')
        return date_time_obj.strftime("%H:%M")

    # TODO: Implement this method
    def extract_information(self):
        pass

    def getMapData(self):
        map_details = [{
            "coordinates": json.loads(leg["path"]["lineString"]),
            "mode": leg["mode"]["name"],
            "line": leg["routeOptions"][0]["name"]
        } for leg in self.legs]

        return map_details
    
    def toJSON(self):
        return {
            "startTime": self.startTime,
            "arrivalTime": self.arrivalTime,
            "duration": self.duration,
            "fare": self.fare,
            "modes": self.modes,
            "legs": self.legs,
            "mapData": self.getMapData()
        }