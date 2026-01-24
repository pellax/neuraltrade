"""
Environment Configuration for ML Engine
Uses Pydantic Settings for validation
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable validation."""
    
    # Service
    service_name: str = "ml-engine"
    debug: bool = False
    
    # RabbitMQ
    rabbitmq_url: str = Field(default="amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = "neuraltrade.events"
    rabbitmq_queue_signals: str = "signals.ml"
    
    # MongoDB
    mongodb_uri: str = Field(default="mongodb://localhost:27017/neuraltrade")
    mongodb_db_name: str = "neuraltrade"
    
    # ML Configuration
    ml_confidence_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    ml_model_path: str = "/app/models/signal_predictor_v1.pt"
    ml_shadow_model_path: str = "/app/models/signal_predictor_shadow.pt"
    
    # Risk Assessment (FMEA)
    risk_max_data_age_seconds: int = 5  # Max staleness for HFT
    risk_drift_threshold: float = 0.15  # Model drift detection threshold
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
