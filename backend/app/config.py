"""Configuración leída desde el archivo .env"""
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "5"))
JWT_SECRET = os.getenv("JWT_SECRET", "clave-de-desarrollo")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")]
