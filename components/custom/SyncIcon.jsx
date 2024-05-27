import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../lib/supabase'; 
import { bulkUploadToS3 } from '../../lib/aws'; 

export default async function syncData() {
  let isSyncing = false; 

  const handleSyncPress = async () => {
    if (isSyncing) return; 

    isSyncing = true;

    const isConnected = await NetInfo.fetch().then(state => state.isConnected);

    if (!isConnected) {
      isSyncing = false;
      return; 
    }

    try {
      const existingDataString = await AsyncStorage.getItem('capturedData');
      if (existingDataString) {
        const existingData = JSON.parse(existingDataString);
        const startTime = performance.now();

        // 2. Bulk Upload Images to S3
        const imageUrisToUpload = existingData
          .filter(item => !item.imageUrl) 
          .map(item => item.uri);

        if (imageUrisToUpload.length > 0) {
          try {
            const uploadedImageUrls = await bulkUploadToS3(imageUrisToUpload);

            // Update existingData with uploaded image URLs
            let imageUrlIndex = 0;
            for (let i = 0; i < existingData.length; i++) {
              if (!existingData[i].imageUrl) {
                existingData[i].imageUrl = uploadedImageUrls[imageUrlIndex];
                imageUrlIndex++;
              }
            }
          } catch (awsError) {
            console.error('Error during bulk upload to S3:', awsError);
            // Handle S3 bulk upload error (e.g., retry, skip, inform user)
            isSyncing = false; 
            return;
          }
        }

        // 3. Bulk Insert into Supabase
        try {
          const dataToInsert = existingData.map(item => ({
            stems_no: item.stems.length, 
            stems_measure: item.stems.map(Number), 
            location: {
              latitude: item.location.latitude,
              longitude: item.location.longitude,
            },
            image_url: item.imageUrl, 
            date: item.date, 
            device_id: item.device_id,
          }));

          const { error: supabaseError } = await supabase
            .from('stems')
            .insert(dataToInsert);

          if (supabaseError) {
            console.error('Error saving data to Supabase:', supabaseError);
            // Handle Supabase error (e.g., retry, skip, inform user)
            isSyncing = false; 
            return; 
          }

          // 4. Clear AsyncStorage after successful sync
          await AsyncStorage.setItem('capturedData', JSON.stringify([])); 
          const endTime = performance.now();
          const executionTime = endTime - startTime;
          console.log(`Loop execution time: ${executionTime} milliseconds`);
        } catch (supabaseError) {
          console.error('Error saving data to Supabase:', supabaseError);
          // Handle Supabase error 
        }
      }
      isSyncing = false; 
    } catch (e) {
      console.error('Error during sync:', e);
      isSyncing = false; 
    }
  }; 

  const checkForUnsyncedData = async () => {
    try {
      const existingDataString = await AsyncStorage.getItem('capturedData');
      if (existingDataString) {
        const existingData = JSON.parse(existingDataString);
        if (existingData.length > 0) {
          return true; 
        }
      }
    } catch (e) {
      console.log('Error checking for unsynced data:', e);
    }
    return false; 
  };

  if (await checkForUnsyncedData()) {
    await handleSyncPress();
    console.log('Data sync succeed');
  } else {
    console.log('No data to sync');
  }
}