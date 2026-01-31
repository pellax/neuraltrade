"""
NeuralTrade - Pydantic Schemas Library

Colección reutilizable de schemas para validación de datos en ML.
Compatible con FastAPI, motor (MongoDB), y serialización JSON.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, TypeVar, Generic, Any, Annotated
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ConfigDict,
    ValidationInfo,
)
from pydantic.functional_validators import AfterValidator


# ═══════════════════════════════════════════════════════════════
# CUSTOM VALIDATORS
# ═══════════════════════════════════════════════════════════════

def validate_positive(v: float) -> float:
    """Valida que un número sea positivo."""
    if v <= 0:
        raise ValueError("Value must be positive")
    return v


def validate_probability(v: float) -> float:
    """Valida que un número esté en [0, 1]."""
    if not 0 <= v <= 1:
        raise ValueError("Value must be between 0 and 1")
    return v


def validate_symbol_format(v: str) -> str:
    """Valida formato de par de trading (BTC/USDT)."""
    import re
    if not re.match(r"^[A-Z0-9]+/[A-Z0-9]+$", v):
        raise ValueError("Symbol must be in format BASE/QUOTE (e.g., BTC/USDT)")
    return v


# Tipos anotados con validación
PositiveFloat = Annotated[float, AfterValidator(validate_positive)]
Probability = Annotated[float, AfterValidator(validate_probability)]
TradingSymbol = Annotated[str, AfterValidator(validate_symbol_format)]


# ═══════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════

class Exchange(str, Enum):
    """Exchanges soportados."""
    BINANCE = "binance"
    COINBASE = "coinbase"
    KRAKEN = "kraken"
    BYBIT = "bybit"
    OKX = "okx"
    KUCOIN = "kucoin"


class SignalType(str, Enum):
    """Tipos de señal de trading."""
    SELL = "sell"
    HOLD = "hold"
    BUY = "buy"
    
    @classmethod
    def from_index(cls, idx: int) -> "SignalType":
        """Convierte índice de tensor a SignalType."""
        mapping = {0: cls.SELL, 1: cls.HOLD, 2: cls.BUY}
        return mapping[idx]
    
    def to_index(self) -> int:
        """Convierte SignalType a índice de tensor."""
        mapping = {SignalType.SELL: 0, SignalType.HOLD: 1, SignalType.BUY: 2}
        return mapping[self]


class RiskLevel(str, Enum):
    """Niveles de riesgo."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Timeframe(str, Enum):
    """Timeframes para datos de mercado."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


# ═══════════════════════════════════════════════════════════════
# BASE MODELS
# ═══════════════════════════════════════════════════════════════

class TimestampMixin(BaseModel):
    """Mixin para campos de timestamp."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class MongoBaseModel(BaseModel):
    """Base para modelos que se persisten en MongoDB."""
    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_encoders={
            datetime: lambda v: v.isoformat(),
        },
    )
    
    id: Optional[str] = Field(default=None, alias="_id")


# ═══════════════════════════════════════════════════════════════
# MARKET DATA SCHEMAS
# ═══════════════════════════════════════════════════════════════

class OHLCVPoint(BaseModel):
    """
    Un punto de datos OHLCV (Open, High, Low, Close, Volume).
    
    Validaciones:
        - Todos los precios son positivos
        - high >= open, close, low
        - low <= open, close, high
    """
    model_config = ConfigDict(frozen=True)  # Inmutable
    
    timestamp: datetime
    open: PositiveFloat
    high: PositiveFloat
    low: PositiveFloat
    close: PositiveFloat
    volume: float = Field(ge=0)
    
    @model_validator(mode="after")
    def validate_ohlc_logic(self) -> "OHLCVPoint":
        """Valida consistencia lógica de OHLC."""
        if self.high < self.low:
            raise ValueError(f"high ({self.high}) must be >= low ({self.low})")
        if not (self.low <= self.open <= self.high):
            raise ValueError(f"open ({self.open}) must be between low and high")
        if not (self.low <= self.close <= self.high):
            raise ValueError(f"close ({self.close}) must be between low and high")
        return self
    
    def to_list(self) -> list[float]:
        """Convierte a lista para tensor."""
        return [self.open, self.high, self.low, self.close, self.volume]


