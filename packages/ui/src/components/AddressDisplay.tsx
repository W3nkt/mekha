import type { LaoAddress } from "@mekha/types";
export function AddressDisplay({ address }: { address: LaoAddress }) {
  const hasCoordinates =
    address.gps_lat !== undefined && address.gps_lng !== undefined;
  return (
    <address className="mk-address">
      <strong>
        {address.province_name_lo} <span aria-hidden="true">›</span>{" "}
        {address.district_name_lo}
      </strong>
      <span>{address.village_landmark}</span>
      {hasCoordinates && (
        <a
          href={`https://maps.google.com/?q=${address.gps_lat},${address.gps_lng}`}
          target="_blank"
          rel="noreferrer"
        >
          ⌖ {address.gps_lat}, {address.gps_lng}
        </a>
      )}
    </address>
  );
}
