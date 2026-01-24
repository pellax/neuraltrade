"""
RabbitMQ Consumer for ML Engine
Processes incoming market data and generates signals
"""

import asyncio
import json
from typing import Callable, Optional
import structlog
import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from ..config import settings

log = structlog.get_logger()


class QueueConsumer:
    """Async RabbitMQ consumer for market data messages."""
    
    def __init__(self):
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.queue: Optional[aio_pika.Queue] = None
        self._consuming = False
    
    async def connect(self) -> None:
        """Connect to RabbitMQ."""
        try:
            self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Set QoS
            await self.channel.set_qos(prefetch_count=10)
            
            # Declare exchange
            exchange = await self.channel.declare_exchange(
                settings.rabbitmq_exchange,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            
            # Declare queue
            self.queue = await self.channel.declare_queue(
                settings.rabbitmq_queue_signals,
                durable=True,
            )
            
            # Bind to market events
            await self.queue.bind(exchange, "market.#")
            
            log.info("rabbitmq_connected")
        except Exception as e:
            log.error("rabbitmq_connection_failed", error=str(e))
            raise
    
    async def consume(self, callback: Callable[[dict], None]) -> None:
        """Start consuming messages."""
        if not self.queue:
            raise RuntimeError("Not connected to RabbitMQ")
        
        self._consuming = True
        
        async def process_message(message: AbstractIncomingMessage) -> None:
            async with message.process():
                try:
                    body = json.loads(message.body.decode())
                    log.debug("message_received", routing_key=message.routing_key)
                    callback(body)
                except Exception as e:
                    log.error("message_processing_error", error=str(e))
        
        await self.queue.consume(process_message)
        log.info("consuming_started", queue=settings.rabbitmq_queue_signals)
        
        # Keep running
        while self._consuming:
            await asyncio.sleep(1)
    
    async def stop(self) -> None:
        """Stop consuming."""
        self._consuming = False
    
    async def disconnect(self) -> None:
        """Disconnect from RabbitMQ."""
        await self.stop()
        
        if self.connection:
            await self.connection.close()
            log.info("rabbitmq_disconnected")
    
    @property
    def is_connected(self) -> bool:
        """Check connection status."""
        return self.connection is not None and not self.connection.is_closed
