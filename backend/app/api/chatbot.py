from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, AIChatHistory
from app.schemas.schemas import AIChatRequest, AIChatMessageResponse, MovieResponse
from app.auth.deps import get_optional_user
from app.chatbot.assistant import cinebot

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@router.post("/message", response_model=AIChatMessageResponse)
def chat_with_assistant(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user)
):
    reply_text, suggested_movies = cinebot.process_chat_message(db, request.message)
    
    suggested_movie_responses = [MovieResponse.from_orm(m) for m in suggested_movies]
    
    # Save to history if logged in
    user_id = user.id if user else 1
    chat_entry = AIChatHistory(
        user_id=user_id,
        role="assistant",
        message=reply_text,
        suggested_movie_ids=[m.id for m in suggested_movies]
    )
    db.add(chat_entry)
    db.commit()
    db.refresh(chat_entry)
    
    return AIChatMessageResponse(
        id=chat_entry.id,
        role="assistant",
        message=reply_text,
        suggested_movies=suggested_movie_responses,
        created_at=chat_entry.created_at
    )
