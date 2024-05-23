import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Appearance,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { useImage } from './context/ImageContext';
import { useFocusEffect } from '@react-navigation/native';
import SyncIcon from '../components/custom/SyncIcon';

export default function HomePage() {
  const [saveCount, setSaveCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { setImageUri } = useImage(); // Get the setImageUri function

  // Theme management
  const [theme, setTheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
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
    }, [])
  );

  const openCamera = async () => {
    setLoading(true)
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync();
    if (!cameraResult.canceled) {
      setImageUri(cameraResult.assets[0].uri); 
      navigation.navigate('preview'); // Navigate to Preview 
    }
    setLoading(false)
  };

  return (
    <View style={styles.container}>
      {loading &&  <ActivityIndicator size="large" />}

      <Text style={[styles.saveCountText, { color: theme === 'dark' ? 'white' : 'black' }]}>
        Number of offline saves: {saveCount}
      </Text>
      <SyncIcon />
      <TouchableOpacity style={styles.circleButton} onPress={openCamera}>
        <Text style={styles.buttonText}>Add Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  circleButton: {
    backgroundColor: '#007bff',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
});
