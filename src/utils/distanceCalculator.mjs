

// export const calculateDistance = async (pickupLocation, dropoffLocation) => {
//     try {
//         // Example distance calculation logic
//         // This could be replaced with a real API call to a service like Google Maps or OpenStreetMap
//         const distance = Math.sqrt(
//             Math.pow(dropoffLocation.latitude - pickupLocation.latitude, 2) +
//             Math.pow(dropoffLocation.longitude - pickupLocation.longitude, 2)
//         ) * 111; // Approximate conversion from degrees to kilometers

//         return distance;
//     } catch (error) {
//         console.error('Error calculating distance:', error);
//         throw new Error('Distance calculation failed');
//     }
// }

// export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
//     const R = 6371; // Radius of the earth in km
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a =
//         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//         Math.sin(dLon / 2) * Math.sin(dLon / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c; // Distance in km
// }

export const calculateDistance = (pickupLocation, dropoffLocation) => {
    const [lng1, lat1] = pickupLocation.coordinates;
    const [lng2, lat2] = dropoffLocation.coordinates;
  
    if (
      lat1 == null || lng1 == null ||
      lat2 == null || lng2 == null
    ) {
      throw new Error("Invalid coordinates");
    }
  
    const R = 6371; // Earth radius in KM
    const toRad = (value) => (value * Math.PI) / 180;
  
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
  
    return Number(distance.toFixed(2));
  };