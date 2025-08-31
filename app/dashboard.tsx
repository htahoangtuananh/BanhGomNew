import FlowiseChat from '@/app/components/FlowiseChat';
import HeaderNav from '@/app/components/headerNav';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import DropDownPicker from 'react-native-dropdown-picker';
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [dashboardData, setDashboardData] = useState([]);
  const [attendanceRatio, setAttendanceRatio] = useState('0/0');
  const [orderData, setOrderData] = useState([]);
  const [countOrder, setCountOrder] = useState(0);
  const [countProduct, setCountProduct] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('0');
  const [personalRevenue, setPersonalRevenue] = useState(0);
  const [personalCountOrder, setPersonalCountOrder] = useState(0);
  const [store, setStore] = useState('');
  const [storeOpen, setStoreOpen] = useState(false);
  const [role, setRole] = useState('');
  const [storeList, setStoreList] = useState([
    { label: 'Hà Nội', value: '0' },
    { label: 'Hồ Chí Minh', value: '1' },
  ]);
  const [shiftStats, setShiftStats] = useState({
    morningCount: 0,
    afternoonCount: 0,
    totalPresent: 0,
    totalEmployees: 0
  });
  const [topPerformer, setTopPerformer] = useState({ name: '', sales: 0 });
  const [monthOpen, setMonthOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        data: [] as number[],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ["Doanh thu (Triệu)"]
  });
  const [isLoading, setIsLoading] = useState(false);
  const handleMonthChange = (value: string) => {
    const today = new Date();
    setCurrentMonth(value);
    setCurrentMonthYear(today.getFullYear().toString() + '-' + value.toString());
    getDashboardData(token, userId, store, today.getFullYear().toString() + '-' + value.toString());
  }

  const calculateAttendance = (checkinData: any[]) => {
    // Get current date and start of month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate total days from start of month to today
    const totalDays = today.getDate(); // This gives us the current day of the month
    const checkedDays = checkinData.length; // Number of days with check-ins

    return `${checkedDays}/${totalDays}`;
  };

  const calculatePersonalRevenue = (orders: any[], userId: string) => {
    if (!orders || orders.length === 0) return 0;
    let orderCount = 0;
    const filteredOrders = orders.filter(order => {
      if (order.seller === userId && order.status == 1) {
        orderCount++;
        return true;
      }
      return false;
    });
    setPersonalCountOrder(orderCount);
    const total = orders
      .filter(order => order.seller === userId && order.status == 1)
      .reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    
    return total / 1000000; // Convert to millions
  };

  const handleStoreChange = (value: string) => {
    setStore(value);
    getDashboardData(token, userId, value, currentMonthYear);
  };

  const analyzeShifts = (userCheckins: any[]) => {
    const morningShift = [];
    const afternoonShift = [];
    const MORNING_CUTOFF = '10:00'; // 10 AM cutoff

    userCheckins.forEach(userData => {
      // Check if user has check-in data for today
      if (userData.checkin && userData.checkin[0]) {
        const firstCheckin = userData.checkin[0].first_checkin;
        
        // Compare check-in time with morning cutoff
        if (firstCheckin < MORNING_CUTOFF) {
          morningShift.push(userData);
        } else {
          afternoonShift.push(userData);
        }
      }
    });

    return {
      morningCount: morningShift.length,
      afternoonCount: afternoonShift.length,
      totalPresent: morningShift.length + afternoonShift.length,
      totalEmployees: userCheckins.length
    };
  };

  const calculateAverageSales = (orders: any[], totalEmployees: number) => {
    if (!orders || orders.length === 0 || totalEmployees === 0) return 0;
    const totalSales = orders
      .filter(order => order.status === 1)
      .reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    return (totalSales / totalEmployees) / 1000000; // Convert to millions
  };

  const findTopPerformer = (orders: any[]) => {
    if (!orders || orders.length === 0) return { name: '', sales: 0 };
    
    // Group sales by seller and only count completed orders (status === 1)
    const salesBySeller = orders
      .filter(order => order.status == 1)
      .reduce((acc, order) => {
        const sellerName = order.fullname || 'Unknown';
        const orderTotal = parseInt(order.total_price) || 0;
        
        if (!acc[sellerName]) {
          acc[sellerName] = {
            totalSales: 0,
            orderCount: 0
          };
        }
        
        acc[sellerName].totalSales += orderTotal;
        acc[sellerName].orderCount += 1;
        return acc;
      }, {});
    // Find seller with highest sales
    const topSeller = Object.entries(salesBySeller)
      .reduce((top, [name, data]: [string, any]) => 
        data.totalSales > top.sales ? { name, sales: data.totalSales, orderCount: data.orderCount } : top
      , { name: '', sales: 0, orderCount: 0 });

    return { 
      name: `${topSeller.name}`, 
      sales: Math.round(topSeller.sales / 1000000) // Convert to millions
    };
  };

  const findOldestPendingOrder = (orders: any[]) => {
    if (!orders || orders.length === 0) return { id: '', date: '', days: 0 };

    const pendingOrders = orders.filter(order => order.status === 0);
    if (pendingOrders.length === 0) return { id: '', date: '', days: 0 };

    const oldest = pendingOrders.reduce((oldest, current) => {
      return new Date(current.created_date) < new Date(oldest.created_date) ? current : oldest;
    });

    const days = Math.floor((new Date().getTime() - new Date(oldest.created_date).getTime()) / (1000 * 3600 * 24));
    
    return {
      id: oldest.id,
      date: oldest.created_date,
      days: days
    };
  };

  const getDashboardData = async (token: string, id: string, store: string, month: string) => {
    setIsLoading(true);
    const params = new FormData();
    params.append('user_id', id);
    params.append('token', token);
    params.append('store', store);
    try {
      const response = await fetch(`https://huelinh.com/api/get_dashboard?month=${month}`, {
        method: 'POST',
        body: params,
      });

      const data = await response.json();
      setIsLoading(false);
      const shiftData = analyzeShifts(data.data.list_user_checkin);
      setShiftStats(shiftData);
      setDashboardData(data);
      setOrderData(data.data.orders);
      if(data.data.orders){
        let totalRevenue = 0;
        totalRevenue = data.data.orders.reduce((sum: number, order: any) => order.status === '1' ? sum + parseFloat(order.total_price) : sum, 0);
        const totalRevenueString = Math.round(totalRevenue/1000000);
        setTotalRevenue(totalRevenueString.toString());
      }
      setCountOrder(data.data.orders.length);
      setCountProduct(data.data.products);
      const attendanceRatio = calculateAttendance(data.data.checkin);
      setAttendanceRatio(attendanceRatio);
      setPersonalRevenue(calculatePersonalRevenue(data.data.personal, id));
      setTopPerformer(findTopPerformer(data.data.orders));

      // Update chart data
      const weeklyData = organizeOrdersByWeek(data.data.orders, month);
      setChartData({
        labels: getWeekLabels(month),
        datasets: [
          {
            data: weeklyData,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Doanh thu (Triệu)"]
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching dashboard data:', error);
    }
  };

  const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    },
    propsForLabels: {
      fontSize: 12,
    },
    renderDotContent: ({ x, y, indexData }: { x: number, y: number, indexData: number }) => {
      return (
        <View 
          key={`decorator-${x}`}
          style={{
            position: 'absolute',
            left: x - 15,
            top: y - 22,
            width: 30,
            alignItems: 'center'
          }}>
          <Text style={{ color: '#134e4a', fontSize: 10, fontWeight: 'bold' }}>
            {indexData.toFixed(1)}
          </Text>
        </View>
      );
    }
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7);
  };

  const organizeOrdersByWeek = (orders: any[], selectedMonth: string) => {
    if (!orders || orders.length === 0) return Array(5).fill(0); // Default to 5 weeks

    // Parse selected month and year
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const totalWeeks = Math.ceil((lastDay + (new Date(year, month - 1, 1).getDay())) / 7);
    
    const weeklyData = Array(totalWeeks).fill(0);
    
    orders.forEach(order => {
      if (order.status == 1) {
        const orderDate = new Date(order.created_date);
        // Only process orders from the selected month
        if (orderDate.getMonth() + 1 === month && orderDate.getFullYear() === year) {
          const weekNum = Math.ceil((orderDate.getDate() + (new Date(year, month - 1, 1).getDay())) / 7) - 1;
          const revenue = parseFloat(order.total_price);
          
          if (weekNum >= 0 && weekNum < weeklyData.length) {
            weeklyData[weekNum] += revenue;
          }
        }
      }
    });

    return weeklyData.map(amount => amount / 1000000);
  };

  const getWeekLabels = (selectedMonth: string) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const totalWeeks = Math.ceil((lastDay + (new Date(year, month - 1, 1).getDay())) / 7);
    return Array.from({length: totalWeeks}, (_, i) => `Tuần ${i + 1}`);
  };

  const renderWeeklyDetails = () => {
    if (!chartData.datasets[0].data || chartData.datasets[0].data.length === 0) {
      return <Text style={styles.noDataText}>Không có dữ liệu</Text>;
    }
    
    return (
      <View style={styles.weeklyDetailsContainer}>
        <Text style={styles.weeklyDetailsTitle}>Chi tiết doanh thu theo tuần:</Text>
        {chartData.datasets[0].data.map((value: number, index: number) => (
          <View key={index} style={styles.weeklyDetailRow}>
            <Text style={styles.weekName}>Tuần {index + 1}:</Text>
            <Text style={styles.weekValue}>{value.toFixed(1)} triệu đồng</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng doanh thu:</Text>
          <Text style={styles.totalValue}>
            {chartData.datasets[0].data.reduce((sum, value) => sum + value, 0).toFixed(1)} triệu đồng
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    const loadAuth = async () => {
      const token = await SecureStore.getItemAsync('loginToken');
      const id = await SecureStore.getItemAsync('userId');
      const userName = await SecureStore.getItemAsync('userName');
      const role = await SecureStore.getItemAsync('role');
      const store = await SecureStore.getItemAsync('store');
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      setCurrentMonth(currentMonth.toString());
      setCurrentMonthYear(today.getFullYear().toString() + '-' + currentMonth.toString());
      setToken(token || '');
      setUserId(id || '');
      setUserName(userName || '');
      setRole(role || '');
      setStore(store || '');
      if (token && id && store) {
        getDashboardData(token, id, store, today.getFullYear().toString() + '-' + currentMonth.toString());
      }
    };
    loadAuth();
  }, []);
  
  const LoadingOverlay = ({ message }: { message: string }) => (
    <View style={styles.loadingOverlay}>

      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );

  return (
    <>
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        <HeaderNav currentScreen="Bảng điều khiển"/>
        {role == 'admin' && (
            <View style={styles.storePickerContainer}>
                {isLoading && (
                  <LoadingOverlay message="Đang tải dữ liệu..." />
                )}
                <View style={styles.dropdownWrapper}>
                  <DropDownPicker
                      open={storeOpen}
                      value={store}
                      items={storeList}
                      setOpen={setStoreOpen}
                      setValue={(callback: any) => handleStoreChange(callback(store))}
                      setItems={setStoreList}
                      placeholder="Chọn cửa hàng"
                      style={styles.dropdownStyle}
                      dropDownContainerStyle={styles.dropdownContainer}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                          nestedScrollEnabled: true,
                      }}
                  />
                </View>
            </View>
        )}
        <View style={styles.dashboardContentTitle}>
          <Text style={styles.dashboardContentTitleText}>Cửa hàng</Text>
          <View style={styles.monthPickerContainer}>
            <View style={styles.dropdownWrapper}>
              <DropDownPicker
                open={monthOpen}
                value={currentMonth}
                items={[
                  { label: 'Tháng 1', value: '1' },
                  { label: 'Tháng 2', value: '2' },
                  { label: 'Tháng 3', value: '3' },
                  { label: 'Tháng 4', value: '4' },
                  { label: 'Tháng 5', value: '5' },
                  { label: 'Tháng 6', value: '6' },
                  { label: 'Tháng 7', value: '7' },
                  { label: 'Tháng 8', value: '8' },
                  { label: 'Tháng 9', value: '9' },
                  { label: 'Tháng 10', value: '10' },
                  { label: 'Tháng 11', value: '11' },
                  { label: 'Tháng 12', value: '12' }
                ]}
                setOpen={setMonthOpen}
                setValue={(callback: any) => handleMonthChange(callback(currentMonth))}
                placeholder="Chọn tháng"
                style={styles.dropdownStyle}
                dropDownContainerStyle={styles.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
              />
            </View>
          </View>
        </View>
        <View style={styles.dashboardContent}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dashboardContentBlock}
            >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25}]}>{countOrder}</Text>
                <Text style={styles.dashboardContentBlockText}>Đơn hàng mới</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dashboardContentBlock}
            >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25}]}>{countProduct}</Text>
                <Text style={styles.dashboardContentBlockText}>Sản phảm mới</Text>
            </LinearGradient>
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Doanh thu theo tuần (Triệu đồng)</Text>
                <LineChart
                  data={chartData}
                  width={screenWidth-80}
                  height={220}
                  chartConfig={chartConfig}
                  bezier={true}
                  style={{
                    marginVertical: 8,
                    borderRadius: 20,
                    alignSelf: 'center',
                  }}
                />
                {renderWeeklyDetails()}
            </View>
        </View>
        {role != 'admin' ? (
          <>
            <Text style={styles.dashboardContentTitleText}>Cá nhân</Text>
            <View style={styles.dashboardContent}>
              <LinearGradient
                colors={['#ffecd2', '#fcb69f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                  <Text style={[styles.dashboardContentBlockText, {fontSize: 16, color: '#8b4513'}]}>{personalCountOrder} đơn</Text>
                  <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#8b4513'}]}>{parseFloat(personalRevenue.toString()).toLocaleString('de-DE')}</Text>
                  <Text style={[styles.dashboardContentBlockText, {color: '#8b4513'}]}>Doanh thu (Triệu)</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#ff9a9e', '#fecfef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                  <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#8b1538'}]}>{attendanceRatio}</Text>
                  <Text style={[styles.dashboardContentBlockText, {color: '#8b1538'}]}>Chấm công</Text>
              </LinearGradient>
            </View>
            <View style={styles.dashboardContent}>
              <LinearGradient
                colors={['#a8edea', '#fed6e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#2c5282'}]}>{shiftStats.morningCount}</Text>
                <Text style={[styles.dashboardContentBlockText, {color: '#2c5282'}]}>Ca sáng</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#ffecd2', '#fcb69f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#8b4513'}]}>{shiftStats.afternoonCount}</Text>
                <Text style={[styles.dashboardContentBlockText, {color: '#8b4513'}]}>Ca chiều</Text>
              </LinearGradient>
            </View>
          </>
        ):(
          <>
            <Text style={styles.dashboardContentTitleText}>Hiệu suất</Text>
            <View style={styles.dashboardContent}>
              <LinearGradient
                colors={['#ffecd2', '#fcb69f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#8b4513'}]}>
                  {totalRevenue ? parseFloat(totalRevenue).toLocaleString('de-DE'): '---'}
                </Text>
                <Text style={[styles.dashboardContentBlockText, {color: '#8b4513'}]}>Doanh thu(Triệu)</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#ff9a9e', '#fecfef']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dashboardContentBlock}
              >
                <Text style={[styles.dashboardContentBlockText, {fontSize: 16, color: '#8b1538'}]}>
                  {topPerformer.name || 'Chưa có dữ liệu'}
                </Text>
                <Text style={[styles.dashboardContentBlockText, {fontSize: 25, color: '#8b1538'}]}>
                  {topPerformer.sales > 0 ? parseFloat(topPerformer.sales.toString()).toLocaleString('de-DE'): '---'}
                </Text>
                <Text style={[styles.dashboardContentBlockText, {color: '#8b1538'}]}>NV xuất sắc (Triệu)</Text>
              </LinearGradient>
            </View>
          </>
                )}
      </ScrollView>
    </LinearGradient>
    
    {/* Fixed Chat Bubble - Outside ScrollView */}
    <FlowiseChat
      position="bottom-right"
      bubbleColor="#3B81F6"
      bubbleSize={60}
      title="Trợ lý AI"
    />
  </>  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    width: 24,
    height: 24,
  },
  dashboardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  dashboardContentBlock: {
    padding: 24,
    borderRadius: 20,
    flex: 1,
    minHeight: 140,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dashboardContentBlockText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dashboardContentTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  storePickerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 2000,
  },
  dropdownWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownStyle: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 12,
    minHeight: 50,
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  monthPickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 200,
    zIndex: 1000,
  },
  dashboardContentTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  chartContainer: {
    width: '100%',
    marginVertical: 15,
    marginHorizontal: 0,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  chartTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#374151',
  },
  weeklyDetailsContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  weeklyDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#374151',
  },
  weeklyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  weekName: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  weekValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 20,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    height: screenHeight,
  },
});
