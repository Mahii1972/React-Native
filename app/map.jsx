import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [stemsData, setStemsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null); // Reference to the MapView component

  useEffect(() => {
    const fetchStems = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('stems')
          .select('id, location');

        if (error) {
          console.error('Supabase error:', error);
          setError(error);
        } else {
          setStemsData(data);
        }
      } catch (fetchError) {
        console.error('Error fetching data:', fetchError);
        setError(fetchError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStems();
  }, []);

  // Function to find the region with the most coordinates
  const findMostPopulatedRegion = () => {
    const locationCounts = {};
    const regionPadding = 0.01; // Adjust padding as needed

    stemsData.forEach((stem) => {
      if (stem.location && stem.location.latitude && stem.location.longitude) {
        const latLngKey = `${stem.location.latitude},${stem.location.longitude}`;
        locationCounts[latLngKey] = (locationCounts[latLngKey] || 0) + 1;
      }
    });

    let maxCount = 0;
    let mostPopulatedLocation = null;
    for (const location in locationCounts) {
      if (locationCounts[location] > maxCount) {
        maxCount = locationCounts[location];
        mostPopulatedLocation = location;
      }
    }

    if (mostPopulatedLocation) {
      const [latitude, longitude] = mostPopulatedLocation.split(',').map(parseFloat);
      return {
        latitude,
        longitude,
        latitudeDelta: regionPadding,
        longitudeDelta: regionPadding * (width / height), // Aspect ratio correction
      };
    } else {
      return null; // Handle cases where no valid location data is found
    }
  };

  // Animate to the most populated region after data loads
  useEffect(() => {
    if (!isLoading && stemsData.length > 0) {
      const mostPopulatedRegion = findMostPopulatedRegion();
      if (mostPopulatedRegion && mapRef.current) {
        mapRef.current.animateToRegion(mostPopulatedRegion, 1000); // 1-second animation
      }
    }
  }, [isLoading, stemsData]); // Run effect when data finishes loading

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} >
        {stemsData.map((stem) => {
          if (stem.location && stem.location.latitude && stem.location.longitude) {
            return (
              <Marker
                key={stem.id}
                coordinate={{
                  latitude: stem.location.latitude,
                  longitude: stem.location.longitude,
                }}
                title={`Stem ${stem.id}`}
              />
            );
          } else {
            console.warn(`Invalid location data for Stem ${stem.id}`, stem.location);
            return null;
          }
        })}
      </MapView>

      {isLoading && <Text>Loading map data...</Text>}
      {error && <Text>Error: {error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});