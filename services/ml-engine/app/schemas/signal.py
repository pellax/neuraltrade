"""
Pydantic Schemas for ML Engine
Request/Response models with validation
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class Exchange(str, Enum):
    """Supported exchanges."""
    BINANCE = "binance"
    COINBASE = "coinbase"
    KRAKEN = "kraken"
    BYBIT = "bybit"
    OKX = "okx"
    KUCOIN = "kucoin"


class Timeframe(str, Enum):
    """Supported timeframes."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


class SignalDirection(str, Enum):
    """Trading signal direction."""
    LONG = "long"
    SHORT = "short"
    NEUTRAL = "neutral"


class RiskLevel(str, Enum):
    """Risk classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ============================================
# Request Schemas
# ============================================

class OHLCVData(BaseModel):
    """OHLCV candle data for prediction."""
    timestamp: int
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: float = Field(ge=0)
    
    @field_validator("high")
    @classmethod
    def high_must_be_highest(cls, v, info):
        if "low" in info.data and v < info.data["low"]:
            raise ValueError("High must be >= low")
        return v


class SignalRequest(BaseModel):
    """Request for signal prediction."""
    exchange: Exchange
    symbol: str = Field(pattern=r"^[A-Z0-9]+/[A-Z0-9]+$")
    timeframe: Timeframe
    candles: list[OHLCVData] = Field(min_length=50, max_length=500)
    request_timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    
    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v):
        if "/" not in v:
            raise ValueError("Symbol must be in format BASE/QUOTE (e.g., BTC/USDT)")
        return v


# ============================================
# Response Schemas
# ============================================

class RiskFactor(BaseModel):
    """Individual risk factor in FMEA."""
    name: str
    category: str  # data, model, market, execution
    score: float = Field(ge=0, le=10)
    description: str


class RiskAssessment(BaseModel):
    """FMEA Risk Assessment result."""
    risk_level: RiskLevel
    risk_score: float = Field(ge=0, le=1000, description="RPN score")
    
    # FMEA Components
    severity_score: float = Field(ge=1, le=10)
    occurrence_score: float = Field(ge=1, le=10)
    detection_score: float = Field(ge=1, le=10)
    
    # Risk Factors
    factors: list[RiskFactor]
    mitigations: list[str]
    
    # Validation Flags
    is_stale_data: bool = False
    is_drift_detected: bool = False
    is_shadow_model_agreed: bool = True


class SignalPrediction(BaseModel):
    """ML signal prediction result."""
    id: str
    exchange: Exchange
    symbol: str
    timeframe: Timeframe
    
    # Prediction
    direction: SignalDirection
    confidence: float = Field(ge=0, le=1)
    
    # Levels
    entry_price: float = Field(gt=0)
    stop_loss: float = Field(gt=0)
    take_profit: list[float] = Field(min_length=1)
    risk_reward_ratio: float = Field(gt=0)
    
    # Metadata
    model_version: str
    timestamp: int
    
    # Risk Assessment
    risk_assessment: RiskAssessment


class SignalResponse(BaseModel):
    """API response wrapper for signal prediction."""
    success: bool
    data: Optional[SignalPrediction] = None
    error: Optional[str] = None
    processing_time_ms: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    model_loaded: bool
    uptime_seconds: float
    queue_connected: bool
