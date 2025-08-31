import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SidebarMenu from './sidebarMenu';

type Notification = {
  notification_id: string;
  notification_title: string;
  notification_body: string;
  created_date: string;
  scope: string;
  target_id: string;
  target_screen: string;
  ava: {
    asset_src: string;
  };
};

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const productImageSrc = 'https://www.huelinh.com/assets/img/product_images/';

export default function HeaderNav({ currentScreen }: { currentScreen: string }) {
  const [isNoti, setIsNoti] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [closeButtonFade] = useState(new Animated.Value(0));
  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNewNoti, setIsNewNoti] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      const id = await SecureStore.getItemAsync('userId');
      const newNoti = await SecureStore.getItemAsync('notification');
      if(newNoti == '1'){
        setIsNewNoti(true);
      }else{
        setIsNewNoti(false);
      }
      setUserId(id || ''); 
    };
    loadAuth();
  }, []);

  const getNoti = async () => {
    const formData = new FormData();
    formData.append('user_id', userId);
    const response = await fetch(`https://huelinh.com/api/get_notifications`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    setNotifications(data);
  };

  const checkNotiNew = async () => {
    const newNoti = await SecureStore.getItemAsync('notification');
    if(newNoti == '1'){
      setIsNewNoti(true);
    }else{
      setIsNewNoti(false);
    }
  };

  useEffect(() => {
    const checkInterval = setInterval(checkNotiNew, 5000);
    
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    getNoti();
  }, [userId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isNoti ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isNoti]);

  useEffect(() => {
    Animated.timing(closeButtonFade, {
      toValue: isOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleNoti = () => {
    if (!isNoti) {
      getNoti();
    }
    setIsNoti(!isNoti);
    if(isOpen){
      setIsOpen(false);
    }
    SecureStore.setItemAsync('notification', '0');
  };

  const handleNotiClick = (notification: Notification) => {
    if(notification.target_screen.includes('/')){
      const screenArray = notification.target_screen.split('/');
      switch (screenArray[0]) {
        case 'detailOrder':
            router.push({
                pathname: "/detailOrder/[id]",
                params: { id: screenArray[1] }
            });
            break;
        case 'detailProduct':
            router.push({
                pathname: "/detailProduct/[id]",
                params: { id: screenArray[1] }
            });
            break;
        default:
            router.push("/dashboard");
    }
    }else{
      switch (notification.target_screen) {
        case 'checkInventory':
            router.push("/checkInventory");
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
          default:
            router.push("/dashboard");
      }
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if(isNoti){
      setIsNoti(false);
    }
  };

  return (
    <View>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={handleOpen}>
          <Feather name="menu" size={26} color="white" style={styles.icon} />
        </TouchableOpacity>
        <Text style={styles.text}>{currentScreen}</Text>
        
        <TouchableOpacity style={styles.notiIconButton} onPress={handleNoti}>
          {isNewNoti ? 
            <View>
              <Ionicons name="notifications" size={26} color="white" style={styles.notiIcon} />
              <View style={styles.notiBadge} />
            </View>
            : 
            <Ionicons name="notifications-outline" size={26} color="white" style={styles.notiIcon} />
          }
        </TouchableOpacity>
        
        <Animated.ScrollView 
          style={[styles.notiItemsContainer, {
            opacity: fadeAnim,
            display: isNoti ? 'flex' : 'none'
          }]}
        >
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <TouchableOpacity key={notification.notification_id} style={styles.notiItem} onPress={() => handleNotiClick(notification)}>
                <View style={[styles.notiBodyContainer, (notification.ava)?{width: '80%'}:{width: '100%'}]}>
                  <Text style={styles.notiTitle}>{notification.notification_title}</Text>
                    <Text style={[styles.notiBody]}>{notification.notification_body}</Text>
                  <Text style={styles.notiDate}>
                    {new Date(notification.created_date).toLocaleDateString()} {new Date(notification.created_date).toLocaleTimeString()}
                  </Text>
                  
                </View>
                {notification.ava ? (
                  <Image source={{ 
                    uri: notification.ava?.asset_src 
                        ? productImageSrc + notification.ava.asset_src 
                        : 'https://www.huelinh.com/assets/img/default-product.jpg'
                }} style={styles.notiAvatar} />
                ) : null}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.notiItem}>
              <Text style={styles.notiBody}>No notifications</Text>
            </View>
          )}
        </Animated.ScrollView>
      </View>

      <SidebarMenu 
        isOpen={isOpen} 
        currentScreen={currentScreen} 
        onClose={handleOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'transparent',
    position: 'relative',
    ...Platform.select({
      ios: {
        paddingTop: 50, // Add extra padding for iOS status bar
      },
      android: {
        paddingTop: 10,
      },
    }),
  },
  text: {
    fontSize: 20,
    fontFamily: 'Roboto_500Medium',
    marginLeft: 10,
    color: 'white',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  icon: {
    width: 28,
    height: 28,
  },
  notiIcon: {
    width: 28,
    height: 28,
  },
  notiItemsContainer: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        top: 85,
      },
      android: {
        top: 45,
      },
    }),
    right: 0,
    width: 350,
    maxHeight: 400,
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10011,

    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgb(222, 224, 228)',
  },
  notiItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(222, 224, 228)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  notiTitle: {
    fontSize: 16,
    fontFamily: 'Roboto_500Medium',
    marginBottom: 4,
  },
  notiBody: {
    fontSize: 14,
    color: 'rgb(108, 117, 125)',
    marginBottom: 4,
  },
  notiDate: {
    fontSize: 12,
    color: 'rgb(108, 117, 125)',
  },
  notiIconButton: {
    marginLeft: 'auto',
  },

  notiBodyContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 5
  },
  notiAvatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  fullText: {
    width: '100%',
  },
  notiBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
  },
});
