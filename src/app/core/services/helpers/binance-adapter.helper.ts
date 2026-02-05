import { BinanceTickerResponse, CryptoAsset } from '../../models/crypto.model';

export class BinanceAdapterHelper {
    static normalizeTicker(apiData: BinanceTickerResponse): Partial<CryptoAsset> {
        return {
            price: parseFloat(apiData.lastPrice),
            changePercent: parseFloat(apiData.priceChangePercent),
            volume: parseFloat(apiData.volume),
            high24h: parseFloat(apiData.highPrice),
            low24h: parseFloat(apiData.lowPrice)
        };
    }

    static normalizeKlines(klines: any[][]): number[] {
        // Binance K-Line format: [time, open, high, low, close, volume, ...]
        // We take 'close' (index 4)
        return klines.map(k => parseFloat(k[4]));
    }
}
