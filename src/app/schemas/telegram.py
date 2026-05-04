from pydantic import BaseModel


class TelegramBotMeta(BaseModel):
    username: str
    url: str

