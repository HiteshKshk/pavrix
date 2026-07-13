import { DiscoveryProvider } from "./provider.interface";
import { MockDiscoveryProvider } from "./mock.provider";
import { BraveSearchProvider } from "./brave.provider";
import { GooglePlacesProvider } from "./google-places.provider";

/**
 * DiscoveryProviderFactory — returns the active discovery provider.
 * Reads DISCOVERY_PROVIDER env var: "brave" | "google" | "mock" (default: "mock")
 */
export class DiscoveryProviderFactory {
  static getProvider(providerType?: string): DiscoveryProvider {
    const type = (
      providerType ?? process.env.DISCOVERY_PROVIDER ?? "mock"
    ).toLowerCase();

    switch (type) {
      case "brave":
        return new BraveSearchProvider();
      case "google":
        return new GooglePlacesProvider();
      case "mock":
      default:
        return new MockDiscoveryProvider();
    }
  }
}
