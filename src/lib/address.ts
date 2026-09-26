export type Address = {
  street: string;
  apt: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function emptyAddress(): Address {
  return { street: "", apt: "", city: "", state: "", postalCode: "", country: "United States" };
}

export function formatAddress(a: Address): string {
  const line1 = [a.street.trim(), a.apt.trim()].filter(Boolean).join(", ");
  const line2 = [a.city.trim(), a.state.trim(), a.postalCode.trim()].filter(Boolean).join(", ");
  const parts = [line1, line2, a.country.trim()].filter(Boolean);
  return parts.join(" · ") || "Home";
}

export function addressFromNominatim(raw: {
  address?: Record<string, string>;
  display_name?: string;
}): Address {
  const a = raw.address ?? {};
  const street =
    [a.house_number, a.road || a.pedestrian || a.residential || a.street].filter(Boolean).join(" ") ||
    a.amenity ||
    a.building ||
    "";
  return {
    street,
    apt: a.unit || a.apartment || "",
    city: a.city || a.town || a.village || a.hamlet || a.suburb || "",
    state: a.state || a.region || "",
    postalCode: a.postcode || "",
    country: a.country || "United States",
  };
}
