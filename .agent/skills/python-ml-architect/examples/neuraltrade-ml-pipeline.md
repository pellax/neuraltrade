# Ejemplo: Pipeline Completo de ML para NeuralTrade

Este ejemplo demuestra cómo Python ML Architect construye un pipeline completo de entrenamiento e inferencia para el Signal Predictor de NeuralTrade.

---

## 📋 Objetivo

Construir un sistema que:
1. Entrene un modelo LSTM para predicción de señales de trading
2. Valide todos los datos con Pydantic
3. Sirva el modelo via FastAPI
4. Monitoree performance en producción

---

## 1. 🗂️ Estructura del Proyecto

```
services/ml-engine/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Settings con Pydantic
│   ├── models/
│   │   ├── __init__.py
│   │   ├── signal_predictor.py # PyTorch model
│   │   └── attention.py        # Attention mechanism
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── signal.py           # Input/Output schemas
│   │   └── training.py         # Training config schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── predictor.py        # Inference service
│   │   └── risk_assessor.py    # FMEA risk analysis
│   ├── queue/
│   │   ├── __init__.py
│   │   └── consumer.py         # RabbitMQ consumer
│   └── utils/
│       ├── __init__.py
│       ├── metrics.py          # Prometheus metrics
│       └── logging.py          # Structured logging
├── training/
│   ├── train.py                # Training script
│   ├── evaluate.py             # Evaluation script
│   └── data_loader.py          # Data pipeline
├── models/                     # Saved model weights
│   └── signal_predictor_v1.2.0.pt
├── tests/
│   ├── test_model.py
│   ├── test_schemas.py
│   └── test_api.py
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

---

## 2. 🔧 Configuración con Pydantic Settings

```python
# app/config.py
"""
Configuración centralizada usando Pydantic Settings.
Valida todas las variables de entorno al startup.
"""
from pathlib import Path
from functools import lru_cache
from pydantic import Field, field_validator, AnyUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # ═══════════════════════════════════════════════════════════
    # APP
    # ═══════════════════════════════════════════════════════════
    ENVIRONMENT: str = Field(default="development", pattern=r"^(development|staging|production)$")
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO", pattern=r"^(DEBUG|INFO|WARNING|ERROR)$")
    
    # ═══════════════════════════════════════════════════════════
    # MODEL
    # ═══════════════════════════════════════════════════════════
    MODEL_PATH: Path = Field(default=Path("models/signal_predictor_v1.2.0.pt"))
    MODEL_VERSION: str = Field(default="v1.2.0")
    CONFIDENCE_THRESHOLD: float = Field(default=0.85, ge=0.0, le=1.0)
    
    # Model hyperparameters
    INPUT_SIZE: int = Field(default=5)
    HIDDEN_SIZE: int = Field(default=128)
    NUM_LAYERS: int = Field(default=2)
    DROPOUT: float = Field(default=0.2, ge=0.0, lt=1.0)
    SEQUENCE_LENGTH: int = Field(default=60, ge=10, le=200)
    
    # ═══════════════════════════════════════════════════════════
    # INFERENCE
    # ═══════════════════════════════════════════════════════════
    MAX_BATCH_SIZE: int = Field(default=100, ge=1, le=1000)
    INFERENCE_TIMEOUT_MS: int = Field(default=5000, ge=100)
    USE_QUANTIZATION: bool = Field(default=False)
    DEVICE: str = Field(default="auto", pattern=r"^(auto|cpu|cuda|mps)$")
    
    # ═══════════════════════════════════════════════════════════
    # EXTERNAL SERVICES
    # ═══════════════════════════════════════════════════════════
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@localhost:5672")
    MONGODB_URI: str = Field(default="mongodb://localhost:27017/neuraltrade")
    REDIS_URL: str = Field(default="redis://localhost:6379")
    
    # ═══════════════════════════════════════════════════════════
    # API
    # ═══════════════════════════════════════════════════════════
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000, ge=1, le=65535)
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000", "http://localhost:3100"])
    
    @field_validator("MODEL_PATH")
    @classmethod
    def validate_model_path(cls, v: Path) -> Path:
        """Warn if model path doesn't exist."""
        if not v.exists():
            import logging
            logging.warning(f"Model path {v} does not exist. Using random weights.")
        return v
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse comma-separated string to list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
```

---

## 3. 🧠 Modelo PyTorch Completo

```python
# app/models/signal_predictor.py
"""
Signal Predictor: LSTM + Attention para predicción de señales de trading.

Arquitectura:
    Input → BatchNorm → LSTM(bi) → Attention → FC → Softmax
    
Shapes:
    (B, 60, 5) → (B, 60, 256) → (B, 256) → (B, 3)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class TemporalAttention(nn.Module):
    """
    Attention mechanism para secuencias temporales.
    Aprende a ponderar la importancia de cada timestep.
    
    Shape:
        Input: (batch, seq_len, hidden)
        Output: (batch, hidden)
    """
    
    def __init__(self, hidden_size: int) -> None:
        super().__init__()
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.Tanh(),
            nn.Linear(hidden_size // 2, 1),
        )
    
    def forward(self, lstm_output: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            lstm_output: (batch, seq_len, hidden)
        
        Returns:
            context: Weighted sum (batch, hidden)
            weights: Attention weights (batch, seq_len)
        """
        # Calcular scores
        scores = self.attention(lstm_output)  # (batch, seq, 1)
        weights = F.softmax(scores, dim=1)    # (batch, seq, 1)
        
        # Weighted sum
        context = torch.sum(weights * lstm_output, dim=1)  # (batch, hidden)
        
        return context, weights.squeeze(-1)


