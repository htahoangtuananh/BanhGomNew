import { useColorScheme } from '@/hooks/useColorScheme';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { checkForUpdates } from './utils/updateUtils';

// Make checkForUpdates available globally
declare global {
  var checkForUpdates: () => Promise<boolean>;
}
global.checkForUpdates = checkForUpdates;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

type NotificationData = {
  screen?: string;
  [key: string]: any;
};

type PushNotification = {
  data: NotificationData;
  // Add other notification properties as needed
};

export default function RootLayout() {
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    'Bakbak-One': require('../assets/fonts/Bakbak-One.ttf'),
  });

  useEffect(() => {
    // Check for updates when app starts
    checkForUpdates();
  }, []);

  useEffect(() => {
    SecureStore.setItemAsync('TENCENT_SECRET_ID', 'IKIDmOq56xb4KMDtMbhbKqBLK6f2EKD5lHZe');
    SecureStore.setItemAsync('TENCENT_SECRET_KEY', 'xhHenlZAYlneIiw0rVwCHBsNiqkQwHOI');
    registerForPushNotificationsAsync();

    // Handle initial notification more gracefully
    let isHandlingInitialNotification = false;
    
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (response && !isHandlingInitialNotification) {
          isHandlingInitialNotification = true;
          const { data } = response.notification.request.content;
          
          // Use setTimeout to delay navigation until after the app is fully loaded
          setTimeout(() => {
            handleNotificationNavigation(data);
            isHandlingInitialNotification = false;
          }, 1000);
        }
      })
      .catch(error => {
        console.log('Error handling initial notification:', error);
        isHandlingInitialNotification = false;
      });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      SecureStore.setItemAsync('notification', '1');
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      
      // Use setTimeout to delay navigation until after the app is fully loaded
      setTimeout(() => {
        handleNotificationNavigation(data);
      }, 500);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack 
        initialRouteName="login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' },
          headerStyle: {
            backgroundColor: 'white',
          },
        }}
      >
        <Stack.Screen name="login"/>
        <Stack.Screen name="dashboard"/>
        <Stack.Screen name="listProduct"/>
        <Stack.Screen name="listInventory"/>
        <Stack.Screen name="listCustomer"/>
        <Stack.Screen name="detailProduct/[id]" />
        <Stack.Screen name="addProduct"/>
        <Stack.Screen name="addInventoryImport"/>
        <Stack.Screen name="addInventoryExport"/>
        <Stack.Screen name="listOrder"/>
        <Stack.Screen name="accountDetail"/>
        <Stack.Screen name="detailOrder/[id]"/>
        <Stack.Screen name="checkInventory"/>
        <Stack.Screen name="detailCustomer/[id]"/>
        <Stack.Screen name="listReport"/>
        <Stack.Screen name="detailReport/[id]"/>
        <Stack.Screen name="listCheckin"/>
        <Stack.Screen name="checkin"/>
        <Stack.Screen name="personalReport"/>
        <Stack.Screen name="+not-found"/>
      </Stack>
    </ThemeProvider>
  );
}

async function registerForPushNotificationsAsync() {
  // Set up Android channel if needed
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  // Check if we have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  // If no permission, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }
}

// Add this helper function outside the component
function handleNotificationNavigation(data: NotificationData) {
  try {
    // Add a small delay to ensure the app is fully loaded
    if (data.screen) {
      switch (data.screen) {
        case 'detailOrder':
          router.push({
            pathname: "/detailOrder/[id]",
            params: { id: data.id }
          });
          break;
        case 'detailProduct':
          router.push({
            pathname: "/detailProduct/[id]",
            params: { id: data.id }
          });
          break;
        case 'detailCustomer':
          router.push({
            pathname: "/detailCustomer/[id]",
            params: { id: data.id }
          });
          break;
        case 'detailReport':
          router.push({
            pathname: "/detailReport/[id]",
            params: { id: data.id }
          });
          break;
        default:
          router.push("/dashboard");
      }
    } else {
      switch (data.target_screen) {
        case 'checkInventory':
          router.push("/checkInventory");
          break;
        case 'listReport':
          router.push("/listReport");
          break;
        case 'accountDetail':
          router.push("/accountDetail");
          break;
        case 'listOrder':
          router.push("/listOrder");
          break;
        case 'listProduct':
          router.push("/listProduct");
          break;
        case 'listInventory':
          router.push("/listInventory");
          break;
        case 'listCheckin':
          router.push("/listCheckin");
          break;
        default:
          router.push("/dashboard");
      }
    }
  } catch (error) {
    console.log('Error navigating from notification:', error);
    // Fallback to dashboard if navigation fails
    router.push("/dashboard");
  }
}
