from sqlmodel import Session, select
from src.app.models.domain import User

def get_or_create_user(session: Session, google_id: str, name: str, email: str, photo_url: str = ""):
    statement = select(User).where(User.google_id == google_id)
    user = session.exec(statement).first()
    
    if not user:
        user = User(google_id=google_id, name=name, email=email, photo_url=photo_url)
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.name = name
        user.email = email
        user.photo_url = photo_url
        session.add(user)
        session.commit()
        session.refresh(user)
        
    return user.model_dump()
