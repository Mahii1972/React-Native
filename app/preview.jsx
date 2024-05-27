import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Appearance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useImage } from './context/ImageContext'; // Import useImage
import { supabase } from '../lib/supabase';
import { uploadImageToS3 } from '../lib/aws';
import { useNavigation } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

export default function Preview() {
  const { imageUri } = useImage(); // Access the imageUri
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [numStems, setNumStems] = useState(0);
  const [showStemInputs, setShowStemInputs] = useState(false);
  const [stemMeasurements, setStemMeasurements] = useState([]);
  const [savingData, setSavingData] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const navigation = useNavigation();

  // Theme management
  const [theme, setTheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Get location when the component mounts
    getGPSLocation();
  }, []);

  const getGPSLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
      alert(
        'Error getting location. Please make sure location services are enabled.'
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleNumStemsChange = (text) => {
    const numericValue = parseInt(text, 10);
    if (!isNaN(numericValue)) {
      setNumStems(numericValue);
    } else {
      setNumStems(0);
    }
  };

  const handleStemInputChange = (index, text) => {
    const updatedMeasurements = [...stemMeasurements];
    updatedMeasurements[index] = text;
    setStemMeasurements(updatedMeasurements);
  };

  const saveDataToStorage = async () => {
    if (imageUri && numStems > 0 && stemMeasurements.length === numStems) {
      setSavingData(true);
      setSaveMessage('');

      // Check network connectivity
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      // Get device ID and current date
      const deviceId = await AsyncStorage.getItem('device_id');
      const currentDate = new Date().toISOString();

      if (isConnected) {
        try {
          // Upload image to S3
          const imageUrl = await uploadImageToS3(imageUri);

// Add data to Supabase (with imageUrl, deviceId, and currentDate)
const { error } = await supabase
  .from('stems')
  .insert([
    {
      stems_no: numStems,
      stems_measure: stemMeasurements.map(Number),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      image_url: imageUrl,
      device_id: deviceId,
      date: new Date(), // Use new Date() to get the current timestamp
    },
  ]);

          if (error) {
            console.error('Error saving data to Supabase:', error);
            setSaveMessage('Error saving data');
            throw error; // Re-throw to handle in catch block
          } else {
            console.log('Data saved to Supabase successfully!');
          }
        } catch (error) {
          console.error('Error saving data:', error);
          setSaveMessage('Error saving data');
          Alert.alert('Network Error', 'Please sync the stored data later.', [
            { text: 'OK', onPress: () => navigation.navigate('index') },
          ]);
          return; // Stop further processing if online save fails
        } 
      } else {
        // Save data to AsyncStorage for offline storage
        try {
          const existingDataString = await AsyncStorage.getItem('capturedData');
          const existingData = existingDataString
            ? JSON.parse(existingDataString)
            : [];

            const newData = [
              ...existingData,
              {
                uri: imageUri,
                stems: stemMeasurements,
                location: location,
                device_id: deviceId,
                date: new Date(), // Use new Date() to get the current timestamp
                // Don't upload image to S3 here, save locally
              },
            ];

          await AsyncStorage.setItem('capturedData', JSON.stringify(newData));
          console.log('Data saved to AsyncStorage successfully!');
        } catch (error) {
          console.error('Error saving data to AsyncStorage:', error);
          setSaveMessage('Error saving data');
        }
        Alert.alert('Success', 'Data saved offline.', [
          { text: 'OK', onPress: () => navigation.navigate('index') },
        ]);
        return; // Stop further processing if offline save is done
      }

      // Reset the form and show success message if data is saved online or offline
      setNumStems(0);
      setShowStemInputs(false);
      setStemMeasurements([]);
      setSaveMessage('Data saved successfully!'); 
      Alert.alert('Success', 'Data saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('index') },
      ]);
    } else {
      alert(
        'Please capture an image, enter stem count, and fill all stem measurements!'
      );
    }
    setSavingData(false);
  };

  if (!imageUri) {
    return (
      <View style={styles.container}>
        <Text>No image selected.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#333' : 'white' }]}>
      {loadingLocation && <ActivityIndicator size="large" />}
      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
        </View>
      )}
      <ScrollView style={styles.formContainer}>
        <View style={styles.formContent}>
          <View style={styles.inputContainer}>
            <Text
              style={[
                styles.label,
                { color: theme === 'dark' ? 'white' : 'black' },
              ]}
            >
              No of stems:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme === 'dark' ? '#444' : 'white',
                  color: theme === 'dark' ? 'white' : 'black',
                },
              ]}
              value={numStems.toString()}
              onChangeText={handleNumStemsChange}
              placeholder="Enter number of stems"
              placeholderTextColor={theme === 'dark' ? 'gray' : 'lightgray'}
              keyboardType="numeric"
            />
          </View>
  
          {!showStemInputs && (
            <Button
              title="Next"
              onPress={() => setShowStemInputs(true)}
              disabled={numStems === 0}
            />
          )}
  
          {showStemInputs && (
            <>
              {Array.from(Array(numStems).keys()).map((index) => (
                <View key={index} style={styles.inputContainer}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme === 'dark' ? 'white' : 'black' },
                    ]}
                  >
                    Stem {index + 1}:
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme === 'dark' ? '#444' : 'white',
                        color: theme === 'dark' ? 'white' : 'black',
                      },
                    ]}
                    onChangeText={(text) =>
                      handleStemInputChange(index, text)
                    }
                    placeholder={`Enter measurement for stem ${
                      index + 1
                    }`}
                    placeholderTextColor={
                      theme === 'dark' ? 'gray' : 'lightgray'
                    }
                    keyboardType="numeric"
                  />
                </View>
              ))}
  
              <View style={styles.inputContainer}>
                <Text
                  style={[
                    styles.label,
                    { color: theme === 'dark' ? 'white' : 'black' },
                  ]}
                >
                  Location:
                </Text>
                <Text style={{ color: theme === 'dark' ? 'white' : 'black' }}>
                  {location ? (
                    `${location.latitude}, ${location.longitude}`
                  ) : (
                    'Loading location...'
                  )}
                </Text>
              </View>
              <View style={styles.buttonContainer}>
                <Button title="Save Data" onPress={saveDataToStorage} />
              </View>
              {savingData && (
                <View style={styles.spinnerContainer}>
                  <ActivityIndicator size="large" color="#007bff" />
                </View>
              )}
              {saveMessage !== '' && (
                <Text
                  style={[
                    styles.saveMessageText,
                    {
                      color:
                        saveMessage.startsWith('Error') ? 'red' : 'green',
                    },
                  ]}
                >
                  {saveMessage}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    imageContainer: {
      width: '100%',
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    formContainer: {
      flex: 1,
      width: '100%',
      padding: 20,
    },
    formContent: {
      width: '100%',
      paddingBottom: 20,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      marginBottom: 5,
      fontWeight: 'bold',
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      borderRadius: 5,
      width: '100%',
    },
    buttonContainer: {
      marginBottom: 20,
    },
    spinnerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveMessageText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 10,
    },
  });
  
