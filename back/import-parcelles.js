const fs = require("fs");

const API_URL = "http://localhost:3000";

async function main() {
  const data = JSON.parse(
    fs.readFileSync("./cocoashield-parcelles-test.json", "utf8")
  );

  for (const parcelle of data.parcelles) {
    const coordinates = parcelle.geometry.coordinates[0];

    const response = await fetch(`${API_URL}/v1/parcels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: parcelle.nom,
        coordinates,
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      console.error(`❌ ${parcelle.nom}`);
      console.error(`HTTP ${response.status}: ${body}`);
      continue;
    }

    console.log(`✅ ${parcelle.nom} créée`);
  }
}

main().catch((error) => {
  console.error("Erreur pendant l'import :", error);
  process.exit(1);
});