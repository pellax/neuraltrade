"""
NeuralTrade ML Engine
FastAPI application for signal prediction and risk assessment
"""

import uuid
import time
from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas.signal import (
    SignalRequest,
    SignalResponse,
    SignalPrediction,
    HealthResponse,
)
from .models.signal_predictor import SignalPredictor
from .services.risk_assessor import RiskAssessor
from .queue.consumer import QueueConsumer

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

log = structlog.get_logger()

# Global instances
predictor: SignalPredictor
risk_assessor: RiskAssessor
queue_consumer: QueueConsumer
start_time: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global predictor, risk_assessor, queue_consumer, start_time
    
    start_time = time.time()
    log.info("starting_ml_engine", version="0.1.0")
    
    # Initialize services
    predictor = SignalPredictor()
    risk_assessor = RiskAssessor()
    queue_consumer = QueueConsumer()
    
    # Connect to RabbitMQ (non-blocking)
    try:
        await queue_consumer.connect()
    except Exception as e:
        log.warning("rabbitmq_connection_failed", error=str(e))
    
    log.info("ml_engine_ready")
    
    yield
    
    # Cleanup
    await queue_consumer.disconnect()
    log.info("ml_engine_shutdown")


# Create FastAPI app
app = FastAPI(
    title="NeuralTrade ML Engine",
    description="AI-powered trading signal prediction with FMEA risk assessment",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Docker/k8s."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        model_loaded=predictor.is_loaded,
        uptime_seconds=time.time() - start_time,
        queue_connected=queue_consumer.is_connected,
    )


@app.post("/predict", response_model=SignalResponse)
async def predict_signal(request: SignalRequest):
    """
    Generate trading signal prediction with risk assessment.
    
    Accepts OHLCV candle data and returns:
    - Direction (long/short/neutral)
    - Confidence score
    - Entry, stop-loss, take-profit levels
    - FMEA risk assessment with RPN score
    """
    request_start = time.time()
    
    try:
        # Run prediction
        direction, confidence, entry, stop_loss, take_profits, rr_ratio, shadow_agreed = (
            predictor.predict(request)
        )
        
        # Perform risk assessment
        risk_assessment = risk_assessor.assess(
            request=request,
            direction=direction,
            confidence=confidence,
            shadow_agreed=shadow_agreed,
        )
        
        # Build response
        prediction = SignalPrediction(
            id=str(uuid.uuid4()),
            exchange=request.exchange,
            symbol=request.symbol,
            timeframe=request.timeframe,
            direction=direction,
            confidence=confidence,
            entry_price=entry,
            stop_loss=stop_loss,
            take_profit=take_profits,
            risk_reward_ratio=rr_ratio,
            model_version=predictor.model_version,
            timestamp=int(time.time() * 1000),
            risk_assessment=risk_assessment,
        )
        
        processing_time = (time.time() - request_start) * 1000
        
        log.info(
            "prediction_complete",
            symbol=request.symbol,
            direction=direction.value,
            confidence=f"{confidence:.2%}",
            risk_level=risk_assessment.risk_level.value,
            processing_ms=f"{processing_time:.1f}",
        )
        
        return SignalResponse(
            success=True,
            data=prediction,
            processing_time_ms=processing_time,
        )
        
    except Exception as e:
        log.exception("prediction_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback")
async def record_feedback(prediction_id: str, was_correct: bool):
    """
    Record prediction outcome for drift detection.
    Used to track model accuracy over time.
    """
    risk_assessor.record_outcome(prediction_id, was_correct)
    return {"status": "recorded"}


@app.get("/models")
async def list_models():
    """List loaded ML models and their status."""
    return {
        "primary": {
            "version": predictor.model_version,
            "loaded": predictor.is_loaded,
            "device": predictor.device,
        },
        "shadow": {
            "version": f"{predictor.model_version}-shadow",
            "loaded": predictor.shadow_model is not None,
        },
    }
