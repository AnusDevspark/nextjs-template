"use client";
import { useState } from "react";
import { ArrowUpRight, Clock3, LocateFixed, MapPin, Phone } from "lucide-react";
import { restaurant } from "./restaurant";

export function Location() {
  const [result, setResult] = useState("");
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) {
      setResult("Location is unavailable in this browser. Share your area with us on WhatsApp.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const radians = (degrees: number) => (degrees * Math.PI) / 180;
        const lat = radians(position.coords.latitude - restaurant.coordinates.lat);
        const lng = radians(position.coords.longitude - restaurant.coordinates.lng);
        const a =
          Math.sin(lat / 2) ** 2 +
          Math.cos(radians(position.coords.latitude)) *
            Math.cos(radians(restaurant.coordinates.lat)) *
            Math.sin(lng / 2) ** 2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const approximate = position.coords.accuracy > 500 ? "Your location accuracy is low. " : "";
        setResult(
          `${approximate}You’re approximately ${distance.toFixed(1)} km away, ${distance <= restaurant.deliveryRadiusKm ? "inside" : "outside"} the illustrated ${restaurant.deliveryRadiusKm} km guide. ${restaurant.coverageConfirmed ? "The restaurant will confirm delivery and charges." : "This is not a confirmed delivery boundary. Contact us to check your address."}`,
        );
        setLocating(false);
      },
      () => {
        setResult(
          "We couldn’t get your location. Select your area at checkout or call us to check delivery.",
        );
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  return (
    <section className="location-section sf-container" id="location">
      <div className="location-copy">
        <span className="eyebrow">YOUR NEIGHBOURHOOD FOODGUY</span>
        <h2>
          Good food.
          <br />
          Closer than you think.
        </h2>
        <p>Pick it up in Johar Town, or ask us to bring it to you.</p>
        <address>
          <MapPin size={21} />
          <span>{restaurant.address}</span>
        </address>
        <p className="info-line">
          <Clock3 size={20} />
          <span>Listed hours: {restaurant.openingHours}</span>
        </p>
        <a className="info-line" href={`tel:${restaurant.phone}`}>
          <Phone size={19} />
          {restaurant.phoneDisplay}
        </a>
        <div className="location-actions">
          <a
            className="sf-button"
            target="_blank"
            rel="noopener noreferrer"
            href={restaurant.mapsUrl}
          >
            Get directions <ArrowUpRight size={18} />
          </a>
          <button className="sf-button secondary" onClick={locate} disabled={locating}>
            <LocateFixed size={18} />
            {locating ? "Checking…" : "Check my location"}
          </button>
        </div>
        <p className="location-result" role="status">
          {result || "Your location is checked only in your browser. We don’t save it."}
        </p>
      </div>
      <div className="map-wrap">
        <iframe
          title="Foodguy location in Johar Town, Lahore"
          src={`https://maps.google.com/maps?q=${restaurant.coordinates.lat},${restaurant.coordinates.lng}&z=14&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer"
          allowFullScreen
        />
        <div className="coverage-guide">
          <div
            className="radius-diagram"
            aria-label={`Illustrative ${restaurant.deliveryRadiusKm} kilometre radius, not confirmed coverage`}
          >
            <MapPin size={20} />
            <span>{restaurant.deliveryRadiusKm} km</span>
          </div>
          <div>
            <strong>Delivery area guide</strong>
            <p>
              Illustrative radius only. Coverage and fees depend on your address and must be
              confirmed by Foodguy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