class SignalPredictor(nn.Module):
    """
    LSTM-based signal predictor for NeuralTrade.
    
    Features:
        - Bidirectional LSTM for temporal patterns
        - Attention mechanism for timestep importance
        - Dropout regularization
        - Xavier/Orthogonal initialization
    
    Args:
        input_size: Features per timestep (OHLCV = 5)
        hidden_size: LSTM hidden dimension
        num_layers: Stacked LSTM layers
        output_size: Number of classes (sell, hold, buy = 3)
        dropout: Dropout rate
        bidirectional: Use bidirectional LSTM
    
    Example:
        >>> model = SignalPredictor()
        >>> x = torch.randn(32, 60, 5)  # (batch, seq, features)
        >>> logits, hidden = model(x)
        >>> print(logits.shape)  # torch.Size([32, 3])
    """
    
    def __init__(
        self,
        input_size: int = 5,
        hidden_size: int = 128,
        num_layers: int = 2,
        output_size: int = 3,
        dropout: float = 0.2,
        bidirectional: bool = True,
    ) -> None:
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1
        
        # Input normalization
        self.input_norm = nn.BatchNorm1d(input_size)
        
        # Feature projection (optional, for larger inputs)
        self.feature_proj = nn.Linear(input_size, hidden_size // 2)
        
        # LSTM
        self.lstm = nn.LSTM(
            input_size=hidden_size // 2,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=bidirectional,
        )
        
        # Attention
        lstm_output_size = hidden_size * self.num_directions
        self.attention = TemporalAttention(lstm_output_size)
        
        # Classifier
        self.classifier = nn.Sequential(
            nn.Linear(lstm_output_size, hidden_size),
            nn.LayerNorm(hidden_size),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, output_size),
        )
        
        # Initialize weights
        self._init_weights()
        
        # Log architecture
        total_params = sum(p.numel() for p in self.parameters())
        logger.info(f"SignalPredictor initialized: {total_params:,} parameters")
    
    def _init_weights(self) -> None:
        """Initialize weights with Xavier/Orthogonal."""
        for name, param in self.named_parameters():
            if "lstm" in name:
                if "weight_ih" in name:
                    nn.init.xavier_uniform_(param)
                elif "weight_hh" in name:
                    nn.init.orthogonal_(param)
                elif "bias" in name:
                    nn.init.zeros_(param)
                    # Forget gate bias = 1
                    n = param.size(0)
                    param.data[n // 4 : n // 2].fill_(1.0)
            elif "weight" in name and param.dim() >= 2:
                nn.init.xavier_uniform_(param)
            elif "bias" in name:
                nn.init.zeros_(param)
    
    def forward(
        self,
        x: torch.Tensor,
        hidden: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
        return_attention: bool = False,
    ) -> Tuple[torch.Tensor, ...]:
        """
        Forward pass.
        
        Args:
            x: Input sequence (batch, seq_len, input_size)
            hidden: Optional previous hidden state
            return_attention: Include attention weights in output
        
        Returns:
            logits: Class logits (batch, output_size)
            hidden: Final hidden state (h_n, c_n)
            attention_weights: (optional) (batch, seq_len)
        
        Shape Flow:
            x: (B=32, S=60, F=5)
            after norm: (B, S, F)
            after proj: (B, S, H/2=64)
            after lstm: (B, S, H*2=256) [if bidirectional]
            after attn: (B, H*2=256)
            logits: (B, C=3)
        """
        batch_size, seq_len, _ = x.shape
        
        # Normalize input per feature
        # BatchNorm expects (B, C, L), so transpose
        x = x.transpose(1, 2)  # (B, F, S)
        x = self.input_norm(x)
        x = x.transpose(1, 2)  # (B, S, F)
        
        # Feature projection
        x = self.feature_proj(x)  # (B, S, H/2)
        x = F.gelu(x)
        
        # Initialize hidden if not provided
        if hidden is None:
            hidden = self._init_hidden(batch_size, x.device)
        
        # LSTM forward
        lstm_out, hidden = self.lstm(x, hidden)
        # lstm_out: (B, S, H*num_directions)
        
        # Attention
        context, attn_weights = self.attention(lstm_out)
        # context: (B, H*num_directions)
        
        # Classification
        logits = self.classifier(context)  # (B, output_size)
        
        if return_attention:
            return logits, hidden, attn_weights
        return logits, hidden
    
    def _init_hidden(
        self,
        batch_size: int,
        device: torch.device,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Initialize hidden state with zeros."""
        num_layers = self.num_layers * self.num_directions
        h0 = torch.zeros(num_layers, batch_size, self.hidden_size, device=device)
        c0 = torch.zeros(num_layers, batch_size, self.hidden_size, device=device)
        return (h0, c0)
    
    @torch.no_grad()
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """
        Prediction mode: returns probabilities.
        
        Args:
            x: Input sequence (batch, seq_len, input_size)
        
        Returns:
            probabilities: (batch, output_size) summing to 1
        """
        self.eval()
        logits, _ = self.forward(x)
        return F.softmax(logits, dim=-1)
    
    @torch.no_grad()
    def predict_with_confidence(
        self,
        x: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Prediction with confidence and attention visualization.
        
        Returns:
            predicted_class: (batch,) indices
            confidence: (batch,) max probability
            attention: (batch, seq_len) attention weights
        """
        self.eval()
        logits, _, attention = self.forward(x, return_attention=True)
        probs = F.softmax(logits, dim=-1)
        confidence, predicted = probs.max(dim=-1)
        return predicted, confidence, attention


# ═══════════════════════════════════════════════════════════════
# MODEL FACTORY
# ═══════════════════════════════════════════════════════════════

def create_model(
    config: Optional[dict] = None,
    weights_path: Optional[str] = None,
    device: str = "auto",
) -> Tuple[SignalPredictor, torch.device]:
    """
    Factory function to create and optionally load model.
    
    Args:
        config: Model hyperparameters
        weights_path: Path to saved weights
        device: Device to load model on ("auto", "cpu", "cuda", "mps")
    
    Returns:
        model: Initialized SignalPredictor
        device: Device model is on
    """
    # Determine device
    if device == "auto":
        if torch.cuda.is_available():
            device_obj = torch.device("cuda")
        elif torch.backends.mps.is_available():
            device_obj = torch.device("mps")
        else:
            device_obj = torch.device("cpu")
    else:
        device_obj = torch.device(device)
    
    logger.info(f"Using device: {device_obj}")
    
    # Default config
    default_config = {
        "input_size": 5,
        "hidden_size": 128,
        "num_layers": 2,
        "output_size": 3,
        "dropout": 0.2,
        "bidirectional": True,
    }
    
    if config:
        default_config.update(config)
    
    # Create model
    model = SignalPredictor(**default_config)
    
    # Load weights if provided
    if weights_path:
        state_dict = torch.load(weights_path, map_location=device_obj)
        model.load_state_dict(state_dict)
        logger.info(f"Loaded weights from {weights_path}")
    
    model = model.to(device_obj)
    model.eval()
    
    return model, device_obj
```

---

## 4. 🏋️ Training Pipeline

```python
# training/train.py
"""
Training script for SignalPredictor.
Includes validation, early stopping, and checkpointing.
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from pathlib import Path
from datetime import datetime
import logging
from typing import Optional
from dataclasses import dataclass

from app.models.signal_predictor import SignalPredictor
from app.schemas.training import TrainingConfig
from training.data_loader import OHLCVDataset, create_dataloaders


logger = logging.getLogger(__name__)


@dataclass
class TrainingMetrics:
    """Metrics from one epoch."""
    epoch: int
    train_loss: float
    train_accuracy: float
    val_loss: float
    val_accuracy: float
    learning_rate: float


class EarlyStopping:
    """Early stopping with patience."""
    
    def __init__(self, patience: int = 10, min_delta: float = 1e-4) -> None:
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = float("inf")
        self.should_stop = False
    
    def __call__(self, val_loss: float) -> bool:
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.should_stop = True
        return self.should_stop


class Trainer:
    """
    Training orchestrator for SignalPredictor.
    
    Features:
        - Mixed precision training (AMP)
        - Gradient clipping
        - Learning rate scheduling
        - Early stopping
        - Checkpointing
        - TensorBoard logging
    """
    
    def __init__(
        self,
        model: SignalPredictor,
        config: TrainingConfig,
        device: torch.device,
        checkpoint_dir: Path = Path("checkpoints"),
    ) -> None:
        self.model = model.to(device)
        self.config = config
        self.device = device
        self.checkpoint_dir = checkpoint_dir
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # Loss function with class weights (handle imbalanced data)
        self.criterion = nn.CrossEntropyLoss(
            weight=torch.tensor([1.0, 0.5, 1.0], device=device)  # sell, hold, buy
        )
        
        # Optimizer
        self.optimizer = AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )
        
        # Scheduler
        self.scheduler = CosineAnnealingWarmRestarts(
            self.optimizer,
            T_0=10,
            T_mult=2,
        )
        
        # Mixed precision
        self.scaler = torch.cuda.amp.GradScaler(enabled=device.type == "cuda")
        
        # Early stopping
        self.early_stopping = EarlyStopping(patience=config.early_stopping_patience)
        
        # Best model tracking
        self.best_val_loss = float("inf")
        self.best_model_path: Optional[Path] = None
    
    def train_epoch(self, dataloader: DataLoader) -> tuple[float, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (x, y) in enumerate(dataloader):
            x, y = x.to(self.device), y.to(self.device)
            
            self.optimizer.zero_grad()
            
            # Mixed precision forward
            with torch.cuda.amp.autocast(enabled=self.device.type == "cuda"):
                logits, _ = self.model(x)
                loss = self.criterion(logits, y)
            
            # Backward with gradient scaling
            self.scaler.scale(loss).backward()
            
            # Gradient clipping
            self.scaler.unscale_(self.optimizer)
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            self.scaler.step(self.optimizer)
            self.scaler.update()
            
            # Metrics
            total_loss += loss.item()
            pred = logits.argmax(dim=-1)
            correct += (pred == y).sum().item()
            total += y.size(0)
        
        avg_loss = total_loss / len(dataloader)
        accuracy = correct / total
        
        return avg_loss, accuracy
    
    @torch.no_grad()
    def validate(self, dataloader: DataLoader) -> tuple[float, float]:
        """Validate model."""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for x, y in dataloader:
            x, y = x.to(self.device), y.to(self.device)
            
            logits, _ = self.model(x)
            loss = self.criterion(logits, y)
            
            total_loss += loss.item()
            pred = logits.argmax(dim=-1)
            correct += (pred == y).sum().item()
            total += y.size(0)
        
        avg_loss = total_loss / len(dataloader)
        accuracy = correct / total
        
        return avg_loss, accuracy
    
    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
    ) -> list[TrainingMetrics]:
        """
        Full training loop.
        
        Returns:
            List of metrics per epoch
        """
        history = []
        
        for epoch in range(1, self.config.epochs + 1):
            # Train
            train_loss, train_acc = self.train_epoch(train_loader)
            
            # Validate
            val_loss, val_acc = self.validate(val_loader)
            
            # LR scheduling
            self.scheduler.step()
            current_lr = self.optimizer.param_groups[0]["lr"]
            
            # Log metrics
            metrics = TrainingMetrics(
                epoch=epoch,
                train_loss=train_loss,
                train_accuracy=train_acc,
                val_loss=val_loss,
                val_accuracy=val_acc,
                learning_rate=current_lr,
            )
            history.append(metrics)
            
            logger.info(
                f"Epoch {epoch}/{self.config.epochs} | "
                f"Train Loss: {train_loss:.4f} Acc: {train_acc:.2%} | "
                f"Val Loss: {val_loss:.4f} Acc: {val_acc:.2%} | "
                f"LR: {current_lr:.2e}"
            )
            
            # Save best model
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.save_checkpoint(epoch, val_loss, is_best=True)
            
            # Early stopping
            if self.early_stopping(val_loss):
                logger.info(f"Early stopping triggered at epoch {epoch}")
                break
        
        logger.info(f"Training complete. Best val loss: {self.best_val_loss:.4f}")
        return history
    
    def save_checkpoint(
        self,
        epoch: int,
        val_loss: float,
        is_best: bool = False,
    ) -> None:
        """Save model checkpoint."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "val_loss": val_loss,
            "config": self.config.model_dump(),
        }
        
        # Save latest
        path = self.checkpoint_dir / f"checkpoint_epoch_{epoch}_{timestamp}.pt"
        torch.save(checkpoint, path)
        
        # Save best
        if is_best:
            best_path = self.checkpoint_dir / "best_model.pt"
            torch.save(self.model.state_dict(), best_path)
            self.best_model_path = best_path
            logger.info(f"Saved best model to {best_path}")


# ═══════════════════════════════════════════════════════════════
# MAIN TRAINING SCRIPT
# ═══════════════════════════════════════════════════════════════

def main() -> None:
    """Main training entrypoint."""
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-path", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    args = parser.parse_args()
    
    # Config
    config = TrainingConfig(
        learning_rate=args.learning_rate,
        batch_size=args.batch_size,
        epochs=args.epochs,
    )
    
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Data
    train_loader, val_loader = create_dataloaders(
        data_path=args.data_path,
        batch_size=config.batch_size,
    )
    
    # Model
    model = SignalPredictor()
    
    # Train
    trainer = Trainer(model, config, device)
    history = trainer.train(train_loader, val_loader)
    
    print(f"Training complete! Best model: {trainer.best_model_path}")


if __name__ == "__main__":
    main()
```

---

## 5. 📊 Metrics & Monitoring

```python
# app/utils/metrics.py
"""
Prometheus metrics para monitoreo de ML Engine.
"""
from prometheus_client import Counter, Histogram, Gauge, Info


# ═══════════════════════════════════════════════════════════════
# INFERENCE METRICS
# ═══════════════════════════════════════════════════════════════

PREDICTIONS_TOTAL = Counter(
    "ml_predictions_total",
    "Total number of predictions",
    ["symbol", "signal", "risk_level"],
)

PREDICTION_LATENCY = Histogram(
    "ml_prediction_latency_seconds",
    "Time spent on prediction",
    ["endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

PREDICTION_CONFIDENCE = Histogram(
    "ml_prediction_confidence",
    "Distribution of prediction confidence",
    ["signal"],
    buckets=[0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99],
)

# ═══════════════════════════════════════════════════════════════
# MODEL METRICS
# ═══════════════════════════════════════════════════════════════

MODEL_LOADED = Gauge(
    "ml_model_loaded",
    "Whether the model is loaded (1) or not (0)",
)

MODEL_INFO = Info(
    "ml_model",
    "Model metadata",
)

BATCH_SIZE = Histogram(
    "ml_batch_size",
    "Distribution of batch sizes",
    buckets=[1, 5, 10, 25, 50, 100],
)

# ═══════════════════════════════════════════════════════════════
# ERROR METRICS
# ═══════════════════════════════════════════════════════════════

ERRORS_TOTAL = Counter(
    "ml_errors_total",
    "Total number of errors",
    ["error_type"],
)


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def record_prediction(
    symbol: str,
    signal: str,
    confidence: float,
    risk_level: str,
    latency_seconds: float,
) -> None:
    """Record prediction metrics."""
    PREDICTIONS_TOTAL.labels(
        symbol=symbol,
        signal=signal,
        risk_level=risk_level,
    ).inc()
    
    PREDICTION_LATENCY.labels(endpoint="/predict").observe(latency_seconds)
    PREDICTION_CONFIDENCE.labels(signal=signal).observe(confidence)


def record_model_info(version: str, device: str, parameters: int) -> None:
    """Record model metadata."""
    MODEL_INFO.info({
        "version": version,
        "device": device,
        "parameters": str(parameters),
    })
    MODEL_LOADED.set(1)
```

---

## ✅ Checklist de Implementación

```yaml
Modelo:
  ✅ Arquitectura documentada con shapes
  ✅ Inicialización de pesos correcta
  ✅ Modo eval para inferencia
  ✅ Soporte para GPU/MPS/CPU

Validación:
  ✅ Schemas Pydantic para inputs/outputs
  ✅ Validadores de lógica de negocio
  ✅ Error messages descriptivos

API:
  ✅ Lifespan para gestión de modelo
  ✅ Dependency injection
  ✅ Response models tipados
  ✅ Health check

Training:
  ✅ Mixed precision (AMP)
  ✅ Gradient clipping
  ✅ Early stopping
  ✅ Checkpointing

Monitoring:
  ✅ Prometheus metrics
  ✅ Structured logging
  ✅ Error tracking
```

---

*Este ejemplo demuestra el enfoque completo de Python ML Architect para sistemas de ML en producción.*
