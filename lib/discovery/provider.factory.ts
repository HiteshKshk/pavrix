import { DiscoveryProvider } from "./provider.interface";
import { MockDiscoveryProvider } from "./mock.provider";
import { SerpApiProvider } from "./serpapi.provider";

/**
 * DiscoveryProviderFactory — returns the active discovery provider.
 * Reads DISCOVERY_PROVIDER env var: "serpapi" | "mock" (default: "mock")
 */
export class DiscoveryProviderFactory {
  static getProvider(providerType?: string): DiscoveryProvider {
    const type = (
      providerType ?? process.env.DISCOVERY_PROVIDER ?? "mock"
    ).toLowerCase();

    switch (type) {
      case "google":
      case "serpapi":
        return new SerpApiProvider();
      case "mock":
      default:
        return new MockDiscoveryProvider();
    }
  }
}
