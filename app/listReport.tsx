import HeaderNav from '@/app/components/headerNav';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DropDownPicker from 'react-native-dropdown-picker';
const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;

interface Report {
    title: string;
    store_id?: string;
    time?: string;
}


interface Statistic {
    total_report: number;
    total_report_today: number;
    total_report_week: number;
    total_report_month: number;
}

interface CheckinData {
    checkin_date: string;
    first_checkin: string;
    last_checkin: string;
}

interface UserData {
    checkin: CheckinData[];
    fullname: string;
}

// Add these helper functions before the main component
const determineShift = (firstCheckin: string): 'morning' | 'afternoon' => {
    const checkinTime = new Date(`2000-01-01T${firstCheckin}`);
    const morningCutoff = new Date(`2000-01-01T10:00:00`);
    return checkinTime < morningCutoff ? 'morning' : 'afternoon';
};

const isLate = (firstCheckin: string, shift: 'morning' | 'afternoon'): boolean => {
    const checkinTime = new Date(`2000-01-01T${firstCheckin}`);
    const morningLateTime = new Date(`2000-01-01T08:40:00`);
    const afternoonLateTime = new Date(`2000-01-01T11:10:00`);
    
    return shift === 'morning' 
        ? checkinTime > morningLateTime 
        : checkinTime > afternoonLateTime;
};

