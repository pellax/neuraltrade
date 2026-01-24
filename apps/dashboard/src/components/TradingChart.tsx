'use client';

/**
 * TradingView Lightweight Charts Component
 * Real-time candlestick chart with volume
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';

interface ChartProps {
    symbol: string;
    data: CandlestickData[];
    volumeData?: HistogramData[];
    height?: number;
}

export default function TradingChart({ symbol, data, volumeData, height = 400 }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number>(0);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart with dark theme
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height,
            layout: {
                background: { color: '#111827' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(75, 85, 99, 0.3)' },
                horzLines: { color: 'rgba(75, 85, 99, 0.3)' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: '#00a3ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#00a3ff',
                },
                horzLine: {
                    color: '#00a3ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#00a3ff',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(75, 85, 99, 0.4)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: 'rgba(75, 85, 99, 0.4)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        // Add candlestick series
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        candleSeriesRef.current = candleSeries;

        // Add volume series
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });

        chart.priceScale('').applyOptions({
            scaleMargins: {
                top: 0.85,
                bottom: 0,
            },
        });

        volumeSeriesRef.current = volumeSeries;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [height]);

    // Update data
    useEffect(() => {
        if (candleSeriesRef.current && data.length > 0) {
            candleSeriesRef.current.setData(data);

            // Update current price
            const lastCandle = data[data.length - 1];
            const prevCandle = data[data.length - 2];

            if (lastCandle) {
                setCurrentPrice(lastCandle.close);
                if (prevCandle) {
                    const change = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
                    setPriceChange(change);
                }
            }
        }
    }, [data]);

    // Update volume
    useEffect(() => {
        if (volumeSeriesRef.current && volumeData && volumeData.length > 0) {
            volumeSeriesRef.current.setData(volumeData);
        }
    }, [volumeData]);

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <h3>{symbol}</h3>
                    <span className="live-indicator">LIVE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                    {currentPrice !== null && (
                        <>
                            <span className="data-value mono">
                                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`mono ${priceChange >= 0 ? 'price-up' : 'price-down'}`}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </span>
                        </>
                    )}
                </div>
            </div>
            <div
                ref={chartContainerRef}
                style={{
                    width: '100%',
                    height: `${height}px`,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                }}
            />
        </div>
    );
}
