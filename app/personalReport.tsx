import HeaderNav from '@/app/components/headerNav';
import { AntDesign } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Add this interface for better type safety
interface Order {
    [index: number]: {
        order_id: string;
        product_name: string;
        total_price: string;
        discount: string;
        paid_amount: string;
        status: string;
        created_date: string;
        ava: any;
        price_current: string;
        // ... other fields ...
    };
}

const screenWidth = Dimensions.get('window').width;

const productImageSrc = 'https://huelinh.b-cdn.net/api/compress_image/';
const productFullImageSrc = 'https://huelinh.b-cdn.net/assets/img/product_images/';

export default function PersonalReportScreen() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Đang tải dữ liệu...');
    const [error, setError] = useState('');
    const [userIdState, setUserIdState] = useState('');
    const [token, setToken] = useState('');
    const [orderList, setOrderList] = useState<Order[]>([]);
    const [personalStats, setPersonalStats] = useState({
        totalOrders: 0,
        successfulOrders: 0,
        canceledOrders: 0,
        pendingOrders: 0,
        totalRevenue: '0',
    });
    const [sellerList, setSellerList] = useState([]);
    const [monthOpen, setMonthOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState('');
    const [sellerOpen, setSellerOpen] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState('');
    const [formattedSellerList, setFormattedSellerList] = useState([]);
    const [showImage, setShowImage] = useState(false);
    const [imageSource, setImageSource] = useState('');
    const handleMonthChange = (value: string) => {
        const today = new Date();
        setCurrentMonth(value);
        if(selectedSeller == ''){
            getPersonalStats(userIdState, today.getFullYear().toString() + '-' + value.toString());
        }else{
            getPersonalStats(selectedSeller, today.getFullYear().toString() + '-' + value.toString());
        }
    }

    const handleSellerChange = (value: string) => {
        const today = new Date();
        setSelectedSeller(value);
        getPersonalStats(value, today.getFullYear().toString() + '-' + currentMonth.toString());
    }

    useEffect(() => {
        const loadAuth = async () => {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            setCurrentMonth(currentMonth.toString());
            const userId = await SecureStore.getItemAsync('userId');
            const loginToken = await SecureStore.getItemAsync('loginToken');
            const role = await SecureStore.getItemAsync('role');
            if (userId && loginToken) {
                setUserIdState(userId);
                setToken(loginToken);
                getPersonalStats(userId, today.getFullYear().toString() + '-' + currentMonth.toString());
                if(role == 'admin'){
                    getSellerList();
                }
            }
        }
        loadAuth();
    }, []);

    const getSellerList = async () => {
        try {
            const response = await fetch('https://huelinh.com/api/get_list_user_api');
            const data = await response.json();
            // Format the data for DropDownPicker
            const formattedData = data.map((seller: any) => ({
                label: seller.fullname,
                value: seller.user_id
            }));
            setFormattedSellerList(formattedData);
        } catch (error) {
            console.error('Error fetching seller list:', error);
        }
    }

    const getPersonalStats = async (userId: string, date: string) => {
        try {

            setIsLoading(true);
            setMessage('Đang tải dữ liệu...');
            setOrderList([]);
            const response = await fetch('https://huelinh.com/api/get_sale_orders?month=' + date + '&user_id=' + userId);
            const data = await response.json();
            if (data.status == 'success') {
                // Set order list from data.data.orders
                if (data.data?.orders) {
                    const orders = data.data.orders;
                    // Sort orders by date (newest first)
                    const sortedOrders = [...orders].sort((a, b) => {
                        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
                    });
                    setOrderList(sortedOrders);
                }

                // Calculate personal stats from data.data.personal
                if (data.data?.personal) {
                    const personalOrders = data.data.personal;
                    let successfulOrders = personalOrders.filter((order: any) => order.status == '1');
                    console.log("Successful orders count:", successfulOrders.length);
                    
                    // Sort orders by price for easier comparison
                    successfulOrders.sort((a: any, b: any) => Number(b.total_price) - Number(a.total_price));
                    
                    let totalRevenue = 0;
                    console.log("Orders by price (highest to lowest):");
                    successfulOrders.forEach((order: any) => {
                        const orderTotal = Number(order.total_price);
                        console.log(`Order #${order.order_id}: ${orderTotal.toLocaleString('de-DE')}đ`);
                        totalRevenue += orderTotal;
                    });
                    console.log("Final total revenue:", totalRevenue.toLocaleString('de-DE'));

                    setPersonalStats({
                        totalOrders: personalOrders.length || 0,
                        successfulOrders: successfulOrders.length || 0,
                        canceledOrders: personalOrders.filter((order: any) => order.status == '2').length || 0,
                        pendingOrders: personalOrders.filter((order: any) => order.status == '0').length || 0,
                        totalRevenue: totalRevenue.toString(),
                    });
                }
            }
        } catch (error) {
            setError('Có lỗi xảy ra khi tải dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    const LoadingOverlay = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{message}</Text>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case '1':
                return '#2E7D32'; // Success green
            case '2':
                return '#C62828'; // Error red
            case '0':
                return '#EF6C00'; // Warning orange
            default:
                return '#666666';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case '1':
                return 'Thành công';
            case '2':
                return 'Đã hủy';
            case '0':
                return 'Chờ xử lý';
            default:
                return 'Không xác định';
        }
    };

    const renderOrderItem = (order: Order) => {
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            try {
                const [date, time] = dateStr.split(' ');
                if (!date || !time) return dateStr;
                
                const [year, month, day] = date.split('-');
                const [hour, minute] = time.split(':');
                
                if (!year || !month || !day || !hour || !minute) return dateStr;
                
                return `${day}/${month}/${year} ${hour}:${minute}`;
            } catch (error) {
                return dateStr;
            }
        };
        const isMultipleProducts = Array.isArray(order) && order.length > 1;
        if(Array.isArray(order) && order.length == 0){
            return null
        }
        return (
            <TouchableOpacity 
                key={order[0].order_id}
                style={styles.orderItem}
                onPress={() => router.push({
                    pathname: "/detailOrder/[id]",
                    params: { id: order[0].order_id }
                })}
                onLongPress={() => openImage(order[0].ava.asset_src)}
            >
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.orderItemGradient}
                >
                    <View style={styles.orderHeader}>
                        <Text style={styles.orderId}>
                            Đơn hàng #{order[0].order_id} 
                        </Text>
                        <Text style={[styles.orderStatus, { color: getStatusColor(order[0].status) }]}>
                            {getStatusText(order[0].status)}
                        </Text>
                    </View>
                    {!isMultipleProducts ? (
                        <View style={styles.orderProduct}>
                            <Image 
                                source={{uri: productImageSrc + order[0].ava.asset_src}} 
                                style={styles.orderProductImage}
                                contentFit="contain"
                                cachePolicy="disk"
                            />
                            <View style={styles.orderProductInfo}>
                                <Text style={styles.orderProductName}>
                                    {order[0].product_name}
                                </Text>
                                <Text style={styles.orderProductPrice}>
                                    {"Giá gốc: " + Number(order[0].price_current).toLocaleString()}đ
                                </Text>
                            </View>
                        </View>
                    ) : (
                        order.map((orders: any) => (
                            <View style={styles.orderProduct}>
                                <Image 
                                    source={{uri: productImageSrc + orders.ava.asset_src}} 
                                    style={styles.orderSmallProductImage}
                                    contentFit="contain"
                                    cachePolicy="disk"
                                />
                                <View style={styles.orderProductInfo}>
                                    <Text style={styles.orderProductNameLong}>
                                        {orders.product_name}
                                    </Text>
                                    <Text style={styles.orderProductPrice}>
                                        {"Giá gốc: " + Number(orders.price_current).toLocaleString()}đ
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                    <View style={styles.orderDetails}>
                        
                        <View style={styles.orderPriceDetails}>
                            <Text style={styles.priceLabel}>Tổng tiền:</Text>
                            <Text style={styles.priceValue}>
                                {Number(order[0].total_price).toLocaleString()}đ
                            </Text>
                        </View>
                        {Number(order[0].discount) > 0 && (
                            <View style={styles.orderPriceDetails}>
                                <Text style={styles.priceLabel}>Giảm giá:</Text>
                                <Text style={styles.discountValue}>
                                    -{Number(order[0].discount).toLocaleString()}đ
                                </Text>
                            </View>
                        )}
                        <View style={styles.orderPriceDetails}>
                            <Text style={styles.priceLabel}>Đã thanh toán:</Text>
                            <Text style={[styles.priceValue, { color: '#2E7D32' }]}>
                                {(order[0].status == '1')?Number(order[0].total_price).toLocaleString():Number(order[0].paid_amount).toLocaleString()}đ
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const openImage = (imageSource: string) => {
        setShowImage(true);
        setImageSource(imageSource);
      };
    
    const ImageViewer = () => (
    <TouchableOpacity 
        style={styles.imageViewerOverlay} 
        activeOpacity={1}
        onPress={() => setShowImage(false)}
    >
        <View style={styles.imageViewer}>
        <TouchableOpacity 
            style={styles.closeButtonImageViewer}
            onPress={() => setShowImage(false)}
        >
            <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        <Image 
            source={{ uri: productFullImageSrc + imageSource }} 
            style={styles.fullScreenImage}
            contentFit="contain"
            cachePolicy="disk"
        />
        </View>
    </TouchableOpacity>
    );

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {isLoading && <LoadingOverlay />}
            {showImage && <ImageViewer />}
            <View style={styles.container}>
                <HeaderNav currentScreen="Báo cáo cá nhân"/>
                <View style={styles.listContent}>
                    <View style={styles.sellerPickerContainer}>
                        <DropDownPicker
                            open={sellerOpen}
                            value={selectedSeller}
                            items={formattedSellerList}
                            setOpen={setSellerOpen}
                            setValue={(callback: any) => handleSellerChange(callback(selectedSeller))}
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
                    <View style={styles.listContentHeader}>
                        <Text style={styles.listContentTitle}>Thống kê cá nhân</Text>
                        <View style={styles.monthPickerContainer}>
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

                    <ScrollView showsVerticalScrollIndicator={false}>
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
                                        <Text style={styles.statValue}>{personalStats.totalOrders}</Text>
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
                                        <Text style={[styles.statValue, { color: '#2E7D32' }]}>
                                            {personalStats.successfulOrders}
                                        </Text>
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
                                        <Text style={[styles.statValue, { color: '#C62828' }]}>
                                            {personalStats.canceledOrders}
                                        </Text>
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
                                        <Text style={[styles.statValue, { color: '#EF6C00' }]}>
                                            {personalStats.pendingOrders}
                                        </Text>
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
                                    <Text style={styles.statLabel}>Doanh số cá nhân</Text>
                                    <Text style={[styles.statValue, { color: '#0288D1' }]}>
                                        {Number(personalStats.totalRevenue).toLocaleString()}đ
                                    </Text>
                                </View>
                            </LinearGradient>
                        </View>

                        <View style={styles.ordersSection}>
                            <Text style={styles.sectionTitle}>Danh sách đơn hàng</Text>
                            {orderList.length > 0 ? (
                                orderList.map((order: Order) => renderOrderItem(order))
                            ) : (
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.emptyState}
                                >
                                    <Text style={styles.emptyStateText}>
                                        Không có đơn hàng nào trong tháng này
                                    </Text>
                                </LinearGradient>
                            )}
                        </View>
                    </ScrollView>
                </View>
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
    emptyStateText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    listHeaderButtonSelect: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        minWidth: 100,
        alignItems: 'center',
        marginRight: 15,
    },
    listHeaderButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    selectedButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    selectedButtonText: {
        color: 'white',
    },
    statisticContainer: {
        flex: 1,
        gap: 12,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
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
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
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
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        gap: 8,
    },
    datePickerButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    calendarModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 20,
    },
    calendarModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    closeButton: {
        padding: 5,
    },
    storePickerContainer: {
        padding: 25,
        paddingBottom: 0,
        zIndex: 1000, // Required for DropDownPicker
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
        color: '#666',
        fontWeight: '500',
    },
    salesValue: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    checkinSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    userCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
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
        marginLeft: 32, // Aligns with the name after the icon
    },
    shiftBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    shiftText: {
        fontSize: 12,
        fontWeight: '600',
    },
    userNameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
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
        color: '#666',
    },
    monthPickerContainer: {
        padding: 0,
        width: 140,
        zIndex: 1000,
    },
    ordersSection: {
        marginTop: 20,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    orderItem: {
        borderRadius: 16,
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
    orderItemGradient: {
        borderRadius: 16,
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
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    orderStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    orderDetails: {
        gap: 6,
    },
    orderDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    orderPriceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    discountValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C62828',
    },
    orderProduct: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
        marginTop: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    orderProductImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    orderProductName: {
        fontSize: 16,
        fontWeight: 'bold',
        maxWidth: screenWidth*0.5,
        color: '#374151',
    },
    orderProductNameLong: {
        fontSize: 15,
        fontWeight: 'bold',
        maxWidth: screenWidth*0.7,
        color: '#374151',
    },
    orderSmallProductImage: {
        width: 40,
        height: 40,
        borderRadius: 12,
    },
    sellerPickerContainer: {
        marginBottom: 10,
        zIndex: 2000, // Higher than month picker
    },
    orderProductInfo: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderProductPrice: {    
        fontSize: 13,
        fontWeight: '400',
        color: '#6b7280',
    },
    imageViewerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
    },
    imageViewer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    closeButtonImageViewer: {
        position: 'absolute',
        top: 60,
        right: 10,
        zIndex: 10000,
        padding: 10,
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
});
