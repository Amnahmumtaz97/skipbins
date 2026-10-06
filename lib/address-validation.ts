const australianState = "ACT|NSW|NT|QLD|SA|TAS|VIC|WA";

export function selectedAddressLocationError(
  addressLabel: string,
  quotePostcode: string,
  quoteLocationLabel: string,
) {
  const addressLocation = parseAddressLocation(addressLabel);
  if (!addressLocation)
    return "Select a delivery address from the suggestions.";
  if (addressLocation.state !== "VIC")
    return "We only deliver to Victorian addresses.";
  const selectedSuburb = quoteLocationLabel
    .match(/^(.+),\s*VIC\s+\d{4}$/i)?.[1]
    ?.trim()
    .toUpperCase();
  if (
    addressLocation.postcode === quotePostcode &&
    (!selectedSuburb || addressLocation.suburb === selectedSuburb)
  )
    return "";

  const quoteSuburb = quoteLocationLabel
    .match(
      new RegExp(
        `^\\s*(.+?)(?:,\\s*|\\s+)(${australianState})\\s+${escapeRegExp(quotePostcode)}\\s*$`,
        "i",
      ),
    )?.[1]
    ?.trim()
    .toUpperCase();
  const quotedLocation = [quoteSuburb, quotePostcode].filter(Boolean).join(" ");

  return `This address is in ${addressLocation.suburb} ${addressLocation.postcode}, but your quote was for ${quotedLocation}. Please check before continuing.`;
}

export function parseAddressLocation(addressLabel: string) {
  const match = addressLabel
    .trim()
    .match(
      new RegExp(
        `(?:^|,\\s*)([^,]+?)\\s+(${australianState})\\s+(\\d{4})\\s*$`,
        "i",
      ),
    );
  if (!match) return null;
  return {
    suburb: match[1].trim().toUpperCase(),
    state: match[2].toUpperCase(),
    postcode: match[3],
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
