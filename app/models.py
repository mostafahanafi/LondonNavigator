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

    def getMapData(self):
        map_details = []
        for leg in self.legs:
            map_leg = {}
            
            map_leg["coordinates"] = json.loads(leg["path"]["lineString"])
            map_leg["mode"] = leg["mode"]["name"]
            if map_leg["mode"] == "river-bus":
                map_leg["line"] = leg["routeOptions"][0]["lineIdentifier"]["name"]
            else:
                map_leg["line"] = leg["routeOptions"][0]["name"]

            map_details.append(map_leg)

        return map_details
    
    def toJSON(self):
        json_data = {
            "startTime": self.startTime,
            "arrivalTime": self.arrivalTime,
            "duration": self.duration,
            "fare": self.fare,
            "modes": self.modes,
            "legs": self.legs,
            "mapData": self.getMapData(),
            "legs": [],
        }
        for leg in self.legs:
            leg_data = {
                "mode": leg["mode"]["name"],
                "from": leg["departurePoint"]["commonName"],
                "to": leg["arrivalPoint"]["commonName"],
                "startTime": self.extract_time(leg["departureTime"]),
                "arrivalTime": self.extract_time(leg["arrivalTime"]),
                "duration": leg["duration"],
                "instructions": leg["instruction"]["summary"],
            }
            if leg["mode"]["name"] == "walking":
                instructions = leg_data["instructions"].split(" ")
                instructions.insert(1, f"{leg_data['duration']} minutes")
                leg_data["instructions"] = " ".join(instructions)
            json_data["legs"].append(leg_data)
        

        return json_data