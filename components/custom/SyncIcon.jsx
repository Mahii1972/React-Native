// SyncIcon.js
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // You can use any icon library
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../lib/supabase'; // Update with your Supabase import
import { uploadImageToS3 } from '../../lib/aws'; // Update with your AWS import

export default function SyncIcon() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check for unsynced data when the component mounts
    checkForUnsyncedData();
  }, []);

  const checkForUnsyncedData = async () => {
    try {
      const existingDataString = await AsyncStorage.getItem('capturedData');
      if (existingDataString) {
        const existingData = JSON.parse(existingDataString);
        if (existingData.length > 0) {
        }
      }
    } catch (e) {
      console.log('Error checking for unsynced data:', e);
    }
  };

  const handleSyncPress = async () => {
    // Prevent multiple sync attempts
    if (isSyncing) return; 

    setIsSyncing(true);
    
    // 1. Check for internet connection
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);

    if (!isConnected) {
      Alert.alert('No Internet Connection', 'Please connect to the internet to sync data.');
      setIsSyncing(false);
      return;
    }

    try {
      const existingDataString = await AsyncStorage.getItem('capturedData');
      if (existingDataString) {
        const existingData = JSON.parse(existingDataString);

        for (let i = 0; i < existingData.length; i++) {
          const { uri, stems, location, imageUrl } = existingData[i];

          // 2. Upload to AWS S3 (if imageUrl doesn't exist)
          let uploadedImageUrl = imageUrl; 
          if (!uploadedImageUrl) {
            try {
              uploadedImageUrl = await uploadImageToS3(uri);
            } catch (awsError) {
              console.error('Error uploading to S3:', awsError);
              // Handle S3 upload error (e.g., retry, skip, inform user)
              continue; // Skip to the next data item
            }
          }

          // 3. Upload to Supabase
          try {
            const { error } = await supabase
              .from('stems')
              .insert([
                {
                  stems_no: stems.length, // Assuming stems is an array
                  stems_measure: stems.map(Number),
                  location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                  },
                  image_url: uploadedImageUrl,
                },
              ]);

            if (error) {
              console.error('Error saving data to Supabase:', error);
              // Handle Supabase error (e.g., retry, skip, inform user)
              continue; // Skip to the next data item
            }

            // 4. Delete the successfully synced data from AsyncStorage
            existingData.splice(i, 1); 
            i--; // Adjust index after deleting an item
            await AsyncStorage.setItem('capturedData', JSON.stringify(existingData));

          } catch (supabaseError) {
            console.error('Error saving data to Supabase:', supabaseError);
            // Handle Supabase error
          }
        }
      }
      setIsSyncing(false);
      Alert.alert('Success', 'Data synced successfully!');
    } catch (e) {
      console.error('Error during sync:', e);
      setIsSyncing(false);
      Alert.alert('Error', 'An error occurred during sync. Please try again later.');
    }
  };

  return (
    <TouchableOpacity onPress={handleSyncPress} disabled={isSyncing} style={styles.syncButton}>
      {isSyncing ? (
        <ActivityIndicator size="small" color="#007bff" />
      ) : (
        <Icon name="sync" size={30} color="#007bff" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  syncButton: {
    margin: 10,
  },
});