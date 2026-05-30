from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.ml.chatbot_engine import chatbot_engine

router = APIRouter()

class ChatbotQuery(BaseModel):
    message: str

@router.post("/query")
def query_chatbot(query_in: ChatbotQuery, db: Session = Depends(get_db)):
    """Query the custom bilingual RAG & ML Intent-based AI Transport Assistant."""
    result = chatbot_engine.query(query_in.message, db)
    return result