class OHLCVSequence(BaseModel):
    """
    Secuencia de datos OHLCV para predicción.
    
    Validaciones:
        - Mínimo 60 puntos (configurable)
        - Orden cronológico estricto
        - Mismo símbolo y exchange
    """
    symbol: TradingSymbol
    exchange: Exchange
    timeframe: Timeframe = Timeframe.M1
    data: list[OHLCVPoint] = Field(min_length=60, max_length=200)
    
    @field_validator("data")
    @classmethod
    def validate_chronological_order(
        cls,
        v: list[OHLCVPoint],
        info: ValidationInfo,
    ) -> list[OHLCVPoint]:
        """Valida orden cronológico."""
        for i in range(1, len(v)):
            if v[i].timestamp <= v[i - 1].timestamp:
                raise ValueError(
                    f"Data must be chronologically ordered. "
                    f"Point {i} ({v[i].timestamp}) <= Point {i-1} ({v[i-1].timestamp})"
                )
        return v
    
    def to_tensor(self) -> "torch.Tensor":
        """Convierte secuencia a tensor PyTorch."""
        import torch
        data = [point.to_list() for point in self.data]
        return torch.tensor(data, dtype=torch.float32).unsqueeze(0)
    
    @property
    def latest_price(self) -> float:
        """Último precio de cierre."""
        return self.data[-1].close
    
    @property
    def price_change_pct(self) -> float:
        """Cambio porcentual en la secuencia."""
        first = self.data[0].close
        last = self.data[-1].close
        return ((last - first) / first) * 100


# ═══════════════════════════════════════════════════════════════
# PREDICTION SCHEMAS
# ═══════════════════════════════════════════════════════════════

class PredictionRequest(BaseModel):
    """Request para predicción de señal."""
    sequence: OHLCVSequence
    include_attention: bool = False
    
    @property
    def symbol(self) -> str:
        return self.sequence.symbol
    
    @property
    def exchange(self) -> Exchange:
        return self.sequence.exchange


class SignalProbabilities(BaseModel):
    """Probabilidades de cada señal."""
    sell: Probability
    hold: Probability
    buy: Probability
    
    @model_validator(mode="after")
    def validate_sum(self) -> "SignalProbabilities":
        """Valida que las probabilidades sumen ~1.0."""
        total = self.sell + self.hold + self.buy
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Probabilities must sum to 1.0, got {total:.4f}")
        return self
    
    @classmethod
    def from_tensor(cls, probs: "torch.Tensor") -> "SignalProbabilities":
        """Crea desde tensor de probabilidades."""
        p = probs.squeeze().cpu().tolist()
        return cls(sell=p[0], hold=p[1], buy=p[2])
    
    def argmax(self) -> SignalType:
        """Retorna la señal con mayor probabilidad."""
        probs = {"sell": self.sell, "hold": self.hold, "buy": self.buy}
        return SignalType(max(probs, key=probs.get))


