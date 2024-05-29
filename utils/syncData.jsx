import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { bulkUploadToS3 } from '../lib/aws';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';


const SYNC_TASK_NAME = 'syncData';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const existingDataString = await AsyncStorage.getItem('capturedData');
    if (existingDataString) {
      const existingData = JSON.parse(existingDataString);
      const startTime = performance.now();

      // Bulk Upload Images to S3
      const imageUrisToUpload = existingData
        .filter(item => item.uri && !item.imageUrl)
        .map(item => item.uri);

      if (imageUrisToUpload.length > 0) {
        try {
          const uploadedImageUrls = await bulkUploadToS3(imageUrisToUpload);
          let imageUrlIndex = 0;
          for (let i = 0; i < existingData.length; i++) {
            if (existingData[i].uri && !existingData[i].imageUrl) {
              existingData[i].imageUrl = uploadedImageUrls[imageUrlIndex];
              imageUrlIndex++;
            }
          }
        } catch (awsError) {
          console.error('Error during bulk upload to S3:', awsError);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      }

      // Bulk Insert into Supabase
      try {
        const dataToInsert = existingData.map(item => ({
          stems_no: item.stems.length,
          stems_measure: item.stems.map(Number),
          location: {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          },
          image_url: item.imageUrl || null,
          date: item.date,
          device_id: item.device_id,
        }));

        const { error: supabaseError } = await supabase
          .from('stems')
          .insert(dataToInsert);

        if (supabaseError) {
          console.error('Error saving data to Supabase:', supabaseError);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        const endTime = performance.now();
        const executionTime = endTime - startTime;
        console.log(`Loop execution time: ${executionTime} milliseconds`);

        console.log('Data sync succeeded');
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (supabaseError) {
        console.error('Error saving data to Supabase:', supabaseError);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    } else {
      console.log('No data to sync');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (e) {
    console.error('Error during sync:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundSync() {
  return BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval: 2, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

async function unregisterBackgroundSync() {
  return BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
}

export { registerBackgroundSync, unregisterBackgroundSync };
