from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    name: str
    email: str

    def validate_gmail(cls, v):
        if not v.endswith('@gmail.com'):
            raise ValueError('Email must end with @gmail.com')
        return v

class RunCodeRequest(BaseModel):
    code: str
    custom_input: str = ""

class SubmitCodeRequest(BaseModel):
    session_id: str
    problem_id: str
    code: str
    time_taken: int = 0

# SQL request models
class RunSqlRequest(BaseModel):
    problem_id: str
    query: str

class SubmitSqlRequest(BaseModel):
    session_id: str
    problem_id: str
    query: str
    time_taken: int = 0