class SignalPrediction(BaseModel):
    """Resultado de predicción de señal."""
    signal: SignalType
    confidence: Probability
    probabilities: SignalProbabilities
    
    # Metadata
    symbol: str
    exchange: Exchange
    model_version: str
    inference_time_ms: float = Field(ge=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Optional attention weights
    attention_weights: Optional[list[float]] = None


class RiskAssessment(BaseModel):
    """Evaluación de riesgo FMEA."""
    risk_score: float = Field(ge=0, le=10)
    risk_level: RiskLevel
    factors: list[str]
    recommendation: str
    
    @classmethod
    def evaluate(
        cls,
        signal: SignalPrediction,
        volatility: float,
        trend_strength: float,
        market_sentiment: Optional[float] = None,
    ) -> "RiskAssessment":
        """Evalúa riesgo basado en múltiples factores."""
        factors = []
        risk_score = 0.0
        
        # Factor: Baja confianza
        if signal.confidence < 0.7:
            factors.append("Low model confidence")
            risk_score += 2.5
        elif signal.confidence < 0.85:
            factors.append("Moderate model confidence")
            risk_score += 1.0
        
        # Factor: Alta volatilidad
        if volatility > 0.05:
            factors.append("High market volatility")
            risk_score += 3.0
        elif volatility > 0.03:
            factors.append("Elevated volatility")
            risk_score += 1.5
        
        # Factor: Tendencia débil
        if trend_strength < 0.3:
            factors.append("Weak trend signal")
            risk_score += 1.5
        
        # Factor: Sentimiento de mercado (si disponible)
        if market_sentiment is not None and market_sentiment < 0.4:
            factors.append("Bearish market sentiment")
            risk_score += 1.0
        
        # Determinar nivel
        if risk_score < 2:
            level = RiskLevel.LOW
            recommendation = "Proceed with standard position size"
        elif risk_score < 4:
            level = RiskLevel.MEDIUM
            recommendation = "Consider reducing position size by 25%"
        elif risk_score < 7:
            level = RiskLevel.HIGH
            recommendation = "Reduce position size by 50% or wait for better conditions"
        else:
            level = RiskLevel.CRITICAL
            recommendation = "Do not trade - conditions are unfavorable"
        
        return cls(
            risk_score=min(risk_score, 10.0),
            risk_level=level,
            factors=factors or ["No significant risk factors"],
            recommendation=recommendation,
        )


class PredictionResponse(BaseModel):
    """Response completa de predicción."""
    prediction: SignalPrediction
    risk: RiskAssessment
    request_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# BATCH PROCESSING
# ═══════════════════════════════════════════════════════════════

class BatchPredictionRequest(BaseModel):
    """Request para predicción en batch."""
    requests: list[PredictionRequest] = Field(min_length=1, max_length=100)
    
    def __len__(self) -> int:
        return len(self.requests)


class BatchPredictionResponse(BaseModel):
    """Response de predicción en batch."""
    predictions: list[PredictionResponse]
    total_inference_time_ms: float
    batch_size: int
    
    @property
    def avg_inference_time_ms(self) -> float:
        return self.total_inference_time_ms / self.batch_size if self.batch_size > 0 else 0


# ═══════════════════════════════════════════════════════════════
# TRAINING SCHEMAS
# ═══════════════════════════════════════════════════════════════

class TrainingConfig(BaseModel):
    """Configuración de entrenamiento."""
    # Hyperparameters
    learning_rate: float = Field(default=1e-3, gt=0, lt=1)
    batch_size: int = Field(default=32, ge=1, le=512)
    epochs: int = Field(default=100, ge=1, le=1000)
    sequence_length: int = Field(default=60, ge=10, le=200)
    
    # Model architecture
    hidden_size: int = Field(default=128, ge=32, le=512)
    num_layers: int = Field(default=2, ge=1, le=6)
    dropout: float = Field(default=0.2, ge=0, lt=1)
    bidirectional: bool = True
    
    # Optimizer
    optimizer: str = Field(default="adamw", pattern=r"^(adam|adamw|sgd)$")
    weight_decay: float = Field(default=0.01, ge=0)
    
    # Regularization
    early_stopping_patience: int = Field(default=10, ge=1)
    gradient_clip_norm: float = Field(default=1.0, gt=0)
    
    @model_validator(mode="after")
    def validate_lr_for_optimizer(self) -> "TrainingConfig":
        """SGD necesita learning rate más alto."""
        if self.optimizer == "sgd" and self.learning_rate < 0.01:
            raise ValueError("SGD typically needs learning_rate >= 0.01")
        return self


class TrainingMetrics(BaseModel):
    """Métricas de una época de entrenamiento."""
    epoch: int
    train_loss: float
    train_accuracy: float
    val_loss: float
    val_accuracy: float
    learning_rate: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TrainingRun(MongoBaseModel, TimestampMixin):
    """Registro de un run de entrenamiento."""
    name: str
    config: TrainingConfig
    metrics: list[TrainingMetrics] = []
    best_val_loss: float = float("inf")
    best_epoch: int = 0
    status: str = Field(default="running", pattern=r"^(running|completed|failed|cancelled)$")
    
    def add_epoch(self, metrics: TrainingMetrics) -> None:
        self.metrics.append(metrics)
        if metrics.val_loss < self.best_val_loss:
            self.best_val_loss = metrics.val_loss
            self.best_epoch = metrics.epoch


# ═══════════════════════════════════════════════════════════════
# ERROR SCHEMAS
# ═══════════════════════════════════════════════════════════════

class ErrorDetail(BaseModel):
    """Detalle de un error de validación."""
    field: str
    message: str
    type: str


class ErrorResponse(BaseModel):
    """Schema de error estándar."""
    error: str
    code: str
    details: Optional[list[ErrorDetail]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# GENERIC RESPONSE WRAPPER
# ═══════════════════════════════════════════════════════════════

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Wrapper genérico para responses de API."""
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    meta: Optional[dict[str, Any]] = None
    
    @classmethod
    def ok(cls, data: T, meta: Optional[dict] = None) -> "APIResponse[T]":
        return cls(success=True, data=data, meta=meta)
    
    @classmethod
    def fail(cls, error: str, code: str, details: Optional[list] = None) -> "APIResponse[T]":
        return cls(
            success=False,
            error=ErrorResponse(error=error, code=code, details=details),
        )
