/**
 * ML Signal Types
 * Shared between ML Engine and consuming services
 */

import type { Exchange, Symbol, Timeframe } from './market.types.js';

/** Trading signal direction */
export type SignalDirection = 'long' | 'short' | 'neutral';

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** ML Model prediction result */
export interface SignalPrediction {
    id: string;
    exchange: Exchange;
    symbol: Symbol;
    timeframe: Timeframe;
    direction: SignalDirection;
    confidence: number;        // 0.0 to 1.0
    entryPrice: number;
    stopLoss: number;
    takeProfit: number[];      // Multiple TP levels
    riskRewardRatio: number;
    timestamp: number;
    modelVersion: string;
}

/** FMEA Risk Assessment for a signal */
export interface SignalRiskAssessment {
    signalId: string;
    riskLevel: RiskLevel;
    riskScore: number;         // 0-1000 (RPN score)

    // FMEA Components
    severityScore: number;     // 1-10
    occurrenceScore: number;   // 1-10
    detectionScore: number;    // 1-10

    // Risk Factors
    factors: RiskFactor[];
    mitigations: string[];

    // Validation Flags
    isStaleData: boolean;
    isDriftDetected: boolean;
    isShadowModelAgreed: boolean;

    timestamp: number;
}

/** Individual risk factor */
export interface RiskFactor {
    name: string;
    category: 'data' | 'model' | 'market' | 'execution';
    score: number;
    description: string;
}

/** Queue message for signal processing */
export interface SignalMessage {
    type: 'SIGNAL_REQUEST' | 'SIGNAL_RESPONSE' | 'RISK_ASSESSMENT';
    payload: SignalPrediction | SignalRiskAssessment;
    correlationId: string;
    timestamp: number;
}

/** Model metadata */
export interface MLModelInfo {
    id: string;
    version: string;
    type: 'signal_predictor' | 'risk_assessor' | 'sentiment';
    accuracy: number;
    lastTrainedAt: number;
    status: 'active' | 'shadow' | 'deprecated';
    metrics: {
        precision: number;
        recall: number;
        f1Score: number;
        profitFactor: number;
    };
}
