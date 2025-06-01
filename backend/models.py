import uuid

class Task:
    def __init__(self, name: str, description: str, date: str, time: str, target_system: str, status: str = "pending", id: str = None):
        self.id = id if id else uuid.uuid4().hex
        self.name = name
        self.description = description
        self.date = date
        self.time = time
        self.target_system = target_system
        self.status = status

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "date": self.date,
            "time": self.time,
            "target_system": self.target_system,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            id=data.get("id"),
            name=data.get("name"),
            description=data.get("description"),
            date=data.get("date"),
            time=data.get("time"),
            target_system=data.get("target_system"),
            status=data.get("status", "pending"),
        )
