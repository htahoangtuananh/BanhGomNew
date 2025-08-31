import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Alert the user before reloading
      Alert.alert(
        'Update Available',
        'A new version is available. The app will now update.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await Updates.reloadAsync();
            }
          }
        ]
      );
      return true;
    }
    return false;
  } catch (error) {
    // Don't show error to user, just log it
    console.log('Error checking for updates:', error);
    return false;
  }
} 