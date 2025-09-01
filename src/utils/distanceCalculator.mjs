

export const calculateDistance = async (pickupLocation, dropoffLocation) => {
    try {
        // Example distance calculation logic
        // This could be replaced with a real API call to a service like Google Maps or OpenStreetMap
        const distance = Math.sqrt(
            Math.pow(dropoffLocation.latitude - pickupLocation.latitude, 2) +
            Math.pow(dropoffLocation.longitude - pickupLocation.longitude, 2)
        ) * 111; // Approximate conversion from degrees to kilometers

        return distance;
    } catch (error) {
        console.error('Error calculating distance:', error);
        throw new Error('Distance calculation failed');
    }
}

export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}
