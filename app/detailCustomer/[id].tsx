import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import HeaderNav from '@/app/components/headerNav';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import DropDownPicker from 'react-native-dropdown-picker';

interface Customer {
    customer_id: string;
    customer_name: string;
    phone_number: string;
    email: string;
    address: string;
    total_orders: number;
    total_spent: number;
    created_date: string;
    last_order_date: string;
    other_info: string;
    type: string;
}

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(',', '');
};

const formatPrice = (price: string) => {
    return Number(price).toLocaleString('de-DE') + 'đ';
}

interface Order {
    order_id: string;
    created_date: string;
    total_price: number;
    status: string;
    order_detail: any;
}

interface ProductSell {
    product_id: string;
    product_name: string;
    product_price: number;
    created_date: string;
    price_current: string;
}

interface OrderStatus {
    id: number;
    label: string;
}

const orderStatuses: OrderStatus[] = [
    { id: 0, label: 'Mới tạo' },
    { id: 1, label: 'Đã thanh toán' },
    { id: 2, label: 'Đã hủy' },
    { id: 3, label: 'Đang nợ' },
];

// Add customer type

export default function DetailCustomerScreen() {
    const { id } = useLocalSearchParams();
    const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
    const [countOrderSuccess, setCountOrderSuccess] = useState<number>(0);
    const [countOrderCancel, setCountOrderCancel] = useState<number>(0);
    const [countOrderPending, setCountOrderPending] = useState<number>(0);
    const [totalSpent, setTotalSpent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState('');
    const [openCustomerType, setOpenCustomerType] = useState(false);
    const [customerProducts, setCustomerProducts] = useState<ProductSell[]>([]);

    const fetchCustomerDetails = async () => {
        try {
            const response = await fetch(`https://huelinh.com/api/get_customer_detail/${id}`);
            const data = await response.json();
            console.log(data);
            setCustomerDetails(data.customer_info);
            setCustomerOrders(data.history);
            setCountOrderSuccess(data.history.filter((order: any) => order.status === '1').length);
            setCountOrderCancel(data.history.filter((order: any) => order.status === '2').length);
            setCountOrderPending(data.history.filter((order: any) => order.status === '0').length);
            setTotalSpent(formatPrice(data.total_spent.toString()));
            setCustomerProducts(data.sell);
        } catch (error) {
            Alert.alert('Lỗi', 'Không tải được thông tin khách hàng');
        } finally {
            setIsLoading(false);
        }

    };

    useEffect(() => {
        const loadAuth = async () => {
            const role = await SecureStore.getItemAsync('role');
            const token = await SecureStore.getItemAsync('loginToken');
            const id = await SecureStore.getItemAsync('userId');
            setRole(role || '');
            setToken(token || '');
            setUserId(id || '');
        }
        loadAuth();

        fetchCustomerDetails();
    }, [id]);

    useEffect(() => {
        if (customerDetails) {
            setEditedCustomer({ ...customerDetails });
        }
    }, [customerDetails]);

    const handleSaveChanges = async () => {
        if (!editedCustomer) return;
        
        try {
            const formData = new FormData();
            formData.append('customer_name', editedCustomer.customer_name);
            formData.append('phone_number', editedCustomer.phone_number);
            formData.append('other_info', editedCustomer.other_info);
            formData.append('type', editedCustomer.type);
            formData.append('token', token);
            formData.append('user_id', userId);
            const response = await fetch(`https://huelinh.com/api/update_customer/${id}`, {
                method: 'POST',
                headers: {

                    'Content-Type': 'multipart/form-data',
                },   
                body: formData,
            });
            const data = await response.json();
            console.log(data);
            if (data.status === 'success') {
                Alert.alert('Thành công', 'Cập nhật thông tin khách hàng thành công');
                setIsModalVisible(false);
                fetchCustomerDetails();
            } else {
                Alert.alert('Lỗi', 'Không thể cập nhật thông tin khách hàng');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật thông tin khách hàng');
        }
    };


    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Đang tải thông tin khách hàng...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <HeaderNav currentScreen="Chi tiết khách hàng" />
            
            {customerDetails && (
                <View style={styles.content}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                            {role === 'admin' && (
                                <TouchableOpacity 
                                    style={styles.editButton}
                                    onPress={() => setIsModalVisible(true)}
                                >
                                    <AntDesign name="edit" size={20} color="black" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.customerInfo}>
                            <Text style={styles.customerName}>{customerDetails.customer_name}</Text>

                            <Text style={styles.customerPhone}>SĐT: {customerDetails.phone_number}</Text>
                        </View>
                        <View style={styles.infoColumn}>
                            <Text style={[styles.label, {marginBottom: 10}]}>Thông tin khác:</Text>
                            <Text style={styles.value}>{customerDetails.other_info}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thống kê mua hàng</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Tổng đơn hàng:</Text>
                            <Text style={styles.value}>{customerOrders.length}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Đơn thành công:</Text>
                            <Text style={styles.value}>{countOrderSuccess}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Đơn đang chờ:</Text>
                            <Text style={styles.value}>{countOrderPending}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Đơn hủy:</Text>
                            <Text style={styles.value}>{countOrderCancel}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Tổng chi tiêu:</Text>
                            <Text style={[styles.value, styles.totalSpent]}>
                                {totalSpent}
                            </Text>
                        </View>
                    </View>
                    {customerOrders.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Lịch sử mua hàng</Text>
                        {customerOrders.map((order) => (
                            <TouchableOpacity 
                                key={order.order_id}
                                style={styles.orderItem}
                                onPress={() => router.push({
                                    pathname: "/detailOrder/[id]",
                                    params: { id: order.order_id }
                                })}
                            >
                                <View style={styles.orderHeader}>
                                    <Text style={styles.orderId}>Đơn #{order.order_id}</Text>
                                    <Text style={[
                                        styles.orderStatus,
                                        order.status === '1' && styles.statusSuccess,
                                        order.status === '2' && styles.statusCanceled,
                                        order.status === '0' && styles.statusPending,
                                    ]}>
                                        {orderStatuses.find(status => status.id === Number(order.status))?.label || 'Không xác định'}
                                    </Text>
                                </View>
                                <View style={styles.orderDetails}>
                                    <Text style={styles.orderDate}>{formatDateTime(order.created_date)}</Text>
                                    <Text style={[styles.orderTotal, {color: order.status === '1' ? '#28A745' : order.status === '2' ? '#dc3545' : '#ffc107'}]}>{formatPrice(order.total_price.toString())}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                    )}
                    {customerProducts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sản phẩm bán</Text>
                        {customerProducts.map((product) => (
                            <TouchableOpacity 
                                key={product.product_id}
                                style={styles.orderItem}
                                onPress={() => router.push({
                                    pathname: "/detailProduct/[id]",
                                    params: { id: product.product_id }
                                })}
                            >
                                <View style={styles.orderHeader}>
                                    <Text style={styles.orderId}>{product.product_name}</Text>
                                    
                                </View>
                                <View style={styles.orderDetails}>
                                    <Text style={styles.orderDate}>{formatDateTime(product.created_date)}</Text>
                                    <Text style={styles.orderTotal}>{formatPrice(product.price_current)}</Text>
                                </View>
                            </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sửa thông tin khách hàng</Text>
                            <TouchableOpacity 
                                onPress={() => setIsModalVisible(false)}
                                style={styles.closeButton}

                            >
                                <AntDesign name="close" size={24} color="black" />
                            </TouchableOpacity>
                        </View>
                        
                        {editedCustomer && (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Name:</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editedCustomer.customer_name}
                                        onChangeText={(text) => setEditedCustomer({...editedCustomer, customer_name: text})}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Phone:</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editedCustomer.phone_number}
                                        onChangeText={(text) => setEditedCustomer({...editedCustomer, phone_number: text})}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Loại khách hàng</Text>
                                    <DropDownPicker
                                        searchable={true}
                                        searchPlaceholder="Tìm kiếm loại khách hàng..."
                                        open={openCustomerType}
                                        setOpen={setOpenCustomerType}
                                        value={editedCustomer.type || '0'}
                                        setValue={(callback) => setEditedCustomer({...editedCustomer, type: callback('')})}
                                        items={[
                                        { label: 'Mua', value: '0' },
                                        { label: 'Bán', value: '1' },
                                        { label: 'Mua & bán', value: '2' },
                                        ]}
                                        placeholder="Chọn loại khách hàng"
                                        style={styles.dropdownStyle}
                                        dropDownContainerStyle={styles.dropdownContainer}
                                        searchContainerStyle={styles.searchContainer}
                                        searchTextInputStyle={styles.searchInput}
                                        listMode="MODAL"
                                        modalProps={{
                                        animationType: "fade"
                                        }}
                                        modalContentContainerStyle={{
                                        backgroundColor: "white"
                                        }}
                                        selectedItemContainerStyle={{
                                        backgroundColor: '#e6f3ff'
                                        }}
                                        selectedItemLabelStyle={{
                                        color: '#0066cc',
                                        fontWeight: 'bold'
                                        }}
                                        tickIconStyle={{
                                        tintColor: '#0066cc'
                                        } as any}
                                    />  
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Other Info:</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={editedCustomer.other_info}
                                        onChangeText={(text) => setEditedCustomer({...editedCustomer, other_info: text})}
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleSaveChanges}
                                    >
                                        <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgb(244, 246, 249)',
    },
    content: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    section: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    customerInfo: {
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    customerName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    customerPhone: {
        fontSize: 16,
        color: '#666',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        width: 120,
    },
    value: {
        fontSize: 14,
        flex: 1,
    },
    totalSpent: {
        color: '#28A745',
        fontWeight: 'bold',
        fontSize: 16,
    },
    orderItem: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderId: {
        fontSize: 15,
        fontWeight: '600',
        color: '#495057',
    },
    orderDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderDate: {
        fontSize: 14,
        color: '#6c757d',
    },
    orderTotal: {
        fontSize: 15,
        fontWeight: '600',
        color: '#28A745',
    },
    orderStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        fontSize: 12,
        fontWeight: '500',
    },
    statusSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
    },
    statusCanceled: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
    },
    statusPending: {
        backgroundColor: '#fff3cd',
        color: '#856404',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    editButton: {
        padding: 5,
        borderRadius: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingRight: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        marginTop: 20,
    },
    modalButton: {
        padding: 12,
        borderRadius: 5,
    },
    saveButton: {
        backgroundColor: '#28a745',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        color: 'white',
    },
    closeButton: {
        padding: 5,
    },
    inputGroup: {
        marginBottom: 16,
    },
    pickerContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        marginBottom: 10,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    submitButton: {
        backgroundColor: '#28A745',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dropdownStyle: {
        backgroundColor: 'white',
        borderColor: '#DDD',
        borderWidth: 1,
        borderRadius: 8,
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderColor: '#DDD',
        borderWidth: 1,
    },
    searchContainer: {
        borderBottomColor: '#DDD',
        padding: 8,
    },
    searchInput: {
        borderColor: '#DDD',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#cccccc',
    },
    submitButtonTextDisabled: {
        color: '#666666',
    },
    customerType0: {
        color: 'rgb(0, 123, 255)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    customerType1: {
        color: 'rgb(40, 167, 69)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    customerType2: {
        color: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    customerNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    
});
