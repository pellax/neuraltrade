"""
FMEA Risk Assessor Service
Failure Modes and Effects Analysis for ML signal validation
"""

import time
from typing import Optional
import structlog

from ..config import settings
from ..schemas.signal import (
    SignalRequest,
    SignalDirection,
    RiskLevel,
    RiskAssessment,
    RiskFactor,
)

log = structlog.get_logger()


class RiskAssessor:
    """
    FMEA-based risk assessment for ML trading signals.
    
    Evaluates signals across multiple failure modes:
    - Data quality (staleness, anomalies)
    - Model reliability (drift, confidence)
    - Market conditions (volatility, liquidity)
    - Execution risks (slippage, latency)
    """
    
    # Risk thresholds
    STALE_DATA_MAX_AGE_MS = settings.risk_max_data_age_seconds * 1000
    DRIFT_THRESHOLD = settings.risk_drift_threshold
    MIN_CONFIDENCE = settings.ml_confidence_threshold
    
    # RPN thresholds for risk levels
    RPN_LOW = 100
    RPN_MEDIUM = 200
    RPN_HIGH = 400
    
    def __init__(self):
        self.historical_accuracy: list[float] = []
        self.recent_predictions: list[dict] = []
    
    def assess(
        self,
        request: SignalRequest,
        direction: SignalDirection,
        confidence: float,
        shadow_agreed: bool,
    ) -> RiskAssessment:
        """
        Perform comprehensive FMEA risk assessment.
        
        Returns RiskAssessment with RPN score and mitigations.
        """
        factors: list[RiskFactor] = []
        mitigations: list[str] = []
        
        # ============================================
        # 1. DATA QUALITY RISKS
        # ============================================
        
        # Check data staleness
        data_age_ms = int(time.time() * 1000) - request.request_timestamp
        is_stale = data_age_ms > self.STALE_DATA_MAX_AGE_MS
        
        if is_stale:
            factors.append(RiskFactor(
                name="Stale Data",
                category="data",
                score=8.0,
                description=f"Data age ({data_age_ms}ms) exceeds threshold ({self.STALE_DATA_MAX_AGE_MS}ms)"
            ))
            mitigations.append("Reject signal and request fresh data")
        
        # Check for data anomalies (extreme price moves)
        prices = [c.close for c in request.candles]
        price_changes = [abs(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
        max_change = max(price_changes) if price_changes else 0
        
        if max_change > 0.1:  # >10% single candle move
            factors.append(RiskFactor(
                name="Anomalous Price Movement",
                category="data",
                score=7.0,
                description=f"Detected {max_change*100:.1f}% price move in single candle"
            ))
            mitigations.append("Verify data integrity before execution")
        
        # ============================================
        # 2. MODEL RELIABILITY RISKS
        # ============================================
        
        # Low confidence check
        if confidence < self.MIN_CONFIDENCE:
            factors.append(RiskFactor(
                name="Low Model Confidence",
                category="model",
                score=6.0,
                description=f"Confidence {confidence:.2%} below threshold {self.MIN_CONFIDENCE:.2%}"
            ))
            mitigations.append("Reduce position size or skip trade")
        
        # Shadow model disagreement
        if not shadow_agreed:
            factors.append(RiskFactor(
                name="Model Disagreement",
                category="model",
                score=7.0,
                description="Primary and shadow models disagree on direction"
            ))
            mitigations.append("Wait for model consensus before entry")
        
        # Model drift detection
        is_drift_detected = self._detect_drift()
        if is_drift_detected:
            factors.append(RiskFactor(
                name="Model Drift Detected",
                category="model",
                score=9.0,
                description=f"Recent accuracy below {(1-self.DRIFT_THRESHOLD)*100:.0f}%"
            ))
            mitigations.append("Trigger model retraining pipeline")
        
        # ============================================
        # 3. MARKET CONDITION RISKS
        # ============================================
        
        # Volatility check (using ATR proxy)
        highs = [c.high for c in request.candles[-14:]]
        lows = [c.low for c in request.candles[-14:]]
        avg_range = sum(h - l for h, l in zip(highs, lows)) / len(highs)
        avg_price = sum(c.close for c in request.candles[-14:]) / 14
        volatility_pct = (avg_range / avg_price) * 100
        
        if volatility_pct > 5:
            factors.append(RiskFactor(
                name="High Volatility",
                category="market",
                score=5.0,
                description=f"14-period volatility at {volatility_pct:.1f}%"
            ))
            mitigations.append("Widen stop-loss or reduce leverage")
        
        # Low volume check
        avg_volume = sum(c.volume for c in request.candles[-14:]) / 14
        last_volume = request.candles[-1].volume
        
        if last_volume < avg_volume * 0.5:
            factors.append(RiskFactor(
                name="Low Liquidity",
                category="market",
                score=4.0,
                description=f"Current volume at {(last_volume/avg_volume)*100:.0f}% of average"
            ))
            mitigations.append("Use limit orders to avoid slippage")
        
        # ============================================
        # 4. EXECUTION RISKS
        # ============================================
        
        # Neutral signal risk (no clear direction)
        if direction == SignalDirection.NEUTRAL:
            factors.append(RiskFactor(
                name="Neutral Signal",
                category="execution",
                score=3.0,
                description="Model suggests no clear trading direction"
            ))
            mitigations.append("Wait for stronger signal confirmation")
        
        # ============================================
        # CALCULATE FMEA SCORES
        # ============================================
        
        # Severity: Average of factor scores
        severity = sum(f.score for f in factors) / len(factors) if factors else 1.0
        
        # Occurrence: Based on number of risk factors
        occurrence = min(10, len(factors) * 2 + 1)
        
        # Detection: Based on our monitoring capabilities
        detection = 4.0 if shadow_agreed else 6.0  # Lower is better (easier to detect)
        
        # RPN = Severity × Occurrence × Detection
        rpn = severity * occurrence * detection
        
        # Classify risk level
        if rpn <= self.RPN_LOW:
            risk_level = RiskLevel.LOW
        elif rpn <= self.RPN_MEDIUM:
            risk_level = RiskLevel.MEDIUM
        elif rpn <= self.RPN_HIGH:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL
        
        log.info(
            "risk_assessment_complete",
            risk_level=risk_level.value,
            rpn=rpn,
            factors_count=len(factors),
            is_stale=is_stale,
            is_drift=is_drift_detected,
            shadow_agreed=shadow_agreed,
        )
        
        return RiskAssessment(
            risk_level=risk_level,
            risk_score=rpn,
            severity_score=severity,
            occurrence_score=occurrence,
            detection_score=detection,
            factors=factors,
            mitigations=mitigations,
            is_stale_data=is_stale,
            is_drift_detected=is_drift_detected,
            is_shadow_model_agreed=shadow_agreed,
        )
    
    def _detect_drift(self) -> bool:
        """
        Detect model drift by analyzing recent prediction accuracy.
        In production, this would compare against actual outcomes.
        """
        if len(self.historical_accuracy) < 10:
            return False
        
        recent_accuracy = sum(self.historical_accuracy[-10:]) / 10
        return recent_accuracy < (1 - self.DRIFT_THRESHOLD)
    
    def record_outcome(self, prediction_id: str, was_correct: bool) -> None:
        """Record prediction outcome for drift detection."""
        self.historical_accuracy.append(1.0 if was_correct else 0.0)
        
        # Keep only last 100 outcomes
        if len(self.historical_accuracy) > 100:
            self.historical_accuracy = self.historical_accuracy[-100:]
