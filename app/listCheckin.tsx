import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DropDownPicker from 'react-native-dropdown-picker';

interface Checkin {
    checkin_date: string;
    first_checkin: string;
    last_checkin: string;
}

interface MarkedDates {
    [date: string]: {
        marked?: boolean;
        dotColor?: string;
        selected?: boolean;
        selectedColor?: string;
    };
}

interface User {
    label: string;
    value: string;
}

export default function ListCheckinScreen() {
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [search, setSearch] = useState('');
    const [openStatus, setOpenStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('-1');
    const [loginToken, setLoginToken] = useState('');
    const [userId, setUserId] = useState('');
    const [openMonth, setOpenMonth] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [displayType, setDisplayType] = useState('detail');
    const [selectedDateDetails, setSelectedDateDetails] = useState<Checkin | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [calendarKey, setCalendarKey] = useState(0);
    const [userList, setUserList] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [openUser, setOpenUser] = useState(false);

    const handleDisplayType = (type: string) => {
        setDisplayType(type);
    }

    const getUserList = async () => {
        try {
            const response = await fetch('https://huelinh.com/api/get_list_all_user_api');
            const data = await response.json();
            // Format the data for DropDownPicker
            const formattedData = data.map((user: any) => ({
                label: user.fullname,
                value: user.user_id
            }));
            setUserList(formattedData);
        } catch (error) {
            console.error('Error fetching seller list:', error);
        }
    }

    const getListCheckin = async (userId: string | null) => {
        if (!userId) return;

        setIsLoading(true);
        setError('');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(
                `https://huelinh.com/api/get_list_user_checkin/${userId}/${selectedMonth}`,
                { signal: controller.signal }
            );
            console.log(`https://huelinh.com/api/get_list_user_checkin/${userId}/${selectedMonth}`);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Kết nối máy chủ thất bại!');
            }

            const data = await response.json();
            setCheckins(data.data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Yêu cầu đã hết thời gian. Vui lòng thử lại.');
            } else {
                setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const getToken = async () => {
            const token = await SecureStore.getItemAsync('loginToken');
            const id = await SecureStore.getItemAsync('userId');
            const role = await SecureStore.getItemAsync('role');
            setLoginToken(token || '');
            setUserId(id || '');
            if (id) {
                getListCheckin(id);
            }
            if (role == 'admin') {
                getUserList();
            }
        }
        getToken();
    }, []);

    useEffect(() => {
        if (selectedUser == '') {
            getListCheckin(userId);
        }else{
            getListCheckin(selectedUser);
        }
    }, [selectedMonth, userId]);
    // Generate months options (current month and 6 months back)
    const getMonthOptions = () => {
        const options = [];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            // Add 1 to month to correct the 0-based month issue
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthYear = date.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
            
            options.push({
                label: monthYear,
                value: value
            });
        }
        
        return options;
    };

    const getDayName = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { weekday: 'long' });
    };

    const isLate = (firstCheckin: string, shift: 'morning' | 'afternoon'): boolean => {
        const checkinTime = new Date(`2000-01-01T${firstCheckin}`);
        const morningLateTime = new Date(`2000-01-01T08:40:00`);
        const afternoonLateTime = new Date(`2000-01-01T11:10:00`);
        
        return shift === 'morning' 
            ? checkinTime > morningLateTime 
            : checkinTime > afternoonLateTime;
    };

    const determineShift = (firstCheckin: string): 'morning' | 'afternoon' => {
        const checkinTime = new Date(`2000-01-01T${firstCheckin}`);
        const morningCutoff = new Date(`2000-01-01T10:00:00`);
        return checkinTime < morningCutoff ? 'morning' : 'afternoon';
    };

    const getStatus = (checkin: Checkin) => {
        // First check if there's any data for this date
        if (!checkin.first_checkin || checkin.first_checkin === 'Not checkin') {
            return { text: 'Vắng mặt', style: styles.absentStatus };
        }

        // Check if there's checkout time
        if (!checkin.last_checkin || checkin.last_checkin === checkin.first_checkin) {
            return { text: 'Chưa checkout', style: styles.noCheckoutStatus };
        }

        // Check if check-in was late
        const shift = determineShift(checkin.first_checkin);
        if (isLate(checkin.first_checkin, shift)) {
            return { text: 'Đi muộn', style: styles.lateStatus };
        }
        
        // If none of the above, it's a normal checkin with checkout
        return { text: 'Đúng giờ', style: styles.checkedOutStatus };
    };
    
    const filteredCheckins = (() => {
        // Get all dates up to today for the selected month
        const [year, month] = selectedMonth.split('-');
        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
        const lastDay = new Date(parseInt(year), parseInt(month), 0);
        const today = new Date();
        const endDate = new Date(Math.min(lastDay.getTime(), today.getTime()));
        
        // Create array of all dates with default "absent" status
        const allDates: Checkin[] = [];
        for (let date = new Date(firstDay); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            allDates.push({
                checkin_date: dateString,
                first_checkin: 'Not checkin',
                last_checkin: 'Not checkin'
            });
        }

        // Merge with actual checkin data
        const mergedCheckins = allDates.map(defaultCheckin => {
            const actualCheckin = checkins.find(c => c.checkin_date === defaultCheckin.checkin_date);
            return actualCheckin || defaultCheckin;
        });

        // Sort in descending order (newest to oldest)
        const sortedCheckins = mergedCheckins.sort((a, b) => 
            new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime()
        );

        // Apply filters
        return sortedCheckins.filter(checkin => {
            const matchesSearch = search === '' || 
                checkin.first_checkin.toLowerCase().includes(search.toLowerCase());
            
            const matchesStatus = selectedStatus === '-1' || checkin.first_checkin === selectedStatus;
            
            return matchesSearch && matchesStatus;
        });
    })();

    // Add pull to refresh functionality
    const onRefresh = () => {
        if(selectedUser == ''){
            getListCheckin(userId);
        }else{
            getListCheckin(selectedUser);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getMarkedDates = () => {
        const markedDates: MarkedDates = {};
        
        // Get the first and last day of the selected month
        const [year, month] = selectedMonth.split('-');
        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
        const lastDay = new Date(parseInt(year), parseInt(month), 0);
        
        // Get today's date in local timezone
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Check if we're viewing the current month
        const isCurrentMonth = today.getFullYear() === parseInt(year) && 
                              (today.getMonth() + 1) === parseInt(month);
        
        // Only mark days up to today
        const endDate = new Date(Math.min(lastDay.getTime(), today.getTime()));
        
        // First, mark all past days as "Vắng mặt"
        for (let date = new Date(firstDay); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const isToday = dateString === todayString;
            
            markedDates[dateString] = {
                marked: true,
                dotColor: isToday ? '#757575' : '#c62828', // Gray for today if no checkin, Red for past days
                
            };
        }
        
        // Then override with actual checkin data
        checkins.forEach((checkin) => {
            if (!checkin.checkin_date) return;
            
            // Skip if the checkin date is in the future
            const checkinDate = new Date(checkin.checkin_date);
            if (checkinDate > today) return;
            
            const status = getStatus(checkin);
            let dotColor = '#2E7D32'; // default green for normal checkin
            
            // Check conditions in order of priority
            if (status.text === 'Vắng mặt') {
                dotColor = '#c62828'; // Red for absence
            } else if (status.text === 'Chưa checkin') {
                dotColor = '#757575'; // Gray for no checkin
            } else if (status.text === 'Chưa checkout') {
                dotColor = '#4527a0'; // Purple for no checkout
            } else if (status.text === 'Đi muộn') {
                dotColor = '#ffc107'; // Yellow for late
            }
            
            markedDates[checkin.checkin_date] = {
                marked: true,
                dotColor: dotColor,
                ...(checkin.checkin_date === todayString && {
                    selected: true,
                    selectedColor: 'rgba(0, 122, 255, 0.1)'
                })
            };
        });
        
        // Always ensure today is marked appropriately if we're viewing the current month
        if (isCurrentMonth && !markedDates[todayString]) {
            markedDates[todayString] = {
                marked: true,
                dotColor: '#757575', // Gray for no checkin
                selected: true,
                selectedColor: 'rgba(0, 122, 255, 0.1)'
            };
        }
        
        return markedDates;
    };

    const onDayPress = (day: any) => {
        // Check if the selected date is not in the future
        const selectedDate = new Date(day.dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate > today) {
            return; // Don't do anything for future dates
        }
        
        // Find existing checkin data
        const selectedCheckin = checkins.find(
            checkin => checkin.checkin_date === day.dateString
        );
        
        // If no checkin found, create a default "Chưa checkin" record
        const checkinData = selectedCheckin || {
            checkin_date: day.dateString,
            first_checkin: 'Not checkin',
            last_checkin: 'Not checkin'
        };
        
        setSelectedDateDetails(checkinData);
        setIsModalVisible(true);
    };

    const handleUserChange = (value: string) => {
        const today = new Date();
        setSelectedUser(value);
        getListCheckin(value);
    }

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.container}>
                <HeaderNav currentScreen="Thông tin chấm công"/>
                <View style={styles.listHeaderHolder}>
                    <View style={styles.productPickerWrapper}>
                        {userList.length > 0 && (
                            <View style={styles.sellerPickerContainer}>
                                <DropDownPicker
                                    open={openUser}
                                    value={selectedUser}
                                    items={userList}
                                    setOpen={setOpenUser}
                                    setValue={(callback: any) => handleUserChange(callback(selectedUser))}
                                    placeholder="Chọn nhân viên"
                                    style={styles.dropdownStyle}
                                    dropDownContainerStyle={styles.dropdownContainer}
                                    listMode="MODAL"
                                    scrollViewProps={{
                                        nestedScrollEnabled: true,
                                    }}
                                    zIndex={2000}
                                />
                            </View>
                        )}
                        <DropDownPicker
                            style={styles.dropdownStyle}
                            dropDownContainerStyle={styles.dropdownContainer}
                            open={openMonth}
                            value={selectedMonth}
                            items={getMonthOptions()}
                            setOpen={setOpenMonth}
                            setValue={(value) => {
                                setSelectedMonth(value);
                                setCalendarKey(prev => prev + 1);
                            }}
                            placeholder="Chọn tháng"
                            zIndex={1000}
                        />
                    </View>
                </View>
                <View style={styles.listContent}>
                    <View style={styles.listContentHeader}>
                        <Text style={styles.listContentTitle}>Danh sách checkin</Text>
                        <TouchableOpacity 
                            onPress={onRefresh}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.refreshButton}
                            >
                                <AntDesign name="reload1" size={20} color="#667eea" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.displayTypeContainer}>
                        <TouchableOpacity onPress={() => handleDisplayType('detail')}>
                            <LinearGradient
                                colors={displayType === 'detail' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.displayTypeButton, displayType === 'detail' && styles.activeDisplayType]}
                            >
                                <Text style={[styles.displayTypeText, (displayType === 'detail' && styles.activeDisplayTypeText)]}>Chi tiết</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDisplayType('calendar')}>
                            <LinearGradient
                                colors={displayType === 'calendar' ? ['#10b981', '#059669'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.displayTypeButton, displayType === 'calendar' && styles.activeDisplayType]}
                            >
                                <Text style={[styles.displayTypeText, (displayType === 'calendar' && styles.activeDisplayTypeText)]}>Theo lịch</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    {displayType === 'detail' ? (
                        <>
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0066cc" />
        
                                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity 
                                    onPress={onRefresh}
                                    style={styles.retryButton}
                                >
                                    <Text style={styles.retryButtonText}>Thử lại</Text>
                                </TouchableOpacity>
                            </View>
                        ) : filteredCheckins.length > 0 ? (
                            <ScrollView style={styles.container}>
                                {filteredCheckins.map((checkin) => (
                                    <TouchableOpacity 
                                        key={checkin.checkin_date}
                                    >
                                        <LinearGradient
                                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.listContentItem}
                                        >
                                        <View style={styles.listContentItemInfo}>
                                            <View style={styles.dateContainer}>
                                                <Text style={styles.dayName}>
                                                    {getDayName(checkin.checkin_date)}
                                                </Text>
                                                <Text style={styles.date}>
                                                    {formatDate(checkin.checkin_date)}
                                                </Text>
                                            </View>
                                            <View style={styles.timeContainer}>
                                                <Text style={styles.checkinTime}>
                                                    Giờ vào: {(checkin.first_checkin !== 'Not checkin')? checkin.first_checkin : 'Chưa checkin'}
                                                </Text>
                                                <Text style={styles.checkinTime}>
                                                    Giờ ra: {checkin.last_checkin !== checkin.first_checkin 
                                                    ? (checkin.last_checkin || '--:--')
                                                    : 'Chưa Checkout'}
                                                </Text>
                                            </View>
                                            <View style={styles.checkinStatus}>
        
                                                <Text style={[
                                                    styles.statusText,
                                                    getStatus(checkin).style
                                                ]}>
                                                    {getStatus(checkin).text}
                                                </Text>
                                            </View>
                                        </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>Không có dữ liệu checkin</Text>
                            </View>
                        )}
                        </>
                    ):(
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.calendarContainer}
                        >
                            <Calendar
                                key={calendarKey}
                                style={styles.calendar}
                                theme={{
                                    backgroundColor: '#ffffff',
                                    calendarBackground: '#ffffff',
                                    textSectionTitleColor: '#666',
                                    selectedDayBackgroundColor: '#007AFF',
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: '#007AFF',
                                    dayTextColor: '#2d4150',
                                    textDisabledColor: '#d9e1e8',
                                    dotColor: '#00adf5',
                                    monthTextColor: '#2d4150',
                                    textDayFontWeight: '300',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '300',
                                    textDayFontSize: 16,
                                    textMonthFontSize: 16,
                                    textDayHeaderFontSize: 14
                                }}
                                markedDates={getMarkedDates()}
                                enableSwipeMonths={true}
                                current={`${selectedMonth}-01`}
                                maxDate={new Date().toISOString().split('T')[0]}
                                onDayPress={onDayPress}
                            />
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
                                    <Text style={styles.legendText}>Đúng giờ</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#ffc107' }]} />
                                    <Text style={styles.legendText}>Đi muộn</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#c62828' }]} />
                                    <Text style={styles.legendText}>Vắng mặt</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#4527a0' }]} />
                                    <Text style={styles.legendText}>Chưa checkout</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#757575' }]} />
                                    <Text style={styles.legendText}>Chưa checkin</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    )}
                </View>
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setIsModalVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setIsModalVisible(false)}
                    >
                        <LinearGradient
                            colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)', 'rgba(240, 147, 251, 0.9)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modalOverlay}
                        >
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.modalContent}
                            >
                            {selectedDateDetails && (
                                <View style={styles.modalBody}>
                                    <View style={styles.dateContainer}>
                                        <Text style={styles.modalDayName}>
                                            {getDayName(selectedDateDetails.checkin_date)}
                                        </Text>
                                        <Text style={styles.modalDate}>
                                            {formatDate(selectedDateDetails.checkin_date)}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.modalTimeContainer}>
                                        <View style={styles.modalTimeItem}>
                                            <Text style={styles.modalTimeLabel}>Giờ vào:</Text>
                                            <Text style={styles.modalTimeValue}>
                                                {(selectedDateDetails.first_checkin !== 'Not checkin')? selectedDateDetails.first_checkin : 'Chưa Checkin'}
                                            </Text>
                                        </View>
                                        <View style={styles.modalTimeItem}>

                                            <Text style={styles.modalTimeLabel}>Giờ ra:</Text>
                                            <Text style={styles.modalTimeValue}>
                                                {selectedDateDetails.last_checkin !== selectedDateDetails.first_checkin 
                                                    ? (selectedDateDetails.last_checkin || '--:--')
                                                    : 'Chưa Checkout'}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.modalStatusContainer}>
                                        <Text style={[
                                            styles.modalStatus,
                                            getStatus(selectedDateDetails).style
                                        ]}>
                                            {getStatus(selectedDateDetails).text}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            </LinearGradient>
                        </LinearGradient>
                    </TouchableOpacity>
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
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DDD',
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
        fontSize: 18,
        fontWeight: 'bold',
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
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    listContentItemInfo: {
        gap: 12,
    },
    checkinTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2c3e50',
        letterSpacing: 0.3,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
    },
    checkinTime: {
        fontSize: 15,
        color: '#34495e',
        lineHeight: 22,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    checkinStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        overflow: 'hidden',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Roboto_400Regular',
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
    workingStatus: {
        backgroundColor: '#e8f5e9',
        color: '#2E7D32',
    },
    checkedOutStatus: {
        backgroundColor: '#e3f2fd',
        color: '#1976D2',
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    dayName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    date: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    timeContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 12,
        gap: 8,
    },
    absentStatus: {
        backgroundColor: '#ffebee',
        color: '#c62828',
    },
    lateStatus: {
        backgroundColor: '#fff3e0',
        color: '#ef6c00',
    },
    checkedInStatus: {
        backgroundColor: '#e8f5e9',
        color: '#2E7D32',
    },
    noCheckoutStatus: {
        backgroundColor: '#ede7f6',
        color: '#4527a0',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
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
    },
    retryButton: {
        backgroundColor: '#0066cc',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    displayTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
        gap: 15,
    },
    displayTypeButton: {
        padding: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    displayTypeText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    activeDisplayType: {
        borderRadius: 12,
    },
    activeDisplayTypeText: {
        color: 'white',
    },
    calendarContainer: {
        borderRadius: 16,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    calendar: {
        borderRadius: 10,
        elevation: 4,
        backgroundColor: 'white',
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        paddingTop: 15,
        gap: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    notCheckinStatus: {
        backgroundColor: '#f5f5f5',
        color: '#757575',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
        width: '85%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    modalBody: {
        marginTop: 0,
    },
    modalDayName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    modalDate: {
        fontSize: 18,
        color: '#666',
        fontWeight: '500',
    },
    modalTimeContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        marginTop: 20,
    },
    modalTimeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    modalTimeLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    modalTimeValue: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    modalStatusContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    modalStatus: {
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        overflow: 'hidden',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sellerPickerContainer: {
        marginBottom: 10,
        zIndex: 2000, // Higher than month picker
    },

});
