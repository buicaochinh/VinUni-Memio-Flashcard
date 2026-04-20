from pydantic import BaseModel

class DeckCreate(BaseModel):
    user_id: int
    name: str
    description: str = ""

class DeckShareUpdate(BaseModel):
    is_public: bool
