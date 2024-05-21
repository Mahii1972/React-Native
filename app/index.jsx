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
  TouchableOpacity,
  Appearance,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [numStems, setNumStems] = useState(0);
  const [showStemInputs, setShowStemInputs] = useState(false);
  const [stemMeasurements, setStemMeasurements] = useState([]);
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
    const fetchSaveCount = async () => {
      try {
        const existingDataString = await AsyncStorage.getItem('capturedData');
        const existingData = existingDataString
          ? JSON.parse(existingDataString)
          : [];
        setSaveCount(existingData.length);
      } catch (e) {
        console.log('Error fetching save count:', e);
      }
    };
    fetchSaveCount();
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

  const openCamera = async () => {
    await getGPSLocation();

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync();
    if (!cameraResult.canceled) {
      setCapturedImage(cameraResult.assets[0].uri);
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
    if (capturedImage && numStems > 0 && stemMeasurements.length === numStems) {
      try {
        const existingDataString = await AsyncStorage.getItem('capturedData');
        const existingData = existingDataString
          ? JSON.parse(existingDataString)
          : [];

        const newData = [
          ...existingData,
          {
            uri: capturedImage,
            stems: stemMeasurements,
            location: location,
          },
        ];

        await AsyncStorage.setItem('capturedData', JSON.stringify(newData));
        console.log('Data saved successfully!');

             // Add data to Supabase
             try {
              const { data, error } = await supabase
                .from('stems')
                .insert([{
                  stems_no: numStems,
                  stems_measure: stemMeasurements.map(Number),
                  location: { 
                    latitude: location.latitude,
                    longitude: location.longitude 
                  }    
                }]);
          if (error) {
            console.error('Error saving data to Supabase:', error);
            // Handle error appropriately (e.g., show an error message)
          } else {
            console.log('Data saved to Supabase:', data);
            // Update UI or perform other actions after successful save
          }
        } catch (e) {
          console.error('Error saving data to Supabase:', e);
        }

        setCapturedImage(null);
        setLocation(null);
        setNumStems(0);
        setShowStemInputs(false);
        setStemMeasurements([]);
        setSaveCount((prevCount) => prevCount + 1);
      } catch (e) {
        console.log('Error saving data:', e);
      }
    } else {
      alert(
        'Please capture an image, enter stem count, and fill all stem measurements!'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.saveCountText, { color: theme === 'dark' ? 'white' : 'black' }]}>
        Number of saves: {saveCount}
      </Text>
      <TouchableOpacity style={styles.circleButton} onPress={openCamera}>
        <Text style={styles.buttonText}>Add Data</Text>
      </TouchableOpacity>

      {loadingLocation && <ActivityIndicator size="large" />}

      {location && capturedImage && (
        <ScrollView
          style={[
            styles.formContainer,
            { backgroundColor: theme === 'dark' ? '#333' : 'white' },
          ]}
        >
          <Image source={{ uri: capturedImage }} style={styles.image} />

          <View style={styles.formContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme === 'dark' ? 'white' : 'black' }]}>
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
                    <Text style={[styles.label, { color: theme === 'dark' ? 'white' : 'black' }]}>
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
                      onChangeText={(text) => handleStemInputChange(index, text)}
                      placeholder={`Enter measurement for stem ${index + 1}`}
                      placeholderTextColor={theme === 'dark' ? 'gray' : 'lightgray'}
                      keyboardType="numeric"
                    />
                  </View>
                ))}

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme === 'dark' ? 'white' : 'black' }]}>
                    Location:
                  </Text>
                  <Text style={{ color: theme === 'dark' ? 'white' : 'black' }}>
                    {location.latitude}, {location.longitude}
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <Button title="Save Data" onPress={saveDataToStorage} />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    width: '90%',
  },
  formContent: {
    width: '100%',
    paddingBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
    alignSelf: 'center',
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
  saveCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  circleButton: {
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 20,
  },
});