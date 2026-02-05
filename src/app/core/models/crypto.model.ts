export interface CryptoAsset {
    id: string;
    symbol: string;
    price: number;
    changePercent: number;
    volume: number;
    high24h: number;
    low24h: number;
    history: number[];
    threshold?: number | null;
    isAlertActive?: boolean;
}

export interface WorkerData {
    action: 'CALCULATE_STATS';
    payload: CryptoAsset[];
}

export interface WorkerResponse {
    id: string;
    sma: number;
    volatility: number;
}

export interface BinanceTickerResponse {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    volume: string;
    highPrice: string;
    lowPrice: string;
}