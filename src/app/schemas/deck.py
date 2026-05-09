from pydantic import BaseModel

class DeckCreate(BaseModel):
    name: str
    description: str = ""

class DeckShareUpdate(BaseModel):
    is_public: bool
