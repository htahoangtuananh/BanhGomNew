import { MaterialCommunityIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SidebarMenuProps {
  isOpen: boolean;
  currentScreen: string;
  onClose: () => void;
}

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

type RootStackParamList = {
  dashboard: undefined;
  listProduct: undefined;
  listOrder: undefined;
  listInventory: undefined;
  listCustomer: undefined;
  login: undefined;
  accountDetail: undefined;
  checkInventory: undefined;
  listReport: undefined;
  listCheckin: undefined;
  checkin: undefined;
  personalReport: undefined;
};

export default function SidebarMenu({ isOpen, currentScreen, onClose }: SidebarMenuProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [slideAnim] = useState(new Animated.Value(-screenWidth * 0.6));
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadAuth = async () => {
      const role = await SecureStore.getItemAsync('role');
      const userId = await SecureStore.getItemAsync('userId');
      const userName = await SecureStore.getItemAsync('userName');
      setRole(role || '');
      setUserId(userId || '');
      setUserName(userName || '');
    };
    loadAuth();
  }, []);
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -screenWidth * 0.6,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  return (
    <Animated.View 
      style={[
        styles.fullScreenSidebar,
        {
          opacity: slideAnim.interpolate({
            inputRange: [-screenWidth * 0.6, 0],
            outputRange: [0, 1]
          }),
          display: isOpen ? 'flex' : 'none'
        }
      ]}
    >
      {/* Backdrop overlay to close sidebar when tapped */}
      <TouchableOpacity 
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <LinearGradient
        colors={['#2c3e50', '#34495e', '#1a252f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fullScreenContainer}
      >
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuScrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.userProfileSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#3498db', '#2980b9']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </View>
                         <View style={styles.userInfoSection}>
               <Text style={styles.welcomeText}>Chào mừng trở lại!</Text>
               <Text style={styles.userNameLarge}>{userName}</Text>
             </View>
          </View>
                     <View style={styles.menuSection}>
             <Text style={styles.sectionTitle}>Quản lý cửa hàng</Text>
                        <View style={styles.menuGrid}>
              <TouchableOpacity onPress={() => {navigation.navigate('dashboard')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Bảng điều khiển" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <AntDesign name="dashboard" size={32} color="white" />
                   <Text style={styles.cardTitle}>Tổng quan & Thống kê</Text>
                </LinearGradient>
              </TouchableOpacity>
                    <TouchableOpacity onPress={() => {navigation.navigate('listProduct')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Quản lý sản phẩm" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                   <AntDesign name="shoppingcart" size={32} color="white" />
                   <Text style={styles.cardTitle}>Quản lý sản phẩm</Text>
                </LinearGradient>
              </TouchableOpacity>
                    <TouchableOpacity onPress={() => {navigation.navigate('listInventory')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Quản lý xuất nhập kho" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <Feather name="box" size={32} color="white" />
                   <Text style={styles.cardTitle}>Kho hàng</Text>
                   <Text style={styles.cardSubtitle}>Nhập & Xuất kho</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {navigation.navigate('checkInventory')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Kiểm kho" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <Feather name="check-square" size={32} color="white" />
                   <Text style={styles.cardTitle}>Kiểm kho</Text>
                   <Text style={styles.cardSubtitle}>Kiểm tra tồn kho</Text>
                </LinearGradient>
              </TouchableOpacity>
                    <TouchableOpacity onPress={() => {navigation.navigate('listCustomer')}} style={styles.menuCard}>
                <LinearGradient
                  colors={(currentScreen == "Quản lý khách hàng" || currentScreen == "Chi tiết khách hàng") ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <Feather name="users" size={32} color="white" />
                   <Text style={styles.cardTitle}>Khách hàng</Text>
                   <Text style={styles.cardSubtitle}>Quản lý khách hàng</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {navigation.navigate('listOrder')}} style={styles.menuCard}>
                <LinearGradient
                  colors={(currentScreen == "Quản lý đơn hàng" || currentScreen == "Tạo đơn hàng" || currentScreen == "Chi tiết đơn hàng") ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <AntDesign name="tago" size={32} color="white" />
                   <Text style={styles.cardTitle}>Đơn hàng</Text>
                   <Text style={styles.cardSubtitle}>Quản lý bán hàng</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
                                 {role == 'admin' && (
                          <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Công cụ quản trị</Text>
               <View style={styles.menuGrid}>
                 <TouchableOpacity onPress={() => {navigation.navigate('listReport')}} style={styles.menuCard}>
                   <LinearGradient
                     colors={(currentScreen == "Báo cáo, thống kê" || currentScreen == "Tạo báo cáo, thống kê" || currentScreen == "Chi tiết báo cáo") ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                     style={styles.cardGradient}
                   >
                                          <MaterialCommunityIcons name="clipboard-edit-outline" size={32} color="white" />
                      <Text style={styles.cardTitle}>Báo cáo</Text>
                      <Text style={styles.cardSubtitle}>Thống kê & Phân tích</Text>
                   </LinearGradient>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => {navigation.navigate('personalReport')}} style={styles.menuCard}>
                   <LinearGradient
                     colors={currentScreen == "Báo cáo cá nhân" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                     style={styles.cardGradient}
                   >
                                          <MaterialCommunityIcons name="clipboard-edit-outline" size={32} color="white" />
                      <Text style={styles.cardTitle}>Báo cáo cá nhân</Text>
                      <Text style={styles.cardSubtitle}>Thống kê cá nhân</Text>
                   </LinearGradient>
                 </TouchableOpacity>
               </View>
             </View>
           )}

                     <View style={styles.menuSection}>
             <Text style={styles.sectionTitle}>Cá nhân</Text>
                        <View style={styles.menuGrid}>
              <TouchableOpacity onPress={() => {navigation.navigate('accountDetail')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Cài đặt tài khoản" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <AntDesign name="user" size={32} color="white" />
                   <Text style={styles.cardTitle}>Tài khoản</Text>
                   <Text style={styles.cardSubtitle}>Cài đặt & Hồ sơ</Text>
                </LinearGradient>
              </TouchableOpacity>

              {role !== 'admin' && (
                <TouchableOpacity onPress={() => {navigation.navigate('personalReport')}} style={styles.menuCard}>
                  <LinearGradient
                    colors={currentScreen == "Báo cáo cá nhân" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.cardGradient}
                  >
                                     <MaterialCommunityIcons name="clipboard-edit-outline" size={32} color="white" />
                     <Text style={styles.cardTitle}>Báo cáo cá nhân</Text>
                     <Text style={styles.cardSubtitle}>Thống kê cá nhân</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => {navigation.navigate('checkin')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Chấm công" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <Feather name="user-check" size={32} color="white" />
                   <Text style={styles.cardTitle}>Chấm công</Text>
                   <Text style={styles.cardSubtitle}>Điểm danh</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {navigation.navigate('listCheckin')}} style={styles.menuCard}>
                <LinearGradient
                  colors={currentScreen == "Thông tin chấm công" ? ['#3498db', '#2980b9'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.cardGradient}
                >
                                     <MaterialCommunityIcons name="calendar-check" size={32} color="white" />
                   <Text style={styles.cardTitle}>Thông tin chấm công</Text>
                   <Text style={styles.cardSubtitle}>Xem bản ghi</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.logoutSection}>
            <TouchableOpacity onPress={async() => {
              await SecureStore.deleteItemAsync('token');
              await SecureStore.deleteItemAsync('userId');
              navigation.navigate('login')
            }} style={styles.logoutCard}>
              <LinearGradient
                colors={['#ff6b6b', '#ee5a52']}
                style={styles.logoutGradient}
              >
                                 <AntDesign name="logout" size={32} color="white" />
                 <Text style={styles.logoutTitle}>Đăng xuất</Text>
                 <Text style={styles.logoutSubtitle}>Thoát ứng dụng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreenSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
    zIndex: 10010,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10005,
  },
  fullScreenContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    zIndex: 10006,
  },
  headerSection: {
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
    }),
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  userInfoSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userNameLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuScrollContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  menuSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    width: (screenWidth - 72) / 2,
    marginBottom: 16,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  logoutSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoutCard: {
    width: '100%',
  },
  logoutGradient: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoutSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
});