export default function ListReportScreen() {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const [reports, setReports] = useState<Report[]>([]);
    const [search, setSearch] = useState('');
    const [openStatus, setOpenStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('-1');
    const [selectedType, setselectedType] = useState('statistic');
    const [selectedDate, setSelectedDate] = useState(today);
    const [statistic, setStatistic] = useState<Statistic[]>([]);
    const [loginToken, setLoginToken] = useState('');
    const [userId, setUserId] = useState('');
    const [totalOrder, setTotalOrder] = useState(0);
    const [countSuccessOrder, setCountSuccessOrder] = useState(0);
    const [countCancelOrder, setCountCancelOrder] = useState(0);
    const [countPendingOrder, setCountPendingOrder] = useState(0);
    const [totalPrice, setTotalPrice] = useState('0');
    const [totalProduct, setTotalProduct] = useState(0);
    const [totalProductInStock, setTotalProductInStock] = useState(0);
    const [totalProductInFloat, setTotalProductInFloat] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Đang tải dữ liệu...');
    const [error, setError] = useState('');
    const [store, setStore] = useState('0');
    const [storeOpen, setStoreOpen] = useState(false);
    const [role, setRole] = useState('');
    const [storeList, setStoreList] = useState([
        { label: 'Hà Nội', value: '0' },
        { label: 'Hồ Chí Minh', value: '1' },
    ]);

    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [userList, setUserList] = useState<any[]>([]);

    const getReportList = async (store: string) => {
        const response = await fetch('https://huelinh.com/api/get_list_report/'+store);
        const data = await response.json();
        
        const processedData = data.map((report: string) => {
            // Remove "report-" prefix first
            const cleanReport = report.replace('report-', '');
            const parts = cleanReport.split('-');
            if (parts.length >= 3) {
                const storeId = parts[0];      // "0"
                const month = parts[1];        // "02"
                const yearWithExt = parts[2];  // "2025.json"
                const year = yearWithExt.split('.')[0];  // "2025"
                
                return {
                    title: `Báo cáo tháng ${month}-${year}`,
                    store_id: storeId,
                    time: `${month}-${year}`,
                };
            }
            return null;
        }).filter((report: Report | null) => report && report.store_id === store);
        setReports(processedData);
    }

    useEffect(() => {
        const getToken = async () => {
            const token = await SecureStore.getItemAsync('loginToken');
            const id = await SecureStore.getItemAsync('userId');
            const role = await SecureStore.getItemAsync('role');
            const store = await SecureStore.getItemAsync('store');
            setRole(role || '0');
            setLoginToken(token || '');
            setUserId(id || '');
            // Only set the store from SecureStore on initial load
            if (!store) {
                setStore('0');
                await SecureStore.setItemAsync('store', '0');
            } else {
                setStore(store);
            }
        }
        getToken();
    }, []);

    useEffect(() => {
        // Only fetch data if we have the necessary authentication info
        if (loginToken && userId) {
            getStatistic(selectedDate);
            getUserList(selectedDate);
        }
    }, [selectedDate, store, loginToken, userId]);

    const statusOptions = [
        { label: "Tất cả trạng thái", value: "-1" },

        { label: "Đang xử lý", value: "0" },
        { label: "Đã hoàn thành", value: "1" },
        { label: "Đã hủy", value: "2" },
    ];

    // Filter reports based on search text and selected status
    const filteredReports = reports.filter(report => {
        const matchesSearch = search === '' || 
            report.title.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const getStatistic = async (day: string) => {
        try {
            setIsLoading(true);
            setMessage('Đang tải dữ liệu...');
            
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('token', loginToken);
            formData.append('date', day);
            formData.append('store', store);
            const response = await fetch('https://huelinh.com/api/get_statistic', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data && data.data.orders) {
                setStatistic(data.data.orders);
                if (Array.isArray(data.data.orders) && data.data.orders.length > 0) {

                    setTotalOrder(data.data.orders.length);
                    setCountSuccessOrder(data.data.orders.filter((order: any) => order.status === '1').length);
                    setCountCancelOrder(data.data.orders.filter((order: any) => order.status === '2').length);
                    setCountPendingOrder(data.data.orders.filter((order: any) => order.status === '0').length);
                    setTotalPrice(Number(data.data.total_spent).toLocaleString('de-DE'));
                    setTotalProductInStock(data.data.total_remain_products);
                    setTotalProductInFloat(data.data.total_float_products);
                } else {
                    setTotalOrder(0);
                    setCountSuccessOrder(0);
                    setCountCancelOrder(0);
                    setCountPendingOrder(0);
                }

            } else {
                setStatistic([]);
                setTotalOrder(0);
                setCountSuccessOrder(0);
                setCountCancelOrder(0);
                setCountPendingOrder(0);
            }
        } catch (error) {
            setStatistic([]);
            setTotalOrder(0);
            setCountSuccessOrder(0);
            setCountCancelOrder(0);
            setCountPendingOrder(0);

        } finally {
            setIsLoading(false);
        }
    };

    const getUserList = async (day: string) => {
        try {
            const response = await fetch('https://huelinh.com/api/get_user_checkin_date/'+ store + '/' + day);
            const data = await response.json();
            console.log("User List Data:", data); // Debug log
            setUserList(data || []);
        } catch (error) {
            console.error('Error fetching user checkins:', error);
            setUserList([]);
        }
    };

    const handleRefresh = () => {
        getStatistic(selectedDate);
    };

    const LoadingOverlay = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );

    const formatDisplayDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleDateSelect = (day: any) => {
        setSelectedDate(day.dateString);
        setIsCalendarVisible(false);
    };

    const handleStoreChange = async (value: string) => {
        setStore(value);
        // Save the selected store to SecureStore when it changes
        await SecureStore.setItemAsync('store', value);
        if (value) {
            if (selectedType === 'report') {
                getReportList(value);
            }
        }
    };

    const renderUserCheckins = () => {
        // Sort users: checked-in users first, then non-checked-in users
        const sortedUsers = [...userList].sort((a, b) => {
            const aCheckin = Array.isArray(a.checkin) && a.checkin.length > 0 && a.checkin[0]?.first_checkin;
            const bCheckin = Array.isArray(b.checkin) && b.checkin.length > 0 && b.checkin[0]?.first_checkin;
            
            if (aCheckin && !bCheckin) return -1;
            if (!aCheckin && bCheckin) return 1;
            return 0;
        });

        return (
            <View style={styles.checkinSection}>
                <Text style={[styles.listContentTitle, {marginTop: 20, marginBottom: 10}]}>
                    Danh sách nhân viên ({userList.length})
                </Text>
                {sortedUsers.map((user: UserData, index: number) => {
                    const todayCheckin = Array.isArray(user.checkin) && user.checkin.length > 0 
                        ? (Array.isArray(user.checkin[0]) ? user.checkin[0] : user.checkin[0])
                        : null;
                    
                    const hasCheckin = todayCheckin && todayCheckin.first_checkin;
                    const missingCheckout = hasCheckin && todayCheckin.first_checkin === todayCheckin.last_checkin;
                    
                    let statusColor = '#C62828';
                    let statusBgColor = '#FFEBEE';
                    let iconName = "error";
                    let statusText = 'Chưa checkin';
                    let shiftBgColor = 'transparent';
                    let shiftTextColor = '#666';
                    
                    if (hasCheckin) {
                        const shift = determineShift(todayCheckin.first_checkin);
                        const isLateCheckin = isLate(todayCheckin.first_checkin, shift);
                        
                        // Set shift colors - cool for morning, warm for afternoon
                        if (shift === 'morning') {
                            shiftBgColor = '#E8F5FE';
                            shiftTextColor = '#0288D1';
                        } else {
                            shiftBgColor = '#FFF3E0';
                            shiftTextColor = '#EF6C00';
                        }
                        
                        if (missingCheckout) {
                            statusColor = '#F57F17';
                            statusBgColor = '#FFFDE7';
                            iconName = "warning";
                        } else {
                            statusColor = isLateCheckin ? '#FF5722' : '#2E7D32';
                            statusBgColor = isLateCheckin ? '#FBE9E7' : '#E8F5E9';
                            iconName = isLateCheckin ? "schedule" : "check-circle";
                        }
                        
                        statusText = isLateCheckin ? 'Đi muộn' : 'Đúng giờ';
                        if (missingCheckout) statusText += ' (Chưa checkout)';
                    }
                    
                    return (
                        <View key={index} style={[
                            styles.userCard,
                            { 
                                backgroundColor: hasCheckin ? shiftBgColor : '#F5F5F5',  // Light gray background for non-checked-in
                                opacity: hasCheckin ? 1 : 0.6  // Add opacity for non-checked-in users
                            }
                        ]}>
                            <View style={styles.userCardHeader}>
                                <View style={styles.userMainInfo}>
                                    <View style={[styles.statIconContainer, { backgroundColor: statusBgColor }]}>
                                        <MaterialIcons 
                                            name={iconName as any} 
                                            size={20} 
                                            color={statusColor} 
                                        />
                                    </View>
                                    <Text style={styles.userNameText}>{user.fullname}</Text>
                                </View>
                                {hasCheckin && (
                                    <View style={[styles.shiftBadge, { backgroundColor: 'white' }]}>
                                        <Text style={[styles.shiftText, { color: shiftTextColor }]}>
                                            {determineShift(todayCheckin.first_checkin) === 'morning' ? 'Ca sáng' : 'Ca chiều'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.userCardContent}>
                                <Text style={[styles.checkinText, { color: statusColor }]}>
                                    {statusText}
                                </Text>
                                {hasCheckin && (
                                    <Text style={styles.checkinTimeText}>
                                        {`${todayCheckin.first_checkin}${
                                            !missingCheckout ? ` - ${todayCheckin.last_checkin}` : ''
                                        }`}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const generateNewReport = async () => {
        try {
            setIsLoading(true);
            setMessage('Đang tạo báo cáo mới...');
            const response = await fetch('https://huelinh.com/api/generate_report/'+store);
            
            const data = await response.json();
            if (data.status === 'success') {
                Alert.alert('Thành công', 'Đã tạo báo cáo mới thành công');
                // Refresh the reports list
                getReportList(store);
            } else {
                Alert.alert('Lỗi', data.message || 'Không thể tạo báo cáo mới');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo báo cáo');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {isLoading && <LoadingOverlay />}
            <View style={styles.container}>
                <HeaderNav currentScreen="Báo cáo, thống kê"/>
                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity 
                            onPress={handleRefresh}
                            style={styles.retryButton}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.retryButtonGradient}
                            >
                                <Text style={styles.retryButtonText}>Thử lại</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ):(
                <>
                    {role == 'admin' && (
                        <View style={styles.storePickerContainer}>
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
                    )}
                    <View style={styles.listHeaderHolder}>
                        <TouchableOpacity
                            style={[
                                styles.listHeaderButtonSelect,
                                selectedType === 'statistic' && styles.selectedButton
                            ]} 
                            onPress={() => {
                                setselectedType('statistic')
                                getStatistic(selectedDate);
                            }} 
                            activeOpacity={0.6}
                        >
                                                    <LinearGradient
                            colors={selectedType === 'statistic' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.listHeaderButtonGradient}
                        >
                            <Text style={[
                                styles.listHeaderButtonText,
                                selectedType === 'statistic' && styles.selectedButtonText
                            ]}>Thống kê</Text>
                        </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.listHeaderButtonSelect,
                                selectedType === 'report' && styles.selectedButton
                            ]} 
                            onPress={() => {
                                setselectedType('report')
                                getReportList(store);
                            }} 
                            activeOpacity={0.6}
                        >
                                                    <LinearGradient
                            colors={selectedType === 'report' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.listHeaderButtonGradient}
                        >
                            <Text style={[
                                styles.listHeaderButtonText,
                                selectedType === 'report' && styles.selectedButtonText
                            ]}>Báo cáo</Text>
                        </LinearGradient>
                        </TouchableOpacity> 
                    </View>
                    {selectedType === 'report' && (
                    <View style={styles.listHeaderHolder}>
                        <View style={styles.productPickerWrapper}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm báo cáo..."
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    </View>
                    )}
                    <View style={styles.listContent}>
                        <View style={styles.listContentHeader}>
                            <Text style={styles.listContentTitle}>
                                {selectedType === 'report' ? 'Danh sách báo cáo' : 'Thống kê'}
                            </Text>
                            {selectedType === 'statistic' && (
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setIsCalendarVisible(true)}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.datePickerButtonGradient}
                                    >
                                        <Text style={styles.datePickerButtonText}>
                                            {selectedDate ? formatDisplayDate(selectedDate) : 'Chọn ngày'}
                                        </Text>
                                        <AntDesign name="calendar" size={20} color="#667eea" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                            {selectedType === 'report' && (
                            <TouchableOpacity 
                                style={styles.generateButton}
                                onPress={generateNewReport}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.generateButtonGradient}
                                >
                                    <Text style={styles.generateButtonText}>Tạo báo cáo</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedType === 'report' ? (
                                reports.length > 0 ? (
                                    filteredReports.length > 0 ? (
                                        <ScrollView>
                                            {filteredReports.map((item, index) => (
                                                <TouchableOpacity 
                                                    key={index}
                                                    style={styles.listContentItem}
                                                    onPress={() => {
                                                        router.push({
                                                            pathname: "/detailReport/[id]",
                                                            params: { id: item.store_id + '-' + item.time }
                                                        });
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <LinearGradient
                                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                        style={styles.listContentItemGradient}
                                                    >
                                                        <View style={styles.listContentItemInfo}>
                                                            <View style={styles.reportIconTitle}>
                                                                <View style={styles.iconContainer}>
                                                                    <MaterialIcons name="description" size={24} color="#667eea" />
                                                                </View>
                                                                <Text style={styles.reportTitle}>{item.title}</Text>
                                                                <MaterialIcons name="chevron-right" size={20} color="#667eea" style={styles.chevron} />
                                                            </View>
                                                        </View>
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <LinearGradient
                                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.emptyStateGradient}
                                            >
                                                <Text style={styles.emptyStateText}>Không tìm thấy báo cáo phù hợp</Text>
                                            </LinearGradient>
                                        </View>
                                    )
                                ) : (
                                    <View style={styles.emptyState}>
                                        <LinearGradient
                                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.emptyStateGradient}
                                        >
                                            <Text style={styles.emptyStateText}>Không có báo cáo nào</Text>
                                        </LinearGradient>
                                    </View>
                                )
                            ) : (
                                <>
                                    {statistic.length > 0 ? (
                                        <View style={styles.statisticContainer}>
                                            <View style={styles.statRow}>
                                                <LinearGradient
                                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.statCard}
                                                >
                                                    <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                                                        <AntDesign name="profile" size={20} color="#1976D2" />
                                                    </View>
                                                    <View style={styles.statTextContainer}>
                                                        <Text style={styles.statLabel}>Tổng đơn</Text>
                                                        <Text style={styles.statValue}>{totalOrder}</Text>
                                                    </View>
                                                </LinearGradient>

                                                <LinearGradient
                                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.statCard}
                                                >
                                                    <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
                                                        <AntDesign name="checkcircle" size={20} color="#2E7D32" />
                                                    </View>
                                                    <View style={styles.statTextContainer}>
                                                        <Text style={styles.statLabel}>Thành công</Text>
                                                        <Text style={[styles.statValue, { color: '#2E7D32' }]}>{countSuccessOrder}</Text>
                                                    </View>
                                                </LinearGradient>
                                            </View>

                                            <View style={styles.statRow}>
                                                <LinearGradient
                                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.statCard}
                                                >
                                                    <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
                                                        <AntDesign name="closecircle" size={20} color="#C62828" />
                                                    </View>
                                                    <View style={styles.statTextContainer}>
                                                        <Text style={styles.statLabel}>Đã hủy</Text>
                                                        <Text style={[styles.statValue, { color: '#C62828' }]}>{countCancelOrder}</Text>
                                                    </View>
                                                </LinearGradient>

                                                <LinearGradient
                                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.statCard}
                                                >
                                                    <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                                                        <AntDesign name="clockcircle" size={20} color="#EF6C00" />
                                                    </View>
                                                    <View style={styles.statTextContainer}>
                                                        <Text style={styles.statLabel}>Chờ xử lý</Text>
                                                        <Text style={[styles.statValue, { color: '#EF6C00' }]}>{countPendingOrder}</Text>
                                                    </View>
                                                </LinearGradient>
                                            </View>

                                            <LinearGradient
                                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={[styles.statCard, styles.totalPriceCard]}
                                            >
                                                <View style={[styles.statIconContainer, { backgroundColor: '#E1F5FE' }]}>
                                                    <AntDesign name="creditcard" size={20} color="#0288D1" />
                                                </View>
                                                <View style={styles.statTextContainer}>
                                                    <Text style={styles.statLabel}>Tổng doanh thu</Text>
                                                    <Text style={[styles.statValue, { color: '#0288D1' }]}>
                                                        {totalPrice?.toLocaleString()}đ
                                                    </Text>
                                                </View>
                                            </LinearGradient>
                                        </View>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <LinearGradient
                                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.emptyStateGradient}
                                            >
                                                <Text style={styles.emptyStateText}>Không có thống kê nào</Text>
                                            </LinearGradient>
                                        </View>
                                    )}
                                    {renderUserCheckins()}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </>
                )}
                <Modal
                    visible={isCalendarVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsCalendarVisible(false)}
                >
                    <LinearGradient
                        colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.calendarModalContainer}
                    >
                        <TouchableOpacity 
                            style={styles.calendarModalOverlay}
                            activeOpacity={1}
                            onPress={() => setIsCalendarVisible(false)}
                        >
                            <TouchableOpacity 
                                activeOpacity={1} 
                                onPress={e => e.stopPropagation()}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.calendarModalContent}
                                >
                                    <View style={styles.calendarHeader}>
                                        <Text style={styles.calendarTitle}>Chọn ngày</Text>
                                        <TouchableOpacity 
                                            onPress={() => setIsCalendarVisible(false)}
                                            style={styles.closeButton}
                                        >
                                            <AntDesign name="close" size={24} color="black" />
                                        </TouchableOpacity>
                                    </View>
                                    <Calendar
                                        onDayPress={handleDateSelect}
                                        markedDates={{
                                            [selectedDate]: {
                                                selected: true,
                                                selectedColor: '#667eea',
                                            }
                                        }}
                                        theme={{
                                            backgroundColor: '#ffffff',
                                            calendarBackground: '#ffffff',
                                            textSectionTitleColor: '#666',
                                            selectedDayBackgroundColor: '#667eea',
                                            selectedDayTextColor: '#ffffff',
                                            todayTextColor: '#667eea',
                                            dayTextColor: '#2d4150',
                                            textDisabledColor: '#d9e1e8',
                                            dotColor: '#00adf5',
                                            monthTextColor: '#2d4150',
                                            textDayFontWeight: '300',
                                            textMonthFontWeight: 'bold',
                                            textDayHeaderFontWeight: '300',
                                            textDayFontSize: 16,
                                            textMonthFontSize: 16,
                                            textDayHeaderFontSize: 14,
                                        }}
                                        enableSwipeMonths={true}
                                        current={selectedDate}
                                        maxDate={new Date().toISOString().split('T')[0]}
                                        style={{
                                            width: screenWidth*0.8,
                                        }}
                                    />
                                </LinearGradient>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </LinearGradient>
                </Modal>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listHeaderHolder: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 10,
        padding: 25,
        paddingBottom: 0
    },
    productPickerWrapper: {
        width: '100%',
    },
    searchInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        fontSize: 16,
        color: '#374151',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownStyle: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 45,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    listContent: {
        flex: 1,
        flexDirection: 'column',
        gap: 15,
        padding: 25,
        paddingTop: 15,
    },
    listContentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    listContentTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    listContentButton: {
        padding: 8,
        borderRadius: 5,
        backgroundColor: 'rgb(40, 167, 69)',
    },
    listContentItem: {
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    listContentItemInfo: {
        gap: 12,
    },
    reportIconTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
        letterSpacing: 0.3,
    },
    chevron: {
        marginLeft: 4,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    listHeaderButtonSelect: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        minWidth: 100,
        marginRight: 15,
    },
    listHeaderButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    selectedButton: {
        // Gradient handled by LinearGradient
    },
    selectedButtonText: {
        color: 'white',
    },
    statisticContainer: {
        flex: 1,
        gap: 10,
    },
    statRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    totalPriceCard: {
        flex: 1,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statTextContainer: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
    },
    retryButton: {
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
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    datePickerButton: {
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
    datePickerButtonText: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
    calendarModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    calendarModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarModalContent: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    calendarTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
    },
    closeButton: {
        padding: 5,
    },
    storePickerContainer: {
        padding: 25,
        paddingBottom: 0,
        zIndex: 1000,
    },
    salesInfoContainer: {
        marginTop: 4,
        gap: 4,
    },
    salesInfoText: {
        fontSize: 14,
        lineHeight: 20,
    },
    salesLabel: {
        color: '#6b7280',
        fontWeight: '500',
    },
    salesValue: {
        color: '#10b981',
        fontWeight: '700',
    },
    checkinSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    userCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    userCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    userMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userCardContent: {
        marginLeft: 32,
    },
    shiftBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    shiftText: {
        fontSize: 12,
        fontWeight: '600',
    },
    userNameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 12,
        flex: 1,
    },
    checkinText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    checkinTimeText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    generateButton: {
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
    generateButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    listHeaderButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    retryButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    datePickerButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    generateButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    listContentItemGradient: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    emptyStateGradient: {
        padding: 40,
        alignItems: 'center',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
        width: '100%',
    },
});
