export const fixtureVisibleText = [
  "2022 Porsche 911 Carrera 4S Coupe",
  "Certified Pre-Owned",
  "Agate Grey Metallic Red",
  "Gasoline 1,079 mi Automatic 443 hp",
  "$129,900",
  "Porsche San Antonio San Antonio, TX, 78230",
  "Show details",
  "2024 Porsche 911 Carrera Coupe",
  "Certified Pre-Owned",
  "White Black",
  "Gasoline 11,210 mi Manual 379 hp",
  "$104,500",
  "Porsche Oakland Oakland, CA, 94611",
  "Show details",
  "Next Page"
].join("\n");

export const fixtureHtml = `<!doctype html>
<html>
  <body>
    <article>
      <h2>2022 Porsche 911 Carrera 4S Coupe</h2>
      <p>Certified Pre-Owned</p>
      <p>Agate Grey Metallic Red</p>
      <p>Gasoline 1,079 mi Automatic 443 hp</p>
      <p>$129,900</p>
      <p>Porsche San Antonio San Antonio, TX, 78230</p>
      <a href="/us/en-US/details/porsche-911-carrera-4s-coupe-used-123">Show details</a>
    </article>
    <article>
      <h2>2024 Porsche 911 Carrera Coupe</h2>
      <p>Certified Pre-Owned</p>
      <p>White Black</p>
      <p>Gasoline 11,210 mi Manual 379 hp</p>
      <p>$104,500</p>
      <p>Porsche Oakland Oakland, CA, 94611</p>
      <a href="/us/en-US/details/porsche-911-carrera-coupe-used-456">Show details</a>
    </article>
    <a href="/us/en-US/search/911?page=2">Next Page</a>
  </body>
</html>`;

export const fixtureDetailVisibleText = [
  "2022 Porsche 911 Carrera 4S Coupe",
  "Certified Pre-Owned",
  "$129,900",
  "Porsche San Antonio",
  "Stock Number:",
  "NS123456",
  "VIN:",
  "WP0AB2A99NS123456",
  "Vehicle Equipment",
  "Equipment Highlights",
  "BOSE Surround Sound System Sport Chrono Package Front Axle Lift System ParkAssist incl. Surround View LED Headlights Sports Seats",
  "Included Options",
  "Packages",
  "Premium Package Plus i.c.w. Adaptive Sport Seats Plus (18-way)",
  "Sport Package",
  "Exterior",
  "Electric Slide/Tilt Sunroof in Glass",
  "SportDesign Exterior Mirrors",
  "Transmission / Chassis",
  "Sport Chrono Package",
  "Front Axle Lift System",
  "Interior",
  "GT Sport Steering Wheel",
  "Power Sport Seats (14-way) with Memory Package",
  "Seat Ventilation (Front)",
  "Interior Leather",
  "Interior Trim in Leather",
  "Audio / Communication",
  "BOSE Surround Sound System",
  "Comfort Assistance",
  "Surround View",
  "Standard Equipment",
  "Cruise Control",
  "Standard Sound Package"
].join("\n");

export const fixtureDetailHtml = `<!doctype html>
<html>
  <body>
    ${fixtureDetailVisibleText
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("\n")}
  </body>
</html>`;

export const fixtureUnavailableDetailVisibleText = [
  "2022 Porsche 911 Carrera 4S Coupe",
  "This vehicle is no longer available",
  "Porsche San Antonio",
  "Stock Number:",
  "NS123456",
  "VIN:",
  "WP0AB2A99NS123456"
].join("\n");

export const fixtureUnavailableDetailHtml = `<!doctype html>
<html>
  <body>
    ${fixtureUnavailableDetailVisibleText
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("\n")}
  </body>
</html>`;
