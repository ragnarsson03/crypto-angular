export interface CryptoAsset {
    id: string;
    symbol: string;
    price: number;
    changePercent: number;
    history: number[];
}

// Esta es la clave para reparar tu error
export interface WorkerData {
    action: 'CALCULATE_STATS';
    payload: CryptoAsset[];
}

export interface WorkerResponse {
    id: string;
    sma: number;
    volatility: number;
}

export interface BinanceTickerDto {
    symbol: string;
    price: string;
}