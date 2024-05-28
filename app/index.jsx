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
import syncData from '../components/custom/SyncIcon';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

export default function HomePage() {
  const [saveCount, setSaveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
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

  useEffect(() => {
    const checkDeviceId = async () => {
      try {
        const deviceId = await AsyncStorage.getItem('device_id');
        if (!deviceId) {
          navigation.navigate('id');
        }
      } catch (e) {
        console.log('Error checking device ID:', e);
      }
    };
    checkDeviceId();
  }, [navigation]);

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

  useFocusEffect(
    useCallback(() => {
      const fetchTotalCount = async () => {
        try {
          // Check network connectivity
          const isConnected = await NetInfo.fetch().then(state => state.isConnected);

          if (isConnected) {
            // Get the device_id from AsyncStorage
            const deviceId = await AsyncStorage.getItem('device_id');

            // Query the total count from the database
            const { data, error } = await supabase
              .from('stems')
              .select('*', { count: 'exact' })
              .eq('device_id', deviceId)
              .gte('date', 'today')
              .lt('date', 'tomorrow');

            if (error) {
              console.log('Error fetching total count:', error);
            } else {
              setTotalCount(data.length);
              // Save the total count to AsyncStorage
              await AsyncStorage.setItem('total_count', data.length.toString());
            }
          } else {
            // Get the total count from AsyncStorage
            const storedTotalCount = await AsyncStorage.getItem('total_count');
            if (storedTotalCount) {
              setTotalCount(parseInt(storedTotalCount, 10));
            }
          }
        } catch (e) {
          console.log('Error fetching total count:', e);
        }
      };

      fetchTotalCount();
      syncData(); // Call the syncData function
    }, [])
  );

  const openCamera = async () => {
    setLoading(true);
    navigation.navigate('camera'); 
    setLoading(false);
  };

  const resetDeviceId = async () => {
    try {
      await AsyncStorage.removeItem('device_id');
      navigation.navigate('id');
    } catch (e) {
      console.log('Error resetting device ID:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.countText, { color: theme === 'dark' ? 'white' : 'black' }]}>
            Total: {totalCount}
          </Text>
          <Text style={[styles.countText, { color: theme === 'dark' ? 'white' : 'black' }]}>
            Pending: {saveCount}
          </Text>
        </View>
        <TouchableOpacity style={styles.circleButton} onPress={resetDeviceId}>
          <Text style={styles.buttonText}>Reset ID</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}
      <TouchableOpacity style={styles.circleButton} onPress={openCamera}>
        <Text style={styles.buttonText}>Add Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // This centers vertically within the available space
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    position: 'absolute', // Take the header out of the normal layout flow
    top: 20, // Adjust this value for the desired margin from the top
    left: 0, 
  },
  countText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetText: {
    fontSize: 16,
  },
  circleButton: {
    margin: 12,
    height: 50,
    width: 120,
    borderRadius: 10,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: {
    fontSize: 16,
    color: 'rgb(161, 161, 161)',
  },
  loader: {
    position: 'absolute', 
    top: '50%',
    left: '50%',
    marginLeft: -20, // Adjust for indicator size
    marginTop: -20, // Adjust for indicator size
  },
});