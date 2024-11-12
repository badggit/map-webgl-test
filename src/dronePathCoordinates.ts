// Drone time and coordinates type //
export type DronePathCoordinates = [number, number, number, number][];

// Convert CSV to coordinates array //
const csvToCoordinates = (csvData: string): DronePathCoordinates => {
  const lines = csvData.trim().split('\n');
  const coordinates: DronePathCoordinates = [];

  // Skip the header line and parse each row //
  lines.slice(1).forEach(line => {
    const [timestamp, lat, lon, alt] = line.split(';');
    const time = parseInt(timestamp) / 1e6;
    const latNum = parseInt(lat) / 1e7;
    const lngNum = parseInt(lon) / 1e7;
    const altNum = parseInt(alt) / 1000;

    if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(altNum)) {
      coordinates.push([time, lngNum, latNum, altNum]);
    } else {
      console.error('Bad coordinates in CSV file: ', line);
    }
  });

  return coordinates;
};

const dronePathCoordinates = async (): Promise<DronePathCoordinates | undefined> => {
  try {
    const response = await fetch('./data/gps_data.csv');
    const csvData = await response.text();
    return csvToCoordinates(csvData);
  } catch (error) {
    console.error('Error fetching the CSV file:', error);
    throw error;
  }
};

export default dronePathCoordinates;
