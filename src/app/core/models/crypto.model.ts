export interface CryptoAsset {
    id: string;           // Ejemplo: 'bitcoin'
    symbol: string;       // Ejemplo: 'BTC'
    name: string;         // Ejemplo: 'Bitcoin'
    price: number;        // Precio actual
    lastPrice: number;    // Precio anterior (para saber si subió o bajó)
    changePercent: number;// Variación 24h (para el Top Gainers)
    history: number[];    // Array para el cálculo del Web Worker (promedios)
}

export interface WorkerData {
    action: 'CALCULATE_STATS';
    payload: CryptoAsset[];
}

export interface WorkerResponse {
    assetId: string;
    movingAverage: number; // Promedio Móvil
    volatility: number;    // Volatilidad
}