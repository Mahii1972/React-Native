import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { Camera, CameraType } from 'expo-camera';

export default function HomePage() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [numStems, setNumStems] = useState(0);
  const [showStemInputs, setShowStemInputs] = useState(false);
  const [stemMeasurements, setStemMeasurements] = useState([]);
  const navigation = useNavigation();
  

  useEffect(() => {
    const fetchSaveCount = async () => {
      try {
        const existingDataString = await AsyncStorage.getItem('capturedData');
        const existingData = existingDataString ? JSON.parse(existingDataString) : [];
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
      setNumStems(0); // Reset if not a number
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

        setCapturedImage(null);
        setLocation(null);
        setNumStems(0);
        setShowStemInputs(false);
        setStemMeasurements([]);
        setSaveCount((prevCount) => prevCount + 1);
        navigation.navigate('explore');
      } catch (e) {
        console.log('Error saving data:', e);
      }
    } else {
      alert('Please capture an image, enter stem count, and fill all stem measurements!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.saveCountText}>Number of saves: {saveCount}</Text>
      <Button title="Add Data" onPress={openCamera} />

      {loadingLocation && <ActivityIndicator size="large" />}

      {location && capturedImage && (
        <ScrollView style={styles.formContainer}>
          <Image source={{ uri: capturedImage }} style={styles.image} />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>No of stems:</Text>
            <TextInput
              style={styles.input}
              value={numStems.toString()}
              onChangeText={handleNumStemsChange}
              placeholder="Enter number of stems"
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
                  <Text style={styles.label}>Stem {index + 1}:</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={(text) => handleStemInputChange(index, text)}
                    placeholder={`Enter measurement for stem ${index + 1}`}
                    keyboardType="numeric"
                  />
                </View>
              ))}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Location:</Text>
                <Text>{location.latitude}, {location.longitude}</Text>
              </View>

              <Button title="Save Data" onPress={saveDataToStorage} />
            </>
          )}
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
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
  saveCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'white',
  },
});